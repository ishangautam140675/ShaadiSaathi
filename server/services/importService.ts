import crypto from 'node:crypto';
import { type AppDatabase, getDatabase } from '../db/database.ts';
import { DocumentService, documentService as defaultDocService } from './documentService.ts';

export interface ConfirmedExpenseRowInput {
  title: string;
  amount: number; // in rupees
  category: string;
  date: string;
  paidByName?: string;
  vendorName?: string;
  paymentMethod?: string;
  paymentStatus?: 'paid' | 'partially_paid' | 'pending';
  notes?: string;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  matchedExpenseId?: string;
  matchedTitle?: string;
  reason?: string;
}

export class ImportService {
  private appDb: AppDatabase;
  private documentService: DocumentService;

  constructor(appDb?: AppDatabase, docService?: DocumentService) {
    this.appDb = appDb || getDatabase();
    this.documentService = docService || (appDb ? new DocumentService(appDb) : defaultDocService);
  }

  private getDb() {
    return this.appDb.getDb();
  }

  /**
   * Check whether proposed rows match existing database expenses
   */
  public checkDuplicates(
    familyId: string,
    rows: Array<{ title: string; amount: number; date: string }>
  ): DuplicateCheckResult[] {
    const db = this.getDb();
    const results: DuplicateCheckResult[] = [];

    const stmt = db.prepare(`
      SELECT id, title, amount_paise, date
      FROM expenses
      WHERE family_id = ? AND amount_paise = ? AND date = ?
      LIMIT 1
    `);

    for (const row of rows) {
      const amountPaise = Math.round(row.amount * 100);
      const match = stmt.get(familyId, amountPaise, row.date) as any;

      if (match) {
        results.push({
          isDuplicate: true,
          matchedExpenseId: match.id,
          matchedTitle: match.title,
          reason: `Exact amount (₹${row.amount}) and date (${row.date}) match existing expense "${match.title}"`,
        });
      } else {
        results.push({ isDuplicate: false });
      }
    }

    return results;
  }

  /**
   * Transactionally import reviewed rows into real wedding expenses
   */
  public importConfirmedRows(
    familyId: string,
    userId: string,
    userName: string,
    documentId: string,
    rows: ConfirmedExpenseRowInput[]
  ): any[] {
    const db = this.getDb();
    const doc = this.documentService.getDocumentById(familyId, documentId);
    if (!doc) {
      throw new Error(`Document #${documentId} not found in this family.`);
    }

    if (rows.length === 0) {
      throw new Error('At least one confirmed expense row is required for import.');
    }

    const VALID_CATEGORIES = [
      'venue', 'catering', 'decoration', 'clothing', 'jewellery',
      'photography', 'invitations', 'makeup', 'transport', 'gifts', 'other'
    ];

    const createdExpenses: any[] = [];
    const now = new Date().toISOString();

    const insertExpenseStmt = db.prepare(`
      INSERT INTO expenses (
        id, family_id, title, amount_paise, paid_amount_paise,
        category, date, paid_by_name, paid_by_user_id, vendor_name,
        source_document_id, payment_method, payment_status, notes,
        created_by_user_id, version, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `);

    const insertAuditStmt = db.prepare(`
      INSERT INTO expense_audit_logs (
        id, family_id, expense_id, action, changed_by_user_id,
        new_values, created_at
      ) VALUES (?, ?, ?, 'CREATE', ?, ?, ?)
    `);

    db.exec('BEGIN TRANSACTION');
    try {
      for (const row of rows) {
        if (!row.title || row.title.trim().length === 0) {
          throw new Error('Expense title is required.');
        }

        const amount = Number(row.amount);
        if (isNaN(amount) || amount <= 0) {
          throw new Error(`Invalid monetary amount: ${row.amount}. Must be positive number.`);
        }

        const category = VALID_CATEGORIES.includes(row.category) ? row.category : 'other';
        const date = row.date || now.split('T')[0];
        const paidByName = row.paidByName || userName || 'Family Member';
        const vendorName = row.vendorName || null;
        const paymentMethod = row.paymentMethod || 'upi';
        const paymentStatus = row.paymentStatus || 'paid';
        const amountPaise = Math.round(amount * 100);
        const paidPaise = paymentStatus === 'paid' ? amountPaise : 0;
        const expenseId = `exp-scan-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

        insertExpenseStmt.run(
          expenseId,
          familyId,
          row.title.trim(),
          amountPaise,
          paidPaise,
          category,
          date,
          paidByName,
          userId,
          vendorName,
          documentId,
          paymentMethod,
          paymentStatus,
          row.notes || `Imported from SmartScan (${doc.originalFilename})`,
          userId,
          now,
          now
        );

        insertAuditStmt.run(
          `audit-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
          familyId,
          expenseId,
          userId,
          JSON.stringify({
            title: row.title,
            amountPaise,
            sourceDocumentId: documentId,
            importedBy: userName,
          }),
          now
        );

        createdExpenses.push({
          id: expenseId,
          familyId,
          title: row.title.trim(),
          amount,
          amountPaise,
          paidAmount: paymentStatus === 'paid' ? amount : 0,
          paidAmountPaise: paidPaise,
          outstandingBalance: paymentStatus === 'paid' ? 0 : amount,
          outstandingBalancePaise: paymentStatus === 'paid' ? 0 : amountPaise,
          category,
          date,
          paidByName,
          vendorName,
          sourceDocumentId: documentId,
          paymentMethod,
          paymentStatus,
          version: 1,
          createdAt: now,
        });
      }

      // Update document import status
      this.documentService.updateDocumentImportStatus(documentId, {
        importStatus: 'imported',
        acceptedCount: rows.length,
        rejectedCount: Math.max(0, doc.proposedCount - rows.length),
      });

      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }

    return createdExpenses;
  }
}

export const importService = new ImportService();
