import { AppDatabase } from '../db/database.ts';
import { ExpenseService } from './expenseService.ts';
import { VendorService } from './vendorService.ts';
import { ShoppingService } from './shoppingService.ts';
import { GiftService } from './giftService.ts';
import { ChecklistService } from './checklistService.ts';
import { BudgetService } from './budgetService.ts';

export interface IdempotencyRecord {
  key: string;
  familyId: string;
  userId: string;
  endpoint: string;
  responseStatus: number;
  responseBody: string;
  createdAt: string;
}

export interface SyncOperationPayload {
  operationId: string;
  entityType: 'expense' | 'vendor' | 'vendor_payment' | 'shopping' | 'gift' | 'checklist' | 'budget';
  entityId?: string;
  operationType: 'CREATE' | 'UPDATE' | 'DELETE';
  payload: any;
  baseVersion?: number;
}

export interface SyncOperationResult {
  operationId: string;
  status: 'synced' | 'conflict' | 'error';
  serverRecord?: any;
  error?: {
    code: string;
    message: string;
  };
  currentVersion?: number;
}

export class ConflictError extends Error {
  public code = 'CONFLICT_DETECTED';
  public serverRecord: any;
  public currentVersion: number;

  constructor(message: string, serverRecord: any, currentVersion: number) {
    super(message);
    this.name = 'ConflictError';
    this.serverRecord = serverRecord;
    this.currentVersion = currentVersion;
  }
}

export class SyncService {
  private appDb: AppDatabase;
  private expenseService: ExpenseService;
  private vendorService: VendorService;
  private shoppingService: ShoppingService;
  private giftService: GiftService;
  private checklistService: ChecklistService;
  private budgetService: BudgetService;

  constructor(appDb: AppDatabase) {
    this.appDb = appDb;
    this.expenseService = new ExpenseService(appDb);
    this.vendorService = new VendorService(appDb);
    this.shoppingService = new ShoppingService(appDb);
    this.giftService = new GiftService(appDb);
    this.checklistService = new ChecklistService(appDb);
    this.budgetService = new BudgetService(appDb);
  }

  /**
   * Check if an idempotency key was previously processed for this family
   */
  public getIdempotencyResult(key: string, familyId: string): { status: number; body: any } | null {
    if (!key) return null;
    const stmt = this.appDb.db.prepare(`
      SELECT response_status, response_body
      FROM idempotency_keys
      WHERE key = ? AND family_id = ?
    `);
    const row = stmt.get(key, familyId) as { response_status: number; response_body: string } | undefined;
    if (!row) return null;

    try {
      return {
        status: row.response_status,
        body: JSON.parse(row.response_body),
      };
    } catch {
      return {
        status: row.response_status,
        body: row.response_body,
      };
    }
  }

