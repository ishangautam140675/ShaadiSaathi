import { type AppDatabase, getDatabase } from '../db/database.ts';
import { ReportsService, reportsService as defaultReportsService } from './reportsService.ts';

export class ExportService {
  private appDb: AppDatabase;
  private reportsService: ReportsService;

  constructor(appDb?: AppDatabase, repService?: ReportsService) {
    this.appDb = appDb || getDatabase();
    this.reportsService = repService || (appDb ? new ReportsService(appDb) : defaultReportsService);
  }

  private getDb() {
    return this.appDb.getDb();
  }

  /**
   * Escape and sanitize cell values to prevent CSV formula injection (CSV Injection / DDE)
   * Also quotes fields with commas, quotes, or newlines according to RFC 4180.
   */
  public sanitizeCsvCell(value: any): string {
    if (value === null || value === undefined) return '';

    let str = String(value);

    // Formula injection guard: if cell starts with dangerous formula triggers, prefix with single quote
    if (/^[=+\-@\t\r]/.test(str)) {
      str = `'${str}`;
    }

    // RFC 4180: if cell contains quotes, commas, or newlines, escape quotes by doubling them and enclose in quotes
    if (/[",\n\r]/.test(str)) {
      str = `"${str.replace(/"/g, '""')}"`;
    }

    return str;
  }

  /**
   * Generate RFC 4180 CSV string with UTF-8 BOM
   */
  public buildCsv(headers: string[], rows: any[][]): string {
    const BOM = '\uFEFF'; // UTF-8 Byte Order Mark for Excel compatibility
    const headerLine = headers.map((h) => this.sanitizeCsvCell(h)).join(',');
    const bodyLines = rows.map((row) => row.map((cell) => this.sanitizeCsvCell(cell)).join(','));
    return BOM + [headerLine, ...bodyLines].join('\r\n');
  }

  /**
   * Export Expenses as CSV
   */
  public exportExpensesCsv(familyId: string, filters?: { startDate?: string; endDate?: string }): string {
    const db = this.getDb();
    let sql = 'SELECT * FROM expenses WHERE family_id = ?';
    const params: any[] = [familyId];

    if (filters?.startDate && filters?.endDate) {
      sql += ' AND date >= ? AND date <= ?';
      params.push(filters.startDate, filters.endDate);
    }

    sql += ' ORDER BY date DESC';

    const expenses = db.prepare(sql).all(...params) as any[];

    const headers = [
      'Transaction ID',
      'Expense Title',
      'Category',
      'Amount (₹)',
      'Paid Amount (₹)',
      'Balance Due (₹)',
      'Date',
      'Paid By',
      'Vendor / Payee',
      'Payment Method',
      'Payment Status',
      'Notes',
      'SmartScan Linked Doc ID',
      'Recorded At',
    ];

    const rows = expenses.map((e) => {
      const amount = Number(e.amount_paise) / 100;
      const paid = Number(e.paid_amount_paise) / 100;
      const balance = Math.max(0, amount - paid);

      return [
        e.id,
        e.title,
        e.category,
        amount.toFixed(2),
        paid.toFixed(2),
        balance.toFixed(2),
        e.date,
        e.paid_by_name,
        e.vendor_name || '—',
        e.payment_method,
        e.payment_status,
        e.notes || '',
        e.source_document_id || '—',
        e.created_at,
      ];
    });

    return this.buildCsv(headers, rows);
  }

  /**
   * Export Vendors & Contracts as CSV
   */
  public exportVendorsCsv(familyId: string): string {
    const db = this.getDb();
    const vendors = db.prepare('SELECT * FROM vendors WHERE family_id = ? ORDER BY name ASC').all(familyId) as any[];

    const headers = [
      'Vendor ID',
      'Vendor Name',
      'Category',
      'Contact Person',
      'Phone Number',
      'City',
      'Contract Amount (₹)',
      'Advances Paid (₹)',
      'Balance Due (₹)',
      'Payment Due Date',
      'Booking Status',
      'Notes',
    ];

    const rows = vendors.map((v) => {
      const agreed = Number(v.agreed_amount_paise) / 100;
      const paid = Number(v.paid_amount_paise) / 100;
      const balance = Number(v.balance_due_paise) / 100;

      return [
        v.id,
        v.name,
        v.category,
        v.contact_person,
        v.phone || v.contact_phone || '',
        v.city || '',
        agreed.toFixed(2),
        paid.toFixed(2),
        balance.toFixed(2),
        v.due_date || '—',
        v.status,
        v.notes || '',
      ];
    });

    return this.buildCsv(headers, rows);
  }

  /**
   * Export Sacred Gifts & Shagun Ledger as CSV (Decoupled from Expenses)
   */
  public exportGiftsCsv(familyId: string): string {
    const db = this.getDb();
    const gifts = db.prepare('SELECT * FROM gifts_shagun WHERE family_id = ? ORDER BY date_received DESC').all(familyId) as any[];

    const headers = [
      'Blessing ID',
      'Donor / Relative Name',
      'Relationship',
      'Family Side',
      'Gift Type',
      'Cash Shagun (₹)',
      'Description / Item',
      'Date Received',
      'Notes',
    ];

    const rows = gifts.map((g) => {
      const cash = Number(g.amount_paise) / 100;
      return [
        g.id,
        g.giver_name,
        g.relation || 'Relative',
        g.side,
        g.gift_type,
        cash > 0 ? cash.toFixed(2) : '—',
        g.description || '',
        g.date_received,
        g.notes || '',
      ];
    });

    return this.buildCsv(headers, rows);
  }

  /**
   * Export Complete Portable JSON Archive (Scrubbed of credentials & sessions)
   */
  public exportCompleteArchiveJson(familyId: string): any {
    const db = this.getDb();

    // 1. Family Metadata
    const family = db.prepare(`
      SELECT id, name, bride_name, groom_name, wedding_date,
             total_budget, total_budget_paise, currency, created_at, updated_at
      FROM families WHERE id = ?
    `).get(familyId);

    // 2. Members (Strictly excluding password_hash and password_salt!)
    const members = db.prepare(`
      SELECT id, name, email, role, side, is_active, created_at
      FROM users WHERE family_id = ?
    `).all(familyId);

    // 3. Expenses
    const expenses = db.prepare('SELECT * FROM expenses WHERE family_id = ?').all(familyId);

    // 4. Vendors & Payments
    const vendors = db.prepare('SELECT * FROM vendors WHERE family_id = ?').all(familyId);
    const vendorPayments = db.prepare(`
      SELECT vp.* FROM vendor_payments vp
      JOIN vendors v ON vp.vendor_id = v.id
      WHERE v.family_id = ?
    `).all(familyId);

    // 5. Shopping Items
    const shopping = db.prepare('SELECT * FROM shopping_items WHERE family_id = ?').all(familyId);

    // 6. Sacred Gifts & Shagun
    const gifts = db.prepare('SELECT * FROM gifts_shagun WHERE family_id = ?').all(familyId);

    // 7. Checklist Tasks
    const checklist = db.prepare('SELECT * FROM checklist_tasks WHERE family_id = ?').all(familyId);

    // 8. Scan Documents Metadata (excluding physical local paths)
    const scanDocs = db.prepare(`
      SELECT id, original_filename, file_size, mime_type, ocr_status,
             ocr_engine, confidence_score, import_status, proposed_count,
             accepted_count, rejected_count, created_at
      FROM scan_documents WHERE family_id = ?
    `).all(familyId);

    // 9. Comprehensive Report Analytics Snapshot
    const reportsSnapshot = this.reportsService.getComprehensiveReport(familyId);

    return {
      archiveFormat: 'ShaadiSaathi-Wedding-Backup-V1',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      family,
      members,
      expenses,
      vendors,
      vendorPayments,
      shoppingItems: shopping,
      giftsShagun: gifts,
      checklistTasks: checklist,
      scanDocuments: scanDocs,
      reportsSnapshot,
    };
  }
}

export const exportService = new ExportService();
