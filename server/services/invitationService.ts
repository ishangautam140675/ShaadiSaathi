import { AppDatabase } from '../db/database.ts';
import { CryptoService } from './cryptoService.ts';
import type { FamilySide, UserEntity, FamilyEntity } from './authService.ts';
import crypto from 'node:crypto';

export interface InvitationEntity {
  id: string;
  family_id: string;
  invited_by_user_id: string;
  email: string;
  name: string;
  role: 'FAMILY_MEMBER' | 'VIEWER';
  side: FamilySide;
  token_hash: string;
  token_preview: string;
  expires_at: string;
  is_revoked: number;
  accepted_at: string | null;
  accepted_by_user_id: string | null;
  created_at: string;
}

export class InvitationService {
  private appDb: AppDatabase;

  constructor(appDb: AppDatabase) {
    this.appDb = appDb;
  }

  /**
   * Creates a new cryptographically secured family invitation.
   * Can only assign FAMILY_MEMBER or VIEWER (prevents role escalation to OWNER).
   */
  createInvitation(data: {
    familyId: string;
    invitedByUserId: string;
    email: string;
    name: string;
    role: 'FAMILY_MEMBER' | 'VIEWER';
    side?: FamilySide;
    expiresInDays?: number;
  }): { invitation: InvitationEntity; rawToken: string; inviteLink: string } {
    // Validate role
    if (data.role !== 'FAMILY_MEMBER' && data.role !== 'VIEWER') {
      throw new Error('ROLE_ESCALATION_DENIED: Invitations can only be issued for FAMILY_MEMBER or VIEWER.');
    }

    const cleanEmail = data.email.toLowerCase().trim();
    if (!cleanEmail.includes('@')) {
      throw new Error('VALIDATION_ERROR: Valid email address is required.');
    }

    // Check if user is already an active member of this family
    const existingUserStmt = this.appDb.db.prepare('SELECT id FROM users WHERE email = ? AND is_active = 1');
    const existingUser = existingUserStmt.get(cleanEmail);
    if (existingUser) {
      throw new Error('USER_ALREADY_EXISTS: A family member with this email is already registered.');
    }

    const rawToken = CryptoService.generateSecureToken(32);
    const tokenHash = CryptoService.hashToken(rawToken);
    const tokenPreview = CryptoService.previewToken(rawToken);
    const invitationId = `inv_${crypto.randomUUID()}`;

    const days = data.expiresInDays || 7;
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    const now = new Date().toISOString();

    const insertStmt = this.appDb.db.prepare(`
      INSERT INTO invitations (
        id, family_id, invited_by_user_id, email, name, role, side,
        token_hash, token_preview, expires_at, is_revoked, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
    `);

    insertStmt.run(
      invitationId,
      data.familyId,
      data.invitedByUserId,
      cleanEmail,
      data.name.trim(),
      data.role,
      data.side || 'mutual',
      tokenHash,
      tokenPreview,
      expiresAt,
      now
    );

    const invitation = this.getInvitationById(invitationId)!;
    const inviteLink = `/invite/${rawToken}`;

    return {
      invitation,
      rawToken,
      inviteLink,
    };
  }

  /**
   * Verifies an invitation token without consuming it.
   */
  verifyInvitationToken(rawToken: string): {
    isValid: boolean;
    reason?: 'EXPIRED' | 'REVOKED' | 'ALREADY_USED' | 'NOT_FOUND';
    invitation?: Omit<InvitationEntity, 'token_hash'>;
    family?: FamilyEntity;
  } {
    if (!rawToken || rawToken.length < 32) {
      return { isValid: false, reason: 'NOT_FOUND' };
    }

    const tokenHash = CryptoService.hashToken(rawToken);
    const stmt = this.appDb.db.prepare(`
      SELECT i.*, f.name as family_name, f.bride_name, f.groom_name, f.wedding_date
      FROM invitations i
      JOIN families f ON i.family_id = f.id
      WHERE i.token_hash = ?
    `);

    const row = stmt.get(tokenHash) as (InvitationEntity & {
      family_name: string;
      bride_name: string;
      groom_name: string;
      wedding_date: string;
    }) | undefined;

    if (!row) {
      return { isValid: false, reason: 'NOT_FOUND' };
    }

    if (row.is_revoked) {
      return { isValid: false, reason: 'REVOKED' };
    }

    if (row.accepted_at) {
      return { isValid: false, reason: 'ALREADY_USED' };
    }

    if (new Date(row.expires_at).getTime() < Date.now()) {
      return { isValid: false, reason: 'EXPIRED' };
    }

    const familyStmt = this.appDb.db.prepare('SELECT * FROM families WHERE id = ?');
    const family = familyStmt.get(row.family_id) as unknown as FamilyEntity;

    const { token_hash: _tokenHash, ...safeInvitation } = row;

    return {
      isValid: true,
      invitation: safeInvitation,
      family,
    };
  }

