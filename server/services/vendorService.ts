import crypto from 'node:crypto';
import type { AppDatabase } from '../db/database.ts';

export interface VendorRow {
  id: string;
  family_id: string;
  name: string;
  category: string;
  contact_person: string;
  phone: string;
  email: string | null;
  city: string;
  address: string | null;
  agreed_amount_paise: number;
  paid_amount_paise: number;
  balance_due_paise: number;
  due_date: string | null;
  status: 'booked' | 'advance_paid' | 'fully_paid' | 'in_negotiation' | 'cancelled';
  event_name: string | null;
  notes: string | null;
  created_by_user_id: string;
  updated_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface VendorPaymentRow {
  id: string;
  family_id: string;
  vendor_id: string;
  amount_paise: number;
  payment_date: string;
  payment_method: 'cash' | 'upi' | 'card' | 'bank_transfer' | 'other';
  transaction_reference: string | null;
  notes: string | null;
  linked_expense_id: string | null;
  recorded_by_user_id: string;
  created_at: string;
}

export interface VendorOutput {
  id: string;
  familyId: string;
  name: string;
  category: string;
  contactPerson: string;
  phone: string;
  email?: string;
  city: string;
  address?: string;
  agreedAmount: number;
  agreedAmountPaise: number;
  paidAmount: number;
  paidAmountPaise: number;
  balanceDue: number;
  balanceDuePaise: number;
  dueDate?: string;
  status: 'booked' | 'advance_paid' | 'fully_paid' | 'in_negotiation' | 'cancelled';
  eventName?: string;
  notes?: string;
  createdByUserId: string;
  updatedByUserId?: string;
  createdAt: string;
  updatedAt: string;
  payments?: VendorPaymentOutput[];
}

export interface VendorPaymentOutput {
  id: string;
  familyId: string;
  vendorId: string;
  amount: number;
  amountPaise: number;
  paymentDate: string;
  paymentMethod: 'cash' | 'upi' | 'card' | 'bank_transfer' | 'other';
  transactionReference?: string;
  notes?: string;
  linkedExpenseId?: string;
  recordedByUserId: string;
  createdAt: string;
}

export interface VendorSummaryOutput {
  totalContracted: number;
  totalContractedPaise: number;
  totalPaid: number;
  totalPaidPaise: number;
  totalBalanceDue: number;
  totalBalanceDuePaise: number;
  vendorCount: number;
}

export class VendorService {
  private appDb: AppDatabase;

  constructor(appDb: AppDatabase) {
    this.appDb = appDb;
  }

  private mapRowToOutput(row: VendorRow, payments?: VendorPaymentOutput[]): VendorOutput {
    return {
      id: row.id,
      familyId: row.family_id,
      name: row.name,
      category: row.category,
      contactPerson: row.contact_person,
      phone: row.phone,
      email: row.email || undefined,
      city: row.city,
      address: row.address || undefined,
      agreedAmount: row.agreed_amount_paise / 100,
      agreedAmountPaise: row.agreed_amount_paise,
      paidAmount: row.paid_amount_paise / 100,
      paidAmountPaise: row.paid_amount_paise,
      balanceDue: row.balance_due_paise / 100,
      balanceDuePaise: row.balance_due_paise,
      dueDate: row.due_date || undefined,
      status: row.status,
      eventName: row.event_name || undefined,
      notes: row.notes || undefined,
      createdByUserId: row.created_by_user_id,
      updatedByUserId: row.updated_by_user_id || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      payments,
    };
  }

  private mapPaymentRowToOutput(row: VendorPaymentRow): VendorPaymentOutput {
    return {
      id: row.id,
      familyId: row.family_id,
      vendorId: row.vendor_id,
      amount: row.amount_paise / 100,
      amountPaise: row.amount_paise,
      paymentDate: row.payment_date,
      paymentMethod: row.payment_method,
      transactionReference: row.transaction_reference || undefined,
      notes: row.notes || undefined,
      linkedExpenseId: row.linked_expense_id || undefined,
      recordedByUserId: row.recorded_by_user_id,
      createdAt: row.created_at,
    };
  }

