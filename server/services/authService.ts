import { AppDatabase } from '../db/database.ts';
import { CryptoService } from './cryptoService.ts';
import crypto from 'node:crypto';

export type UserRole = 'OWNER' | 'FAMILY_MEMBER' | 'VIEWER';
export type FamilySide = 'bride' | 'groom' | 'mutual';

export interface UserEntity {
  id: string;
  family_id: string;
  name: string;
  email: string;
  password_hash: string;
  password_salt: string;
  role: UserRole;
  side: FamilySide;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface FamilyEntity {
  id: string;
  name: string;
  bride_name: string;
  groom_name: string;
  wedding_date: string;
  total_budget: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface SessionEntity {
  id: string;
  user_id: string;
  family_id: string;
  token_hash: string;
  user_agent: string | null;
  ip_address: string | null;
  expires_at: string;
  created_at: string;
  last_active_at: string;
}

export class AuthService {
  private appDb: AppDatabase;

  constructor(appDb: AppDatabase) {
    this.appDb = appDb;
  }

  /**
   * Checks whether the system has been initialized with at least one family and owner.
   */
  isSetupRequired(): boolean {
    const stmt = this.appDb.db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'OWNER'");
    const result = stmt.get() as { count: number };
    return result.count === 0;
  }

  /**
   * Initializes the first family and owner administrator.
   * Throws if an owner or family already exists (prevents unauthorized replay).
   */
  initializeFirstAdmin(data: {
    familyName: string;
    brideName: string;
    groomName: string;
    weddingDate: string;
    totalBudget?: number;
    adminName: string;
    adminEmail: string;
    adminPassword: string;
    adminSide?: FamilySide;
  }): { user: Omit<UserEntity, 'password_hash' | 'password_salt'>; family: FamilyEntity; token: string } {
    if (!this.isSetupRequired()) {
      throw new Error('SETUP_ALREADY_COMPLETED: First administrator has already been established.');
    }

    if (!data.adminEmail || !data.adminPassword || data.adminPassword.length < 8) {
      throw new Error('VALIDATION_ERROR: Valid email and password of at least 8 characters required.');
    }

    const familyId = `fam_${crypto.randomUUID()}`;
    const userId = `usr_${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    const { hash, salt } = CryptoService.hashPassword(data.adminPassword);

    const totalBudget = data.totalBudget || 2500000;
    const totalBudgetPaise = Math.round(totalBudget * 100);

    // Insert Family
    const insertFamily = this.appDb.db.prepare(`
      INSERT INTO families (id, name, bride_name, groom_name, wedding_date, total_budget, total_budget_paise, currency, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertFamily.run(
      familyId,
      data.familyName.trim(),
      data.brideName.trim(),
      data.groomName.trim(),
      data.weddingDate,
      totalBudget,
      totalBudgetPaise,
      'INR',
      now,
      now
    );

    // Insert Owner User
    const insertUser = this.appDb.db.prepare(`
      INSERT INTO users (id, family_id, name, email, password_hash, password_salt, role, side, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'OWNER', ?, 1, ?, ?)
    `);

    insertUser.run(
      userId,
      familyId,
      data.adminName.trim(),
      data.adminEmail.toLowerCase().trim(),
      hash,
      salt,
      data.adminSide || 'mutual',
      now,
      now
    );

    // Create First Session
    const token = CryptoService.generateSecureToken();
    const tokenHash = CryptoService.hashToken(token);
    const sessionId = `sess_${crypto.randomUUID()}`;
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days

    const insertSession = this.appDb.db.prepare(`
      INSERT INTO sessions (id, user_id, family_id, token_hash, user_agent, ip_address, expires_at, created_at, last_active_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertSession.run(
      sessionId,
      userId,
      familyId,
      tokenHash,
      'Initial Setup Client',
      null,
      expiresAt,
      now,
      now
    );

    const family = this.getFamilyById(familyId)!;
    const user = this.getUserById(userId)!;

    return {
      user: this.sanitizeUser(user),
      family,
      token,
    };
  }

  /**
   * Authenticates user credentials and issues an isolated device session.
   */
  signIn(
    email: string,
    password: string,
    userAgent?: string,
    ipAddress?: string
  ): { user: Omit<UserEntity, 'password_hash' | 'password_salt'>; family: FamilyEntity; token: string; expiresAt: string } {
    const cleanEmail = email.toLowerCase().trim();

    const stmt = this.appDb.db.prepare('SELECT * FROM users WHERE email = ?');
    const user = stmt.get(cleanEmail) as UserEntity | undefined;

    if (!user) {
      // Intentionally generic error message to prevent user enumeration
      throw new Error('INVALID_CREDENTIALS: Incorrect email or password.');
    }

    if (!user.is_active) {
      throw new Error('ACCOUNT_INACTIVE: This account has been deactivated by a family administrator.');
    }

    const isValid = CryptoService.verifyPassword(password, user.password_hash, user.password_salt);
    if (!isValid) {
      throw new Error('INVALID_CREDENTIALS: Incorrect email or password.');
    }

    // Issue isolated session
    const token = CryptoService.generateSecureToken();
    const tokenHash = CryptoService.hashToken(token);
    const sessionId = `sess_${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const insertSession = this.appDb.db.prepare(`
      INSERT INTO sessions (id, user_id, family_id, token_hash, user_agent, ip_address, expires_at, created_at, last_active_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertSession.run(
      sessionId,
      user.id,
      user.family_id,
      tokenHash,
      userAgent || null,
      ipAddress || null,
      expiresAt,
      now,
      now
    );

    const family = this.getFamilyById(user.family_id)!;

    return {
      user: this.sanitizeUser(user),
      family,
      token,
      expiresAt,
    };
  }

  /**
   * Validates an active session token and updates the last active timestamp.
   */
  validateSession(token: string): {
    user: Omit<UserEntity, 'password_hash' | 'password_salt'>;
    family: FamilyEntity;
    session: SessionEntity;
  } | null {
    if (!token) return null;

    const tokenHash = CryptoService.hashToken(token);
    const stmt = this.appDb.db.prepare(`
      SELECT s.*, u.is_active
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token_hash = ?
    `);

    const row = stmt.get(tokenHash) as (SessionEntity & { is_active: number }) | undefined;
    if (!row) {
      return null;
    }

    // Check expiry
    if (new Date(row.expires_at).getTime() < Date.now()) {
      this.signOut(token);
      return null;
    }

    // Check user active status
    if (!row.is_active) {
      this.signOut(token);
      return null;
    }

    // Update last_active_at
    const updateStmt = this.appDb.db.prepare(`
      UPDATE sessions SET last_active_at = ? WHERE id = ?
    `);
    updateStmt.run(new Date().toISOString(), row.id);

    const user = this.getUserById(row.user_id);
    const family = this.getFamilyById(row.family_id);

    if (!user || !family) {
      return null;
    }

    return {
      user: this.sanitizeUser(user),
      family,
      session: row,
    };
  }

  /**
   * Invalidates a single device session.
   */
  signOut(token: string): boolean {
    const tokenHash = CryptoService.hashToken(token);
    const stmt = this.appDb.db.prepare('DELETE FROM sessions WHERE token_hash = ?');
    stmt.run(tokenHash);
    return true;
  }

  /**
   * Revokes all sessions belonging to a specific user (e.g. upon removal).
   */
  revokeAllUserSessions(userId: string): void {
    const stmt = this.appDb.db.prepare('DELETE FROM sessions WHERE user_id = ?');
    stmt.run(userId);
  }

  public getUserById(id: string): UserEntity | undefined {
    const stmt = this.appDb.db.prepare('SELECT * FROM users WHERE id = ?');
    return stmt.get(id) as UserEntity | undefined;
  }

  public getFamilyById(id: string): FamilyEntity | undefined {
    const stmt = this.appDb.db.prepare('SELECT * FROM families WHERE id = ?');
    return stmt.get(id) as FamilyEntity | undefined;
  }

  public sanitizeUser(user: UserEntity): Omit<UserEntity, 'password_hash' | 'password_salt'> {
    const { password_hash: _hash, password_salt: _salt, ...safe } = user;
    return safe;
  }
}