  /**
   * Save an executed idempotency response
   */
  public saveIdempotencyResult(
    key: string,
    familyId: string,
    userId: string,
    endpoint: string,
    responseStatus: number,
    responseBody: any
  ): void {
    if (!key) return;
    const jsonBody = typeof responseBody === 'string' ? responseBody : JSON.stringify(responseBody);
    this.appDb.db.prepare(`
      INSERT OR REPLACE INTO idempotency_keys (key, family_id, user_id, endpoint, response_status, response_body, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(key, familyId, userId, endpoint, responseStatus, jsonBody);
  }

  /**
   * Pull changes for all wedding planning entities updated since a given ISO timestamp
   */
  public pullChanges(familyId: string, since?: string) {
    const sinceFilter = since ? since : '1970-01-01T00:00:00.000Z';

    const expenses = this.appDb.db.prepare(`
      SELECT * FROM expenses
      WHERE family_id = ? AND updated_at >= ?
      ORDER BY updated_at ASC
    `).all(familyId, sinceFilter) as any[];

    const vendors = this.appDb.db.prepare(`
      SELECT * FROM vendors
      WHERE family_id = ? AND updated_at >= ?
      ORDER BY updated_at ASC
    `).all(familyId, sinceFilter) as any[];

    const vendorPayments = this.appDb.db.prepare(`
      SELECT * FROM vendor_payments
      WHERE family_id = ? AND created_at >= ?
      ORDER BY created_at ASC
    `).all(familyId, sinceFilter) as any[];

    const shopping = this.appDb.db.prepare(`
      SELECT * FROM shopping_items
      WHERE family_id = ? AND updated_at >= ?
      ORDER BY updated_at ASC
    `).all(familyId, sinceFilter) as any[];

    const gifts = this.appDb.db.prepare(`
      SELECT * FROM gifts_shagun
      WHERE family_id = ? AND updated_at >= ?
      ORDER BY updated_at ASC
    `).all(familyId, sinceFilter) as any[];

    const checklist = this.appDb.db.prepare(`
      SELECT * FROM checklist_tasks
      WHERE family_id = ? AND updated_at >= ?
      ORDER BY updated_at ASC
    `).all(familyId, sinceFilter) as any[];

    const budget = this.budgetService.getBudget(familyId);

    return {
      serverTimestamp: new Date().toISOString(),
      familyId,
      budget,
      expenses: expenses.map((row) => ({
        id: row.id,
        familyId: row.family_id,
        title: row.title,
        amount: row.amount_paise / 100,
        amountPaise: row.amount_paise,
        paidAmount: row.paid_amount_paise / 100,
        paidAmountPaise: row.paid_amount_paise,
        outstandingBalance: (row.amount_paise - row.paid_amount_paise) / 100,
        outstandingBalancePaise: row.amount_paise - row.paid_amount_paise,
        category: row.category,
        date: row.date,
        paidByName: row.paid_by_name,
        paidByUserId: row.paid_by_user_id,
        vendorName: row.vendor_name,
        vendorId: row.vendor_id,
        paymentMethod: row.payment_method,
        paymentStatus: row.payment_status,
        notes: row.notes,
        version: row.version ?? 1,
        createdByUserId: row.created_by_user_id,
        updatedByUserId: row.updated_by_user_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
      vendors: vendors.map((row) => ({
        id: row.id,
        familyId: row.family_id,
        name: row.name,
        category: row.category,
        contactPerson: row.contact_person,
        phone: row.phone,
        email: row.email,
        city: row.city,
        address: row.address,
        agreedAmount: row.agreed_amount_paise / 100,
        agreedAmountPaise: row.agreed_amount_paise,
        advancePaid: row.paid_amount_paise / 100,
        paidAmountPaise: row.paid_amount_paise,
        balanceDue: row.balance_due_paise / 100,
        balanceDuePaise: row.balance_due_paise,
        dueDate: row.due_date,
        status: row.status,
        notes: row.notes,
        version: row.version ?? 1,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
      vendorPayments: vendorPayments.map((row) => ({
        id: row.id,
        familyId: row.family_id,
        vendorId: row.vendor_id,
        amount: row.amount_paise / 100,
        amountPaise: row.amount_paise,
        paymentDate: row.payment_date,
        paymentMethod: row.payment_method,
        transactionReference: row.transaction_reference,
        notes: row.notes,
        linkedExpenseId: row.linked_expense_id,
        recordedByUserId: row.recorded_by_user_id,
        createdAt: row.created_at,
      })),
      shopping: shopping.map((row) => ({
        id: row.id,
        familyId: row.family_id,
        name: row.name,
        title: row.name,
        category: row.category,
        description: row.description,
        estimatedPrice: row.estimated_price_paise / 100,
        estimatedPricePaise: row.estimated_price_paise,
        actualPrice: row.actual_price_paise > 0 ? row.actual_price_paise / 100 : undefined,
        actualPricePaise: row.actual_price_paise,
        quantity: row.quantity,
        status: row.status,
        assignedTo: row.assigned_to,
        priority: row.priority,
        deadline: row.deadline,
        storeName: row.store_name,
        notes: row.notes,
        version: row.version ?? 1,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
      gifts: gifts.map((row) => ({
        id: row.id,
        familyId: row.family_id,
        giverName: row.giver_name,
        donorName: row.giver_name,
        relation: row.relation,
        giftType: row.gift_type,
        amount: row.amount_paise > 0 ? row.amount_paise / 100 : undefined,
        amountPaise: row.amount_paise,
        description: row.description,
        dateReceived: row.date_received,
        recipient: row.recipient,
        side: row.side,
        notes: row.notes,
        version: row.version ?? 1,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
      checklist: checklist.map((row) => ({
        id: row.id,
        familyId: row.family_id,
        title: row.title,
        category: row.category,
        phase: row.phase,
        status: row.status,
        isCompleted: row.status === 'completed',
        assignedTo: row.assigned_to,
        priority: row.priority,
        dueDate: row.due_date,
        notes: row.notes,
        completedAt: row.completed_at,
        version: row.version ?? 1,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
    };
  }

  /**
   * Process a batch of mutations queued offline by a client
   */
  public processBatch(
    familyId: string,
    userId: string,
    userRole: 'OWNER' | 'FAMILY_MEMBER' | 'VIEWER',
    operations: SyncOperationPayload[]
  ): SyncOperationResult[] {
    const results: SyncOperationResult[] = [];

    for (const op of operations) {
      // 1. Check Idempotency first
      const cached = this.getIdempotencyResult(op.operationId, familyId);
      if (cached) {
        results.push({
          operationId: op.operationId,
          status: cached.status >= 200 && cached.status < 300 ? 'synced' : 'error',
          serverRecord: cached.body.data || cached.body,
        });
        continue;
      }

      // 2. Authorization check: Viewer is strictly read-only
      if (userRole === 'VIEWER') {
        const errorResult: SyncOperationResult = {
          operationId: op.operationId,
          status: 'error',
          error: {
            code: 'PERMISSION_DENIED',
            message: 'Viewer role has read-only access. Mutation cannot be synchronized.',
          },
        };
        this.saveIdempotencyResult(op.operationId, familyId, userId, '/api/sync/batch', 403, errorResult);
        results.push(errorResult);
        continue;
      }

      // 3. Process operation by entity type
      try {
        let serverRecord: any = null;

        if (op.entityType === 'expense') {
          if (op.operationType === 'CREATE') {
            serverRecord = this.expenseService.createExpense(familyId, userId, {
              title: op.payload.title,
              amount: op.payload.amount,
              paidAmount: op.payload.paidAmount,
              category: op.payload.category,
              date: op.payload.date,
              paidByName: op.payload.paidByName || op.payload.paidBy,
              vendorName: op.payload.vendorName,
              paymentMethod: op.payload.paymentMethod || op.payload.paymentMode || 'cash',
              paymentStatus: op.payload.paymentStatus || op.payload.status,
              notes: op.payload.notes,
            });
          } else if (op.operationType === 'UPDATE') {
            const current = this.appDb.db.prepare('SELECT version FROM expenses WHERE id = ? AND family_id = ?').get(op.entityId!, familyId) as { version: number } | undefined;
            if (!current) {
              throw new Error('Expense not found.');
            }
            if (op.baseVersion !== undefined && current.version !== op.baseVersion) {
              const fullServer = this.expenseService.getExpenseById(familyId, op.entityId!);
              throw new ConflictError('Concurrent edit detected on expense record.', fullServer, current.version);
            }
            // Execute update and increment version
            this.appDb.db.prepare('UPDATE expenses SET version = version + 1 WHERE id = ? AND family_id = ?').run(op.entityId!, familyId);
            serverRecord = this.expenseService.updateExpense(familyId, userId, op.entityId!, op.payload);
          } else if (op.operationType === 'DELETE') {
            serverRecord = this.expenseService.deleteExpense(familyId, userId, op.entityId!);
          }
        } else if (op.entityType === 'vendor') {
          if (op.operationType === 'CREATE') {
            serverRecord = this.vendorService.createVendor(familyId, userId, op.payload);
          } else if (op.operationType === 'UPDATE') {
            const current = this.appDb.db.prepare('SELECT version FROM vendors WHERE id = ? AND family_id = ?').get(op.entityId!, familyId) as { version: number } | undefined;
            if (!current) {
              throw new Error('Vendor not found.');
            }
            if (op.baseVersion !== undefined && current.version !== op.baseVersion) {
              const fullServer = this.vendorService.getVendorById(op.entityId!, familyId);
              throw new ConflictError('Concurrent edit detected on vendor record.', fullServer, current.version);
            }
            this.appDb.db.prepare('UPDATE vendors SET version = version + 1 WHERE id = ? AND family_id = ?').run(op.entityId!, familyId);
            serverRecord = this.vendorService.updateVendor(op.entityId!, familyId, userId, op.payload);
          } else if (op.operationType === 'DELETE') {
            serverRecord = this.vendorService.deleteVendor(op.entityId!, familyId);
          }
        } else if (op.entityType === 'vendor_payment') {
          if (op.operationType === 'CREATE') {
            serverRecord = this.vendorService.addVendorPayment(op.payload.vendorId || op.entityId, familyId, userId, op.payload);
          }
        } else if (op.entityType === 'shopping') {
          if (op.operationType === 'CREATE') {
            serverRecord = this.shoppingService.createShoppingItem(familyId, userId, op.payload);
          } else if (op.operationType === 'UPDATE') {
            const current = this.appDb.db.prepare('SELECT version FROM shopping_items WHERE id = ? AND family_id = ?').get(op.entityId!, familyId) as { version: number } | undefined;
            if (!current) {
              throw new Error('Shopping item not found.');
            }
            if (op.baseVersion !== undefined && current.version !== op.baseVersion) {
              const fullServer = this.shoppingService.getShoppingItemById(op.entityId!, familyId);
              throw new ConflictError('Concurrent edit detected on shopping item.', fullServer, current.version);
            }
            this.appDb.db.prepare('UPDATE shopping_items SET version = version + 1 WHERE id = ? AND family_id = ?').run(op.entityId!, familyId);
            serverRecord = this.shoppingService.updateShoppingItem(op.entityId!, familyId, userId, op.payload);
          } else if (op.operationType === 'DELETE') {
            serverRecord = this.shoppingService.deleteShoppingItem(op.entityId!, familyId);
          }
        } else if (op.entityType === 'gift') {
          if (op.operationType === 'CREATE') {
            serverRecord = this.giftService.createGift(familyId, userId, op.payload);
          } else if (op.operationType === 'UPDATE') {
            const current = this.appDb.db.prepare('SELECT version FROM gifts_shagun WHERE id = ? AND family_id = ?').get(op.entityId!, familyId) as { version: number } | undefined;
            if (!current) {
              throw new Error('Gift record not found.');
            }
            if (op.baseVersion !== undefined && current.version !== op.baseVersion) {
              const fullServer = this.giftService.getGiftById(op.entityId!, familyId);
              throw new ConflictError('Concurrent edit detected on gift record.', fullServer, current.version);
            }
            this.appDb.db.prepare('UPDATE gifts_shagun SET version = version + 1 WHERE id = ? AND family_id = ?').run(op.entityId!, familyId);
            serverRecord = this.giftService.updateGift(op.entityId!, familyId, userId, op.payload);
          } else if (op.operationType === 'DELETE') {
            serverRecord = this.giftService.deleteGift(op.entityId!, familyId);
          }
        } else if (op.entityType === 'checklist') {
          if (op.operationType === 'CREATE') {
            serverRecord = this.checklistService.createTask(familyId, userId, op.payload);
          } else if (op.operationType === 'UPDATE') {
            const current = this.appDb.db.prepare('SELECT version FROM checklist_tasks WHERE id = ? AND family_id = ?').get(op.entityId!, familyId) as { version: number } | undefined;
            if (!current) {
              throw new Error('Checklist task not found.');
            }
            if (op.baseVersion !== undefined && current.version !== op.baseVersion) {
              const fullServer = this.checklistService.getTaskById(op.entityId!, familyId);
              throw new ConflictError('Concurrent edit detected on checklist task.', fullServer, current.version);
            }
            this.appDb.db.prepare('UPDATE checklist_tasks SET version = version + 1 WHERE id = ? AND family_id = ?').run(op.entityId!, familyId);
            serverRecord = this.checklistService.updateTask(op.entityId!, familyId, userId, op.payload);
          } else if (op.operationType === 'DELETE') {
            serverRecord = this.checklistService.deleteTask(op.entityId!, familyId);
          }
        } else if (op.entityType === 'budget') {
          if (op.operationType === 'UPDATE') {
            serverRecord = this.budgetService.updateBudget(familyId, userId, op.payload.totalBudget);
          }
        }

        const successResult: SyncOperationResult = {
          operationId: op.operationId,
          status: 'synced',
          serverRecord,
        };
        this.saveIdempotencyResult(op.operationId, familyId, userId, '/api/sync/batch', 200, successResult);
        results.push(successResult);
      } catch (err: any) {
        if (err instanceof ConflictError) {
          const conflictResult: SyncOperationResult = {
            operationId: op.operationId,
            status: 'conflict',
            serverRecord: err.serverRecord,
            currentVersion: err.currentVersion,
            error: {
              code: 'CONFLICT_DETECTED',
              message: err.message,
            },
          };
          // Do not cache conflicts as permanent idempotency so client can resolve and retry
          results.push(conflictResult);
        } else {
          const errorResult: SyncOperationResult = {
            operationId: op.operationId,
            status: 'error',
            error: {
              code: 'OPERATION_FAILED',
              message: err.message || 'Operation failed during server synchronization.',
            },
          };
          this.saveIdempotencyResult(op.operationId, familyId, userId, '/api/sync/batch', 400, errorResult);
          results.push(errorResult);
        }
      }
    }

    return results;
  }
}