  createVendor(
    familyId: string,
    userId: string,
    data: {
      name: string;
      category: string;
      contactPerson: string;
      phone?: string;
      email?: string;
      city?: string;
      address?: string;
      agreedAmount: number;
      advancePaid?: number;
      dueDate?: string;
      eventName?: string;
      notes?: string;
      recordAdvanceInExpenses?: boolean;
    }
  ): VendorOutput {
    if (!data.name || !data.name.trim()) {
      throw new Error('VENDOR_NAME_REQUIRED');
    }
    if (typeof data.agreedAmount !== 'number' || isNaN(data.agreedAmount) || data.agreedAmount < 0) {
      throw new Error('INVALID_AGREED_AMOUNT');
    }

    const agreedPaise = Math.round(data.agreedAmount * 100);
    const advancePaise = data.advancePaid && data.advancePaid > 0 ? Math.round(data.advancePaid * 100) : 0;

    if (advancePaise > agreedPaise) {
      throw new Error('ADVANCE_EXCEEDS_AGREED_AMOUNT');
    }

    const balancePaise = agreedPaise - advancePaise;
    let initialStatus: 'booked' | 'advance_paid' | 'fully_paid' = 'booked';
    if (advancePaise > 0) {
      initialStatus = advancePaise >= agreedPaise ? 'fully_paid' : 'advance_paid';
    }

    const vendorId = crypto.randomUUID();
    const now = new Date().toISOString();

    const insertStmt = this.appDb.db.prepare(`
      INSERT INTO vendors (
        id, family_id, name, category, contact_person, phone, email,
        city, address, agreed_amount_paise, paid_amount_paise, balance_due_paise,
        due_date, status, event_name, notes, created_by_user_id, updated_by_user_id,
        created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?
      )
    `);

    insertStmt.run(
      vendorId,
      familyId,
      data.name.trim(),
      data.category,
      (data.contactPerson && data.contactPerson.trim()) || 'Manager',
      (data.phone && data.phone.trim()) || '',
      (data.email && data.email.trim()) || null,
      (data.city && data.city.trim()) || 'Local',
      (data.address && data.address.trim()) || null,
      agreedPaise,
      advancePaise,
      balancePaise,
      data.dueDate || null,
      initialStatus,
      (data.eventName && data.eventName.trim()) || null,
      (data.notes && data.notes.trim()) || null,
      userId,
      null,
      now,
      now
    );

    // If an initial advance was recorded, log it in vendor_payments
    if (advancePaise > 0) {
      const paymentId = crypto.randomUUID();
      let linkedExpenseId: string | null = null;

      if (data.recordAdvanceInExpenses) {
        linkedExpenseId = crypto.randomUUID();
        const expenseInsert = this.appDb.db.prepare(`
          INSERT INTO expenses (
            id, family_id, title, amount_paise, paid_amount_paise, category,
            date, paid_by_name, vendor_name, vendor_id, payment_method, payment_status,
            notes, created_by_user_id, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        expenseInsert.run(
          linkedExpenseId,
          familyId,
          `Advance to ${data.name.trim()}`,
          advancePaise,
          advancePaise,
          data.category,
          now.split('T')[0],
          'Family Member',
          data.name.trim(),
          vendorId,
          'other',
          'paid',
          `Advance payment for vendor ${data.name.trim()}`,
          userId,
          now,
          now
        );
      }

      const paymentStmt = this.appDb.db.prepare(`
        INSERT INTO vendor_payments (
          id, family_id, vendor_id, amount_paise, payment_date,
          payment_method, notes, linked_expense_id, recorded_by_user_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      paymentStmt.run(
        paymentId,
        familyId,
        vendorId,
        advancePaise,
        data.dueDate || now.split('T')[0],
        'other',
        'Initial Advance Deposit',
        linkedExpenseId,
        userId,
        now
      );
    }

    return this.getVendorById(vendorId, familyId)!;
  }

  getVendorById(vendorId: string, familyId: string): VendorOutput | null {
    const stmt = this.appDb.db.prepare('SELECT * FROM vendors WHERE id = ? AND family_id = ?');
    const row = stmt.get(vendorId, familyId) as unknown as VendorRow | undefined;
    if (!row) return null;

    const paymentsStmt = this.appDb.db.prepare(
      'SELECT * FROM vendor_payments WHERE vendor_id = ? AND family_id = ? ORDER BY payment_date DESC, created_at DESC'
    );
    const paymentRows = (paymentsStmt.all(vendorId, familyId) as unknown) as VendorPaymentRow[];
    const payments = paymentRows.map((p) => this.mapPaymentRowToOutput(p));

    return this.mapRowToOutput(row, payments);
  }

  updateVendor(
    vendorId: string,
    familyId: string,
    userId: string,
    data: {
      name?: string;
      category?: string;
      contactPerson?: string;
      phone?: string;
      email?: string;
      city?: string;
      address?: string;
      agreedAmount?: number;
      dueDate?: string;
      status?: 'booked' | 'advance_paid' | 'fully_paid' | 'in_negotiation' | 'cancelled';
      eventName?: string;
      notes?: string;
    }
  ): VendorOutput {
    const existing = this.getVendorById(vendorId, familyId);
    if (!existing) {
      throw new Error('VENDOR_NOT_FOUND');
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (data.name !== undefined) {
      if (!data.name.trim()) throw new Error('VENDOR_NAME_REQUIRED');
      updates.push('name = ?');
      params.push(data.name.trim());
    }
    if (data.category !== undefined) {
      updates.push('category = ?');
      params.push(data.category);
    }
    if (data.contactPerson !== undefined) {
      updates.push('contact_person = ?');
      params.push(data.contactPerson.trim());
    }
    if (data.phone !== undefined) {
      updates.push('phone = ?');
      params.push(data.phone.trim());
    }
    if (data.email !== undefined) {
      updates.push('email = ?');
      params.push(data.email.trim() || null);
    }
    if (data.city !== undefined) {
      updates.push('city = ?');
      params.push(data.city.trim());
    }
    if (data.address !== undefined) {
      updates.push('address = ?');
      params.push(data.address.trim() || null);
    }
    if (data.agreedAmount !== undefined) {
      if (typeof data.agreedAmount !== 'number' || isNaN(data.agreedAmount) || data.agreedAmount < 0) {
        throw new Error('INVALID_AGREED_AMOUNT');
      }
      const newAgreedPaise = Math.round(data.agreedAmount * 100);
      const newBalancePaise = Math.max(0, newAgreedPaise - existing.paidAmountPaise);
      updates.push('agreed_amount_paise = ?', 'balance_due_paise = ?');
      params.push(newAgreedPaise, newBalancePaise);

      // Auto update status if agreed amount changed
      if (data.status === undefined) {
        const autoStatus = newBalancePaise === 0 ? 'fully_paid' : (existing.paidAmountPaise > 0 ? 'advance_paid' : 'booked');
        updates.push('status = ?');
        params.push(autoStatus);
      }
    }
    if (data.status !== undefined) {
      updates.push('status = ?');
      params.push(data.status);
    }
    if (data.dueDate !== undefined) {
      updates.push('due_date = ?');
      params.push(data.dueDate || null);
    }
    if (data.eventName !== undefined) {
      updates.push('event_name = ?');
      params.push(data.eventName.trim() || null);
    }
    if (data.notes !== undefined) {
      updates.push('notes = ?');
      params.push(data.notes.trim() || null);
    }

    const now = new Date().toISOString();
    updates.push('updated_by_user_id = ?', 'updated_at = ?');
    params.push(userId, now);

    params.push(vendorId, familyId);

    const updateStmt = this.appDb.db.prepare(`
      UPDATE vendors
      SET ${updates.join(', ')}
      WHERE id = ? AND family_id = ?
    `);
    updateStmt.run(...params);

    return this.getVendorById(vendorId, familyId)!;
  }

  deleteVendor(vendorId: string, familyId: string): void {
    const existing = this.getVendorById(vendorId, familyId);
    if (!existing) {
      throw new Error('VENDOR_NOT_FOUND');
    }

    const deleteStmt = this.appDb.db.prepare('DELETE FROM vendors WHERE id = ? AND family_id = ?');
    deleteStmt.run(vendorId, familyId);
  }

  listVendors(
    familyId: string,
    filters?: {
      search?: string;
      category?: string;
      status?: string;
      sortBy?: 'name' | 'agreed_amount' | 'due_date' | 'created_at';
      sortOrder?: 'asc' | 'desc';
    }
  ): VendorOutput[] {
    const whereClauses: string[] = ['family_id = ?'];
    const params: any[] = [familyId];

    if (filters?.search && filters.search.trim()) {
      const q = `%${filters.search.trim()}%`;
      whereClauses.push('(name LIKE ? OR contact_person LIKE ? OR city LIKE ?)');
      params.push(q, q, q);
    }
    if (filters?.category && filters.category !== 'all') {
      whereClauses.push('category = ?');
      params.push(filters.category);
    }
    if (filters?.status && filters.status !== 'all') {
      whereClauses.push('status = ?');
      params.push(filters.status);
    }

    let sortCol = 'created_at';
    if (filters?.sortBy === 'name') sortCol = 'name';
    if (filters?.sortBy === 'agreed_amount') sortCol = 'agreed_amount_paise';
    if (filters?.sortBy === 'due_date') sortCol = 'due_date';

    const sortDir = filters?.sortOrder === 'asc' ? 'ASC' : 'DESC';

    const stmt = this.appDb.db.prepare(`
      SELECT * FROM vendors
      WHERE ${whereClauses.join(' AND ')}
      ORDER BY ${sortCol} ${sortDir}
    `);

    const rows = (stmt.all(...params) as unknown) as VendorRow[];
    return rows.map((r) => this.mapRowToOutput(r));
  }

  getVendorFinancialSummary(familyId: string): VendorSummaryOutput {
    const stmt = this.appDb.db.prepare(`
      SELECT
        COUNT(*) as vendor_count,
        COALESCE(SUM(agreed_amount_paise), 0) as total_contracted_paise,
        COALESCE(SUM(paid_amount_paise), 0) as total_paid_paise,
        COALESCE(SUM(balance_due_paise), 0) as total_balance_due_paise
      FROM vendors
      WHERE family_id = ?
    `);

    const result = stmt.get(familyId) as any;
    const totalContractedPaise = Number(result?.total_contracted_paise || 0);
    const totalPaidPaise = Number(result?.total_paid_paise || 0);
    const totalBalanceDuePaise = Number(result?.total_balance_due_paise || 0);
    const vendorCount = Number(result?.vendor_count || 0);

    return {
      totalContracted: totalContractedPaise / 100,
      totalContractedPaise,
      totalPaid: totalPaidPaise / 100,
      totalPaidPaise,
      totalBalanceDue: totalBalanceDuePaise / 100,
      totalBalanceDuePaise,
      vendorCount,
    };
  }

  // --- Vendor Payments ---
  addVendorPayment(
    vendorId: string,
    familyId: string,
    userId: string,
    data: {
      amount: number;
      paymentDate: string;
      paymentMethod: 'cash' | 'upi' | 'card' | 'bank_transfer' | 'other';
      transactionReference?: string;
      notes?: string;
      recordInExpenses?: boolean;
      allowOverpayment?: boolean;
    }
  ): VendorPaymentOutput {
    const vendor = this.getVendorById(vendorId, familyId);
    if (!vendor) {
      throw new Error('VENDOR_NOT_FOUND');
    }

    if (typeof data.amount !== 'number' || isNaN(data.amount) || data.amount <= 0) {
      throw new Error('INVALID_PAYMENT_AMOUNT');
    }

    const paymentPaise = Math.round(data.amount * 100);

    // Prevent accidental overpayment unless explicitly allowed
    if (!data.allowOverpayment && paymentPaise > vendor.balanceDuePaise) {
      throw new Error('PAYMENT_EXCEEDS_BALANCE');
    }

    const paymentId = crypto.randomUUID();
    const now = new Date().toISOString();
    let linkedExpenseId: string | null = null;

    // Optional integration with expenses: avoids double counting
    if (data.recordInExpenses) {
      linkedExpenseId = crypto.randomUUID();
      const expStmt = this.appDb.db.prepare(`
        INSERT INTO expenses (
          id, family_id, title, amount_paise, paid_amount_paise, category,
          date, paid_by_name, vendor_name, vendor_id, payment_method, payment_status,
          notes, created_by_user_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      expStmt.run(
        linkedExpenseId,
        familyId,
        `Payment to ${vendor.name}`,
        paymentPaise,
        paymentPaise,
        vendor.category,
        data.paymentDate || now.split('T')[0],
        'Family Member',
        vendor.name,
        vendorId,
        data.paymentMethod,
        'paid',
        data.notes || `Disbursed to vendor ${vendor.name}`,
        userId,
        now,
        now
      );
    }

    // Insert payment record
    const payStmt = this.appDb.db.prepare(`
      INSERT INTO vendor_payments (
        id, family_id, vendor_id, amount_paise, payment_date,
        payment_method, transaction_reference, notes, linked_expense_id,
        recorded_by_user_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    payStmt.run(
      paymentId,
      familyId,
      vendorId,
      paymentPaise,
      data.paymentDate || now.split('T')[0],
      data.paymentMethod,
      data.transactionReference?.trim() || null,
      data.notes?.trim() || null,
      linkedExpenseId,
      userId,
      now
    );

    // Transactionally update vendor totals
    const newPaidPaise = vendor.paidAmountPaise + paymentPaise;
    const newBalancePaise = Math.max(0, vendor.agreedAmountPaise - newPaidPaise);
    const newStatus = newBalancePaise === 0 ? 'fully_paid' : 'advance_paid';

    const updateVendorStmt = this.appDb.db.prepare(`
      UPDATE vendors
      SET paid_amount_paise = ?, balance_due_paise = ?, status = ?, updated_at = ?
      WHERE id = ? AND family_id = ?
    `);
    updateVendorStmt.run(newPaidPaise, newBalancePaise, newStatus, now, vendorId, familyId);

    const getPayStmt = this.appDb.db.prepare('SELECT * FROM vendor_payments WHERE id = ?');
    const payRow = (getPayStmt.get(paymentId) as unknown) as VendorPaymentRow;
    return this.mapPaymentRowToOutput(payRow);
  }

  listVendorPayments(vendorId: string, familyId: string): VendorPaymentOutput[] {
    const vendor = this.getVendorById(vendorId, familyId);
    if (!vendor) {
      throw new Error('VENDOR_NOT_FOUND');
    }

    const stmt = this.appDb.db.prepare(`
      SELECT * FROM vendor_payments
      WHERE vendor_id = ? AND family_id = ?
      ORDER BY payment_date DESC, created_at DESC
    `);
    const rows = (stmt.all(vendorId, familyId) as unknown) as VendorPaymentRow[];
    return rows.map((r) => this.mapPaymentRowToOutput(r));
  }

  deleteVendorPayment(paymentId: string, vendorId: string, familyId: string): void {
    const payStmt = this.appDb.db.prepare('SELECT * FROM vendor_payments WHERE id = ? AND vendor_id = ? AND family_id = ?');
    const payment = (payStmt.get(paymentId, vendorId, familyId) as unknown) as VendorPaymentRow | undefined;
    if (!payment) {
      throw new Error('PAYMENT_NOT_FOUND');
    }

    const vendor = this.getVendorById(vendorId, familyId);
    if (!vendor) {
      throw new Error('VENDOR_NOT_FOUND');
    }

    // Delete linked expense if created by this payment
    if (payment.linked_expense_id) {
      this.appDb.db.prepare('DELETE FROM expenses WHERE id = ? AND family_id = ?').run(payment.linked_expense_id, familyId);
    }

    // Delete payment
    this.appDb.db.prepare('DELETE FROM vendor_payments WHERE id = ?').run(paymentId);

    // Recompute vendor totals
    const now = new Date().toISOString();
    const newPaidPaise = Math.max(0, vendor.paidAmountPaise - payment.amount_paise);
    const newBalancePaise = Math.max(0, vendor.agreedAmountPaise - newPaidPaise);
    const newStatus = newBalancePaise === 0 && vendor.agreedAmountPaise > 0
      ? 'fully_paid'
      : (newPaidPaise > 0 ? 'advance_paid' : 'booked');

    this.appDb.db.prepare(`
      UPDATE vendors
      SET paid_amount_paise = ?, balance_due_paise = ?, status = ?, updated_at = ?
      WHERE id = ? AND family_id = ?
    `).run(newPaidPaise, newBalancePaise, newStatus, now, vendorId, familyId);
  }
}
