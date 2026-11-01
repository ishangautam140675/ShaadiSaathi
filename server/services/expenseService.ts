import { AppDatabase } from '../db/database.ts';
import crypto from 'node:crypto';

export type ExpenseCategory =
  | 'venue'
  | 'catering'
  | 'decoration'
  | 'clothing'
  | 'jewellery'
  | 'photography'
  | 'invitations'
  | 'makeup'
  | 'transport'
  | 'gifts'
  | 'other';

export type PaymentMethod = 'cash' | 'upi' | 'card' | 'bank_transfer' | 'other';
export type PaymentStatus = 'paid' | 'partially_paid' | 'pending';

export const VALID_CATEGORIES: ExpenseCategory[] = [
  'venue',
  'catering',
  'decoration',
  'clothing',
  'jewellery',
  'photography',
  'invitations',
  'makeup',
  'transport',
  'gifts',
  'other',
];

export const VALID_PAYMENT_METHODS: PaymentMethod[] = [
  'cash',
  'upi',
  'card',
  'bank_transfer',
  'other',
];

export const VALID_PAYMENT_STATUSES: PaymentStatus[] = [
  'paid',
  'partially_paid',
  'pending',
];

export interface ExpenseRow {
  id: string;
  family_id: string;
  title: string;
  amount_paise: number;
  paid_amount_paise: number;
  category: ExpenseCategory;
  date: string;
  paid_by_name: string;
  paid_by_user_id: string | null;
  vendor_name: string | null;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  notes: string | null;
  source_document_id?: string | null;
  created_by_user_id: string;
  updated_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExpenseEntityOutput {
  id: string;
  familyId: string;
  title: string;
  amount: number;
  amountPaise: number;
  paidAmount: number;
  paidAmountPaise: number;
  outstandingBalance: number;
  outstandingBalancePaise: number;
  category: ExpenseCategory;
  date: string;
  paidByName: string;
  paidByUserId: string | null;
  vendorName: string | null;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  notes: string | null;
  sourceDocumentId?: string | null;
  createdByUserId: string;
  updatedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseFilters {
  search?: string;
  category?: ExpenseCategory;
  paymentStatus?: PaymentStatus;
  startDate?: string;
  endDate?: string;
  paidByName?: string;
  sortBy?: 'date' | 'amount' | 'created_at';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface ExpenseListResult {
  expenses: ExpenseEntityOutput[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CategorySummary {
  category: ExpenseCategory;
  totalAmount: number;
  totalAmountPaise: number;
  totalPaid: number;
  totalPaidPaise: number;
  totalOutstanding: number;
  totalOutstandingPaise: number;
  count: number;
  percentageOfTotal: number;
}

export interface FinancialSummary {
  totalBudget: number;
  totalBudgetPaise: number;
  totalCommitted: number;
  totalCommittedPaise: number;
  totalPaid: number;
  totalPaidPaise: number;
  totalOutstanding: number;
  totalOutstandingPaise: number;
  remainingBudget: number;
  remainingBudgetPaise: number;
  cashRemaining: number;
  cashRemainingPaise: number;
  budgetUtilizationPercentage: number;
  totalExpenseCount: number;
  categoryBreakdown: CategorySummary[];
  recentExpenses: ExpenseEntityOutput[];
}

export class ExpenseService {
  private appDb: AppDatabase;

  constructor(appDb: AppDatabase) {
    this.appDb = appDb;
  }

  private mapRowToOutput(row: ExpenseRow): ExpenseEntityOutput {
    const outstandingPaise = row.amount_paise - row.paid_amount_paise;
    return {
      id: row.id,
      familyId: row.family_id,
      title: row.title,
      amount: row.amount_paise / 100,
      amountPaise: row.amount_paise,
      paidAmount: row.paid_amount_paise / 100,
      paidAmountPaise: row.paid_amount_paise,
      outstandingBalance: outstandingPaise / 100,
      outstandingBalancePaise: outstandingPaise,
      category: row.category,
      date: row.date,
      paidByName: row.paid_by_name,
      paidByUserId: row.paid_by_user_id,
      vendorName: row.vendor_name,
      paymentMethod: row.payment_method,
      paymentStatus: row.payment_status,
      notes: row.notes,
      sourceDocumentId: row.source_document_id || null,
      createdByUserId: row.created_by_user_id,
      updatedByUserId: row.updated_by_user_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private validateExpenseInput(data: {
    title: string;
    amount: number;
    paidAmount?: number;
    category: string;
    date: string;
    paidByName: string;
    paymentMethod: string;
    paymentStatus?: string;
  }): {
    amountPaise: number;
    paidAmountPaise: number;
    category: ExpenseCategory;
    paymentMethod: PaymentMethod;
    paymentStatus: PaymentStatus;
  } {
    if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
      throw new Error('VALIDATION_ERROR: Expense title is required.');
    }

    if (typeof data.amount !== 'number' || isNaN(data.amount) || !isFinite(data.amount) || data.amount <= 0) {
      throw new Error('VALIDATION_ERROR: Amount must be a positive number greater than zero.');
    }

    if (data.amount > 500000000) {
      throw new Error('VALIDATION_ERROR: Amount exceeds maximum single transaction limit of ₹50 Crores.');
    }

    const amountPaise = Math.round(data.amount * 100);

    let paidAmountPaise = 0;
    if (data.paidAmount !== undefined && data.paidAmount !== null) {
      if (typeof data.paidAmount !== 'number' || isNaN(data.paidAmount) || !isFinite(data.paidAmount) || data.paidAmount < 0) {
        throw new Error('VALIDATION_ERROR: Paid amount cannot be negative.');
      }
      paidAmountPaise = Math.round(data.paidAmount * 100);
      if (paidAmountPaise > amountPaise) {
        throw new Error('VALIDATION_ERROR: Paid amount cannot exceed total expense amount.');
      }
    }

    if (!VALID_CATEGORIES.includes(data.category as ExpenseCategory)) {
      throw new Error(`VALIDATION_ERROR: Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`);
    }

    if (!VALID_PAYMENT_METHODS.includes(data.paymentMethod as PaymentMethod)) {
      throw new Error(`VALIDATION_ERROR: Invalid payment method. Must be one of: ${VALID_PAYMENT_METHODS.join(', ')}`);
    }

    if (!data.date || !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
      throw new Error('VALIDATION_ERROR: Date must be in YYYY-MM-DD format.');
    }

    const parsedDate = new Date(data.date);
    if (isNaN(parsedDate.getTime())) {
      throw new Error('VALIDATION_ERROR: Invalid calendar date.');
    }

    if (!data.paidByName || typeof data.paidByName !== 'string' || data.paidByName.trim().length === 0) {
      throw new Error('VALIDATION_ERROR: Person who paid (Payer name) is required.');
    }

    // Determine authoritative payment status based on paid amount
    let paymentStatus: PaymentStatus;
    if (paidAmountPaise === amountPaise) {
      paymentStatus = 'paid';
    } else if (paidAmountPaise > 0) {
      paymentStatus = 'partially_paid';
    } else {
      paymentStatus = 'pending';
    }

    // If client explicitly indicated status = 'paid' but didn't pass paidAmount, default paidAmount to full
    if (data.paymentStatus === 'paid' && data.paidAmount === undefined) {
      paidAmountPaise = amountPaise;
      paymentStatus = 'paid';
    }

    return {
      amountPaise,
      paidAmountPaise,
      category: data.category as ExpenseCategory,
      paymentMethod: data.paymentMethod as PaymentMethod,
      paymentStatus,
    };
  }

  createExpense(
    familyId: string,
    userId: string,
    data: {
      title: string;
      amount: number;
      paidAmount?: number;
      category: string;
      date: string;
      paidByName: string;
      paidByUserId?: string | null;
      vendorName?: string | null;
      paymentMethod: string;
      paymentStatus?: string;
      notes?: string | null;
    }
  ): ExpenseEntityOutput {
    const validated = this.validateExpenseInput(data);
    const id = `exp_${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    const stmt = this.appDb.db.prepare(`
      INSERT INTO expenses (
        id, family_id, title, amount_paise, paid_amount_paise,
        category, date, paid_by_name, paid_by_user_id, vendor_name,
        payment_method, payment_status, notes,
        created_by_user_id, updated_by_user_id, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      familyId,
      data.title.trim(),
      validated.amountPaise,
      validated.paidAmountPaise,
      validated.category,
      data.date,
      data.paidByName.trim(),
      data.paidByUserId || null,
      data.vendorName ? data.vendorName.trim() : null,
      validated.paymentMethod,
      validated.paymentStatus,
      data.notes ? data.notes.trim() : null,
      userId,
      userId,
      now,
      now
    );

    // Audit log
    const auditStmt = this.appDb.db.prepare(`
      INSERT INTO expense_audit_logs (id, family_id, expense_id, action, changed_by_user_id, previous_values, new_values, created_at)
      VALUES (?, ?, ?, 'CREATE', ?, NULL, ?, ?)
    `);
    auditStmt.run(
      `aud_${crypto.randomUUID()}`,
      familyId,
      id,
      userId,
      JSON.stringify(validated),
      now
    );

    return this.getExpenseById(familyId, id);
  }

  getExpenseById(familyId: string, expenseId: string): ExpenseEntityOutput {
    const stmt = this.appDb.db.prepare(`
      SELECT * FROM expenses
      WHERE id = ? AND family_id = ?
    `);

    const row = stmt.get(expenseId, familyId) as ExpenseRow | undefined;
    if (!row) {
      throw new Error('EXPENSE_NOT_FOUND: Expense record not found.');
    }

    return this.mapRowToOutput(row);
  }

  updateExpense(
    familyId: string,
    userId: string,
    expenseId: string,
    data: {
      title: string;
      amount: number;
      paidAmount?: number;
      category: string;
      date: string;
      paidByName: string;
      paidByUserId?: string | null;
      vendorName?: string | null;
      paymentMethod: string;
      paymentStatus?: string;
      notes?: string | null;
    }
  ): ExpenseEntityOutput {
    // Check existing
    const existing = this.getExpenseById(familyId, expenseId);
    const validated = this.validateExpenseInput(data);
    const now = new Date().toISOString();

    const stmt = this.appDb.db.prepare(`
      UPDATE expenses
      SET title = ?,
          amount_paise = ?,
          paid_amount_paise = ?,
          category = ?,
          date = ?,
          paid_by_name = ?,
          paid_by_user_id = ?,
          vendor_name = ?,
          payment_method = ?,
          payment_status = ?,
          notes = ?,
          updated_by_user_id = ?,
          updated_at = ?
      WHERE id = ? AND family_id = ?
    `);

    stmt.run(
      data.title.trim(),
      validated.amountPaise,
      validated.paidAmountPaise,
      validated.category,
      data.date,
      data.paidByName.trim(),
      data.paidByUserId || null,
      data.vendorName ? data.vendorName.trim() : null,
      validated.paymentMethod,
      validated.paymentStatus,
      data.notes ? data.notes.trim() : null,
      userId,
      now,
      expenseId,
      familyId
    );

    // Audit log
    const auditStmt = this.appDb.db.prepare(`
      INSERT INTO expense_audit_logs (id, family_id, expense_id, action, changed_by_user_id, previous_values, new_values, created_at)
      VALUES (?, ?, ?, 'UPDATE', ?, ?, ?, ?)
    `);
    auditStmt.run(
      `aud_${crypto.randomUUID()}`,
      familyId,
      expenseId,
      userId,
      JSON.stringify(existing),
      JSON.stringify(validated),
      now
    );

    return this.getExpenseById(familyId, expenseId);
  }

  deleteExpense(familyId: string, userId: string, expenseId: string): boolean {
    const existing = this.getExpenseById(familyId, expenseId);
    const now = new Date().toISOString();

    const auditStmt = this.appDb.db.prepare(`
      INSERT INTO expense_audit_logs (id, family_id, expense_id, action, changed_by_user_id, previous_values, new_values, created_at)
      VALUES (?, ?, ?, 'DELETE', ?, ?, NULL, ?)
    `);
    auditStmt.run(
      `aud_${crypto.randomUUID()}`,
      familyId,
      expenseId,
      userId,
      JSON.stringify(existing),
      now
    );

    const stmt = this.appDb.db.prepare('DELETE FROM expenses WHERE id = ? AND family_id = ?');
    const result = stmt.run(expenseId, familyId);
    return result.changes > 0;
  }

  listExpenses(familyId: string, filters: ExpenseFilters = {}): ExpenseListResult {
    const conditions: string[] = ['family_id = ?'];
    const params: any[] = [familyId];

    if (filters.search && filters.search.trim().length > 0) {
      conditions.push('(LOWER(title) LIKE ? OR LOWER(vendor_name) LIKE ?)');
      const searchWildcard = `%${filters.search.toLowerCase().trim()}%`;
      params.push(searchWildcard, searchWildcard);
    }

    if (filters.category && VALID_CATEGORIES.includes(filters.category)) {
      conditions.push('category = ?');
      params.push(filters.category);
    }

    if (filters.paymentStatus && VALID_PAYMENT_STATUSES.includes(filters.paymentStatus)) {
      conditions.push('payment_status = ?');
      params.push(filters.paymentStatus);
    }

    if (filters.startDate && /^\d{4}-\d{2}-\d{2}$/.test(filters.startDate)) {
      conditions.push('date >= ?');
      params.push(filters.startDate);
    }

    if (filters.endDate && /^\d{4}-\d{2}-\d{2}$/.test(filters.endDate)) {
      conditions.push('date <= ?');
      params.push(filters.endDate);
    }

    if (filters.paidByName && filters.paidByName.trim().length > 0) {
      conditions.push('LOWER(paid_by_name) LIKE ?');
      params.push(`%${filters.paidByName.toLowerCase().trim()}%`);
    }

    const whereClause = conditions.join(' AND ');

    // Count query
    const countStmt = this.appDb.db.prepare(`SELECT COUNT(*) as total FROM expenses WHERE ${whereClause}`);
    const countResult = countStmt.get(...params) as { total: number };
    const totalCount = countResult.total;

    // Sort order
    let sortColumn = 'date';
    if (filters.sortBy === 'amount') sortColumn = 'amount_paise';
    else if (filters.sortBy === 'created_at') sortColumn = 'created_at';

    const sortDir = filters.sortOrder === 'asc' ? 'ASC' : 'DESC';

    // Pagination
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const offset = (page - 1) * limit;

    const dataStmt = this.appDb.db.prepare(`
      SELECT * FROM expenses
      WHERE ${whereClause}
      ORDER BY ${sortColumn} ${sortDir}, created_at DESC
      LIMIT ? OFFSET ?
    `);

    const rows = (dataStmt.all(...params, limit, offset) as unknown) as ExpenseRow[];

    return {
      expenses: rows.map((r) => this.mapRowToOutput(r)),
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit) || 1,
    };
  }

  getFinancialSummary(familyId: string): FinancialSummary {
    // 1. Get family budget
    const famStmt = this.appDb.db.prepare('SELECT total_budget, total_budget_paise FROM families WHERE id = ?');
    const famRow = famStmt.get(familyId) as { total_budget: number; total_budget_paise?: number } | undefined;

    const totalBudgetPaise = famRow?.total_budget_paise !== undefined && famRow?.total_budget_paise !== null
      ? famRow.total_budget_paise
      : Math.round((famRow?.total_budget || 2500000) * 100);

    // 2. Aggregate expenses
    const aggStmt = this.appDb.db.prepare(`
      SELECT
        COALESCE(SUM(amount_paise), 0) as total_committed_paise,
        COALESCE(SUM(paid_amount_paise), 0) as total_paid_paise,
        COALESCE(SUM(amount_paise - paid_amount_paise), 0) as total_outstanding_paise,
        COUNT(*) as total_count
      FROM expenses
      WHERE family_id = ?
    `);

    const agg = aggStmt.get(familyId) as {
      total_committed_paise: number;
      total_paid_paise: number;
      total_outstanding_paise: number;
      total_count: number;
    };

    const remainingBudgetPaise = totalBudgetPaise - agg.total_committed_paise;
    const cashRemainingPaise = totalBudgetPaise - agg.total_paid_paise;

    let utilizationPercentage = 0;
    if (totalBudgetPaise > 0) {
      utilizationPercentage = Math.round((agg.total_committed_paise / totalBudgetPaise) * 1000) / 10;
    }

    // 3. Category breakdown
    const catStmt = this.appDb.db.prepare(`
      SELECT
        category,
        COALESCE(SUM(amount_paise), 0) as total_amount_paise,
        COALESCE(SUM(paid_amount_paise), 0) as total_paid_paise,
        COALESCE(SUM(amount_paise - paid_amount_paise), 0) as total_outstanding_paise,
        COUNT(*) as count
      FROM expenses
      WHERE family_id = ?
      GROUP BY category
      ORDER BY total_amount_paise DESC
    `);

    const catRows = catStmt.all(familyId) as Array<{
      category: ExpenseCategory;
      total_amount_paise: number;
      total_paid_paise: number;
      total_outstanding_paise: number;
      count: number;
    }>;

    const categoryBreakdown: CategorySummary[] = catRows.map((c) => {
      const percentage = agg.total_committed_paise > 0
        ? Math.round((c.total_amount_paise / agg.total_committed_paise) * 1000) / 10
        : 0;

      return {
        category: c.category,
        totalAmount: c.total_amount_paise / 100,
        totalAmountPaise: c.total_amount_paise,
        totalPaid: c.total_paid_paise / 100,
        totalPaidPaise: c.total_paid_paise,
        totalOutstanding: c.total_outstanding_paise / 100,
        totalOutstandingPaise: c.total_outstanding_paise,
        count: c.count,
        percentageOfTotal: percentage,
      };
    });

    // 4. Recent expenses (top 5)
    const recentStmt = this.appDb.db.prepare(`
      SELECT * FROM expenses
      WHERE family_id = ?
      ORDER BY date DESC, created_at DESC
      LIMIT 5
    `);
    const recentRows = (recentStmt.all(familyId) as unknown) as ExpenseRow[];

    return {
      totalBudget: totalBudgetPaise / 100,
      totalBudgetPaise,
      totalCommitted: agg.total_committed_paise / 100,
      totalCommittedPaise: agg.total_committed_paise,
      totalPaid: agg.total_paid_paise / 100,
      totalPaidPaise: agg.total_paid_paise,
      totalOutstanding: agg.total_outstanding_paise / 100,
      totalOutstandingPaise: agg.total_outstanding_paise,
      remainingBudget: remainingBudgetPaise / 100,
      remainingBudgetPaise,
      cashRemaining: cashRemainingPaise / 100,
      cashRemainingPaise,
      budgetUtilizationPercentage: utilizationPercentage,
      totalExpenseCount: agg.total_count,
      categoryBreakdown,
      recentExpenses: recentRows.map((r) => this.mapRowToOutput(r)),
    };
  }
}