  /**
   * Consumes an invitation and registers the invited family member.
   * Strictly enforces the role specified in the invitation (deny role escalation).
   */
  acceptInvitation(data: {
    rawToken: string;
    name: string;
    password: string;
    userAgent?: string;
    ipAddress?: string;
  }): {
    user: Omit<UserEntity, 'password_hash' | 'password_salt'>;
    family: FamilyEntity;
    sessionToken: string;
    expiresAt: string;
  } {
    const verification = this.verifyInvitationToken(data.rawToken);
    if (!verification.isValid || !verification.invitation || !verification.family) {
      throw new Error(`INVITATION_INVALID: Invitation cannot be accepted (${verification.reason}).`);
    }

    if (!data.password || data.password.length < 8) {
      throw new Error('VALIDATION_ERROR: Password must be at least 8 characters long.');
    }

    const invitation = verification.invitation;
    const userId = `usr_${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    const { hash, salt } = CryptoService.hashPassword(data.password);

    // Transactional acceptance: Insert user and update invitation
    const insertUser = this.appDb.db.prepare(`
      INSERT INTO users (id, family_id, name, email, password_hash, password_salt, role, side, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `);

    insertUser.run(
      userId,
      invitation.family_id,
      data.name.trim() || invitation.name,
      invitation.email,
      hash,
      salt,
      invitation.role, // strictly role-bound from invitation
      invitation.side,
      now,
      now
    );

    const markAccepted = this.appDb.db.prepare(`
      UPDATE invitations
      SET accepted_at = ?, accepted_by_user_id = ?
      WHERE id = ?
    `);

    markAccepted.run(now, userId, invitation.id);

    // Issue initial session token for seamless onboarding
    const sessionToken = CryptoService.generateSecureToken();
    const tokenHash = CryptoService.hashToken(sessionToken);
    const sessionId = `sess_${crypto.randomUUID()}`;
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const insertSession = this.appDb.db.prepare(`
      INSERT INTO sessions (id, user_id, family_id, token_hash, user_agent, ip_address, expires_at, created_at, last_active_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertSession.run(
      sessionId,
      userId,
      invitation.family_id,
      tokenHash,
      data.userAgent || null,
      data.ipAddress || null,
      expiresAt,
      now,
      now
    );

    const userStmt = this.appDb.db.prepare('SELECT * FROM users WHERE id = ?');
    const newUser = userStmt.get(userId) as unknown as UserEntity;
    const { password_hash: _hash, password_salt: _salt, ...safeUser } = newUser;

    return {
      user: safeUser,
      family: verification.family,
      sessionToken,
      expiresAt,
    };
  }

  /**
   * Revokes an existing pending invitation.
   */
  revokeInvitation(invitationId: string, familyId: string): boolean {
    const stmt = this.appDb.db.prepare(`
      UPDATE invitations
      SET is_revoked = 1
      WHERE id = ? AND family_id = ? AND accepted_at IS NULL
    `);
    stmt.run(invitationId, familyId);
    return true;
  }

  /**
   * Lists all invitations for a family.
   */
  listInvitations(familyId: string): Array<Omit<InvitationEntity, 'token_hash'>> {
    const stmt = this.appDb.db.prepare(`
      SELECT id, family_id, invited_by_user_id, email, name, role, side,
             token_preview, expires_at, is_revoked, accepted_at, accepted_by_user_id, created_at
      FROM invitations
      WHERE family_id = ?
      ORDER BY created_at DESC
    `);
    return stmt.all(familyId) as Array<Omit<InvitationEntity, 'token_hash'>>;
  }

  public getInvitationById(id: string): InvitationEntity | undefined {
    const stmt = this.appDb.db.prepare('SELECT * FROM invitations WHERE id = ?');
    return stmt.get(id) as InvitationEntity | undefined;
  }
}
