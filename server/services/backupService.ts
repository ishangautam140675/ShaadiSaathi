import crypto from 'node:crypto';
import { type AppDatabase, getDatabase } from '../db/database.ts';

export interface RestoreResult {
  success: boolean;
  importedCounts: {
    expenses: number;
    vendors: number;
    shoppingItems: number;
    giftsShagun: number;
    checklistTasks: number;
  };
  skippedDuplicates: number;
  warnings: string[];
}

export class BackupService {
  private appDb: AppDatabase;

  constructor(appDb?: AppDatabase) {
    this.appDb = appDb || getDatabase();
  }

  private getDb() {
    return this.appDb.getDb();
  }

  /**
   * Validate a backup JSON archive structure before attempting restoration
   */
  public validateArchive(data: any): { isValid: boolean; error?: string } {
    if (!data || typeof data !== 'object') {
      return { isValid: false, error: 'Archive payload must be a valid JSON object.' };
    }

    if (data.archiveFormat !== 'ShaadiSaathi-Wedding-Backup-V1') {
      return {
        isValid: false,
        error: `Incompatible backup format: ${data.archiveFormat || 'Unknown'}. Expected ShaadiSaathi-Wedding-Backup-V1.`,
      };
    }

    if (!data.family || typeof data.family !== 'object' || !data.family.name) {
      return { isValid: false, error: 'Backup is missing required family wedding metadata.' };
    }

    if (data.expenses && !Array.isArray(data.expenses)) {
      return { isValid: false, error: 'Corrupted backup: expenses must be an array.' };
    }

    if (data.vendors && !Array.isArray(data.vendors)) {
      return { isValid: false, error: 'Corrupted backup: vendors must be an array.' };
    }

    return { isValid: true };
  }

