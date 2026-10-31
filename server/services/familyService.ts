import { AppDatabase } from '../db/database.ts';
import type { UserRole, UserEntity } from './authService.ts';

export class FamilyService {
  private appDb: AppDatabase;

  constructor(appDb: AppDatabase) {
    this.appDb = appDb;
  }

  /**
   * Lists all active family members for a specific family.
   */
  listMembers(familyId: string): Array<Omit<UserEntity, 'password_hash' | 'password_salt'>> {
    const stmt = this.appDb.db.prepare(`
      SELECT id, family_id, name, email, role, side, is_active, created_at, updated_at
      FROM users
      WHERE family_id = ? AND is_active = 1
      ORDER BY role = 'OWNER' DESC, created_at ASC
    `);
    return stmt.all(familyId) as Array<Omit<UserEntity, 'password_hash' | 'password_salt'>>;
  }

  /**
   * Updates a member's role within the family.
   * Prevents removing or demoting the last active OWNER.
   */
  updateMemberRole(familyId: string, targetUserId: string, newRole: UserRole): boolean {
    if (newRole !== 'OWNER' && newRole !== 'FAMILY_MEMBER' && newRole !== 'VIEWER') {
      throw new Error('INVALID_ROLE: Role must be OWNER, FAMILY_MEMBER, or VIEWER.');
    }

    const userStmt = this.appDb.db.prepare('SELECT * FROM users WHERE id = ? AND family_id = ?');
    const user = userStmt.get(targetUserId, familyId) as UserEntity | undefined;
    if (!user) {
      throw new Error('MEMBER_NOT_FOUND: Member does not exist in this family.');
    }

    // Guard: Demoting the last OWNER
    if (user.role === 'OWNER' && newRole !== 'OWNER') {
      const ownerCountStmt = this.appDb.db.prepare(`
        SELECT COUNT(*) as count FROM users WHERE family_id = ? AND role = 'OWNER' AND is_active = 1
      `);
      const countResult = ownerCountStmt.get(familyId) as { count: number };
      if (countResult.count <= 1) {
        throw new Error('CANNOT_DEMOTE_LAST_OWNER: Every family must have at least one active OWNER.');
      }
    }

    const updateStmt = this.appDb.db.prepare(`
      UPDATE users SET role = ?, updated_at = ? WHERE id = ? AND family_id = ?
    `);
    updateStmt.run(newRole, new Date().toISOString(), targetUserId, familyId);
    return true;
  }

  /**
   * Deactivates a member and revokes all of their active sessions.
   * Prevents removing the last active OWNER.
   */
  removeMember(familyId: string, targetUserId: string): boolean {
    const userStmt = this.appDb.db.prepare('SELECT * FROM users WHERE id = ? AND family_id = ?');
    const user = userStmt.get(targetUserId, familyId) as UserEntity | undefined;
    if (!user) {
      throw new Error('MEMBER_NOT_FOUND: Member does not exist in this family.');
    }

    if (user.role === 'OWNER') {
      const ownerCountStmt = this.appDb.db.prepare(`
        SELECT COUNT(*) as count FROM users WHERE family_id = ? AND role = 'OWNER' AND is_active = 1
      `);
      const countResult = ownerCountStmt.get(familyId) as { count: number };
      if (countResult.count <= 1) {
        throw new Error('CANNOT_REMOVE_LAST_OWNER: The last remaining OWNER cannot be removed.');
      }
    }

    // Deactivate user
    const deactivateStmt = this.appDb.db.prepare(`
      UPDATE users SET is_active = 0, updated_at = ? WHERE id = ? AND family_id = ?
    `);
    deactivateStmt.run(new Date().toISOString(), targetUserId, familyId);

    // Invalidate all active sessions for this user across all devices
    const deleteSessions = this.appDb.db.prepare('DELETE FROM sessions WHERE user_id = ?');
    deleteSessions.run(targetUserId);

    return true;
  }
}