  /**
   * Restore structured wedding records from a validated backup archive
   * Prevents duplicate insertions by checking existing titles/dates or re-generating collision-free IDs.
   */
  public restoreArchive(
    targetFamilyId: string,
    targetUserId: string,
    archive: any
  ): RestoreResult {
    const validation = this.validateArchive(archive);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    const db = this.getDb();
    const warnings: string[] = [];
    let skippedDuplicates = 0;

    const importedCounts = {
      expenses: 0,
      vendors: 0,
      shoppingItems: 0,
      giftsShagun: 0,
      checklistTasks: 0,
    };

    const now = new Date().toISOString();

    db.exec('BEGIN TRANSACTION');
    try {
      // 1. Restore Vendors first (so foreign keys can align if needed)
      if (Array.isArray(archive.vendors)) {
        const insertVendorStmt = db.prepare(`
          INSERT INTO vendors (
            id, family_id, name, category, contact_person, phone,
            email, city, address, agreed_amount_paise, paid_amount_paise,
            balance_due_paise, due_date, status, notes, created_by_user_id,
            updated_by_user_id, version, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
        `);

        for (const v of archive.vendors) {
          // Check for existing vendor with same name in family
          const existing = db.prepare('SELECT id FROM vendors WHERE family_id = ? AND name = ?').get(targetFamilyId, v.name);
          if (existing) {
            skippedDuplicates++;
            continue;
          }

          const vendorId = `ven-restored-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
          insertVendorStmt.run(
            vendorId,
            targetFamilyId,
            v.name,
            v.category || 'other',
            v.contact_person || v.contactPerson || 'Vendor',
            v.phone || v.contact_phone || '',
            v.email || '',
            v.city || 'Local',
            v.address || '',
            Number(v.agreed_amount_paise || (v.agreedAmount || 0) * 100),
            Number(v.paid_amount_paise || (v.advancePaid || 0) * 100),
            Number(v.balance_due_paise || (v.balanceDue || 0) * 100),
            v.due_date || v.dueDate || now.split('T')[0],
            v.status || 'booked',
            v.notes || '',
            targetUserId,
            targetUserId,
            v.created_at || now,
            now
          );
          importedCounts.vendors++;
        }
      }

      // 2. Restore Expenses
      if (Array.isArray(archive.expenses)) {
        const insertExpStmt = db.prepare(`
          INSERT INTO expenses (
            id, family_id, title, amount_paise, paid_amount_paise,
            category, date, paid_by_name, paid_by_user_id, vendor_name,
            payment_method, payment_status, notes, created_by_user_id,
            updated_by_user_id, version, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
        `);

        for (const e of archive.expenses) {
          const amountPaise = Number(e.amount_paise || (e.amount || 0) * 100);
          const existing = db.prepare(`
            SELECT id FROM expenses
            WHERE family_id = ? AND title = ? AND amount_paise = ? AND date = ?
          `).get(targetFamilyId, e.title, amountPaise, e.date);

          if (existing) {
            skippedDuplicates++;
            continue;
          }

          const expId = `exp-restored-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
          const paidPaise = Number(e.paid_amount_paise || 0);

          insertExpStmt.run(
            expId,
            targetFamilyId,
            e.title,
            amountPaise,
            paidPaise,
            e.category || 'other',
            e.date || now.split('T')[0],
            e.paid_by_name || e.paidBy || 'Family Member',
            targetUserId,
            e.vendor_name || null,
            e.payment_method || 'upi',
            e.payment_status || 'paid',
            e.notes ? `[Restored Backup] ${e.notes}` : '[Restored from Backup Archive]',
            targetUserId,
            targetUserId,
            e.created_at || now,
            now
          );
          importedCounts.expenses++;
        }
      }

      // 3. Restore Shopping Items
      if (Array.isArray(archive.shoppingItems)) {
        const insertShopStmt = db.prepare(`
          INSERT INTO shopping_items (
            id, family_id, name, category, estimated_price_paise,
            actual_price_paise, assigned_to, status, priority,
            deadline, store_name, notes, created_by_user_id,
            version, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
        `);

        for (const s of archive.shoppingItems) {
          const itemName = s.name || s.item_name || s.title || 'Shopping Item';
          const existing = db.prepare('SELECT id FROM shopping_items WHERE family_id = ? AND name = ?').get(targetFamilyId, itemName);
          if (existing) {
            skippedDuplicates++;
            continue;
          }

          const shopId = `shop-restored-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
          insertShopStmt.run(
            shopId,
            targetFamilyId,
            itemName,
            s.category || 'other',
            Number(s.estimated_price_paise || s.estimated_cost_paise || (s.estimatedCost || 0) * 100),
            Number(s.actual_price_paise || s.actual_cost_paise || (s.actualCost || 0) * 100),
            s.assigned_to || s.assigned_to_name || s.assignedTo || 'Family Member',
            s.status || 'planned',
            s.priority || 'medium',
            s.deadline || null,
            s.store_name || s.storeName || null,
            s.notes || '',
            targetUserId,
            s.created_at || now,
            now
          );
          importedCounts.shoppingItems++;
        }
      }

      // 4. Restore Sacred Gifts & Shagun
      if (Array.isArray(archive.giftsShagun)) {
        const insertGiftStmt = db.prepare(`
          INSERT INTO gifts_shagun (
            id, family_id, giver_name, relation, gift_type,
            amount_paise, description, date_received, recipient,
            side, notes, recorded_by_user_id, version, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
        `);

        for (const g of archive.giftsShagun) {
          const giverName = g.giver_name || g.donorName || 'Relative';
          const amountPaise = Number(g.amount_paise || (g.amount || g.cashAmount || 0) * 100);

          const existing = db.prepare(`
            SELECT id FROM gifts_shagun
            WHERE family_id = ? AND giver_name = ? AND amount_paise = ? AND date_received = ?
          `).get(targetFamilyId, giverName, amountPaise, g.date_received || g.date);

          if (existing) {
            skippedDuplicates++;
            continue;
          }

          const giftId = `gift-restored-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
          insertGiftStmt.run(
            giftId,
            targetFamilyId,
            giverName,
            g.relation || '',
            g.gift_type || 'cash',
            amountPaise,
            g.description || '',
            g.date_received || g.date || now.split('T')[0],
            g.recipient || 'couple',
            g.side || 'mutual',
            g.notes || '',
            targetUserId,
            g.created_at || now,
            now
          );
          importedCounts.giftsShagun++;
        }
      }

      // 5. Restore Checklist Tasks
      if (Array.isArray(archive.checklistTasks)) {
        const insertTaskStmt = db.prepare(`
          INSERT INTO checklist_tasks (
            id, family_id, title, category, phase, status,
            assigned_to, priority, due_date, notes,
            created_by_user_id, version, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
        `);

        for (const t of archive.checklistTasks) {
          const existing = db.prepare('SELECT id FROM checklist_tasks WHERE family_id = ? AND title = ?').get(targetFamilyId, t.title);
          if (existing) {
            skippedDuplicates++;
            continue;
          }

          const taskId = `task-restored-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
          insertTaskStmt.run(
            taskId,
            targetFamilyId,
            t.title,
            t.category || 'General',
            t.phase || 'wedding_week',
            t.status || 'pending',
            t.assigned_to || t.assignedTo || 'Family Member',
            t.priority || 'medium',
            t.due_date || t.dueDate || null,
            t.notes || '',
            targetUserId,
            t.created_at || now,
            now
          );
          importedCounts.checklistTasks++;
        }
      }

      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }

    return {
      success: true,
      importedCounts,
      skippedDuplicates,
      warnings,
    };
  }
}

export const backupService = new BackupService();
