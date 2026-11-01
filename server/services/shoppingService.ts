import crypto from 'node:crypto';
import type { AppDatabase } from '../db/database.ts';

export interface ShoppingItemRow {
  id: string;
  family_id: string;
  name: string;
  category: string;
  description: string | null;
  estimated_price_paise: number;
  actual_price_paise: number;
  quantity: number;
  status: 'planned' | 'to_buy' | 'in_tailoring' | 'purchased' | 'cancelled';
  assigned_to: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  deadline: string | null;
  store_name: string | null;
  notes: string | null;
  created_by_user_id: string;
  updated_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShoppingItemOutput {
  id: string;
  familyId: string;
  name: string;
  category: string;
  description?: string;
  estimatedPrice: number;
  estimatedPricePaise: number;
  actualPrice?: number;
  actualPricePaise: number;
  quantity: number;
  status: 'planned' | 'to_buy' | 'in_tailoring' | 'purchased' | 'cancelled';
  assignedTo: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  deadline?: string;
  storeName?: string;
  notes?: string;
  isOverdue: boolean;
  createdByUserId: string;
  updatedByUserId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ShoppingSummaryOutput {
  estimatedTotal: number;
  estimatedTotalPaise: number;
  actualSpent: number;
  actualSpentPaise: number;
  variance: number;
  variancePaise: number;
  totalItems: number;
  purchasedItems: number;
  pendingItems: number;
  overdueItems: number;
}

export class ShoppingService {
  private appDb: AppDatabase;

  constructor(appDb: AppDatabase) {
    this.appDb = appDb;
  }

  private mapRowToOutput(row: ShoppingItemRow): ShoppingItemOutput {
    const today = new Date().toISOString().split('T')[0];
    const isOverdue = Boolean(
      row.deadline &&
      row.deadline < today &&
      row.status !== 'purchased' &&
      row.status !== 'cancelled'
    );

    return {
      id: row.id,
      familyId: row.family_id,
      name: row.name,
      category: row.category,
      description: row.description || undefined,
      estimatedPrice: row.estimated_price_paise / 100,
      estimatedPricePaise: row.estimated_price_paise,
      actualPrice: row.actual_price_paise > 0 ? row.actual_price_paise / 100 : undefined,
      actualPricePaise: row.actual_price_paise,
      quantity: row.quantity,
      status: row.status,
      assignedTo: row.assigned_to,
      priority: row.priority,
      deadline: row.deadline || undefined,
      storeName: row.store_name || undefined,
      notes: row.notes || undefined,
      isOverdue,
      createdByUserId: row.created_by_user_id,
      updatedByUserId: row.updated_by_user_id || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  createShoppingItem(
    familyId: string,
    userId: string,
    data: {
      name: string;
      category: string;
      description?: string;
      estimatedPrice: number;
      actualPrice?: number;
      quantity?: number;
      status?: 'planned' | 'to_buy' | 'in_tailoring' | 'purchased' | 'cancelled';
      assignedTo?: string;
      priority?: 'low' | 'medium' | 'high' | 'urgent';
      deadline?: string;
      storeName?: string;
      notes?: string;
    }
  ): ShoppingItemOutput {
    if (!data.name || !data.name.trim()) {
      throw new Error('ITEM_NAME_REQUIRED');
    }
    if (typeof data.estimatedPrice !== 'number' || isNaN(data.estimatedPrice) || data.estimatedPrice < 0) {
      throw new Error('INVALID_ESTIMATED_PRICE');
    }

    const estimatedPaise = Math.round(data.estimatedPrice * 100);
    const actualPaise = data.actualPrice && data.actualPrice > 0 ? Math.round(data.actualPrice * 100) : 0;
    const quantity = data.quantity && data.quantity > 0 ? Math.floor(data.quantity) : 1;
    const status = data.status || 'planned';
    const priority = data.priority || 'medium';

    const itemId = crypto.randomUUID();
    const now = new Date().toISOString();

    const stmt = this.appDb.db.prepare(`
      INSERT INTO shopping_items (
        id, family_id, name, category, description,
        estimated_price_paise, actual_price_paise, quantity,
        status, assigned_to, priority, deadline, store_name,
        notes, created_by_user_id, updated_by_user_id, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?
      )
    `);

    stmt.run(
      itemId,
      familyId,
      data.name.trim(),
      data.category,
      data.description?.trim() || null,
      estimatedPaise,
      actualPaise,
      quantity,
      status,
      data.assignedTo?.trim() || 'Family Member',
      priority,
      data.deadline || null,
      data.storeName?.trim() || null,
      data.notes?.trim() || null,
      userId,
      null,
      now,
      now
    );

    return this.getShoppingItemById(itemId, familyId)!;
  }

  getShoppingItemById(itemId: string, familyId: string): ShoppingItemOutput | null {
    const stmt = this.appDb.db.prepare('SELECT * FROM shopping_items WHERE id = ? AND family_id = ?');
    const row = stmt.get(itemId, familyId) as unknown as ShoppingItemRow | undefined;
    return row ? this.mapRowToOutput(row) : null;
  }

  updateShoppingItem(
    itemId: string,
    familyId: string,
    userId: string,
    data: {
      name?: string;
      category?: string;
      description?: string;
      estimatedPrice?: number;
      actualPrice?: number;
      quantity?: number;
      status?: 'planned' | 'to_buy' | 'in_tailoring' | 'purchased' | 'cancelled';
      assignedTo?: string;
      priority?: 'low' | 'medium' | 'high' | 'urgent';
      deadline?: string;
      storeName?: string;
      notes?: string;
    }
  ): ShoppingItemOutput {
    const existing = this.getShoppingItemById(itemId, familyId);
    if (!existing) {
      throw new Error('ITEM_NOT_FOUND');
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (data.name !== undefined) {
      if (!data.name.trim()) throw new Error('ITEM_NAME_REQUIRED');
      updates.push('name = ?');
      params.push(data.name.trim());
    }
    if (data.category !== undefined) {
      updates.push('category = ?');
      params.push(data.category);
    }
    if (data.description !== undefined) {
      updates.push('description = ?');
      params.push(data.description.trim() || null);
    }
    if (data.estimatedPrice !== undefined) {
      if (typeof data.estimatedPrice !== 'number' || isNaN(data.estimatedPrice) || data.estimatedPrice < 0) {
        throw new Error('INVALID_ESTIMATED_PRICE');
      }
      updates.push('estimated_price_paise = ?');
      params.push(Math.round(data.estimatedPrice * 100));
    }
    if (data.actualPrice !== undefined) {
      if (typeof data.actualPrice !== 'number' || isNaN(data.actualPrice) || data.actualPrice < 0) {
        throw new Error('INVALID_ACTUAL_PRICE');
      }
      updates.push('actual_price_paise = ?');
      params.push(Math.round(data.actualPrice * 100));
    }
    if (data.quantity !== undefined) {
      const q = Math.max(1, Math.floor(data.quantity));
      updates.push('quantity = ?');
      params.push(q);
    }
    if (data.status !== undefined) {
      updates.push('status = ?');
      params.push(data.status);
    }
    if (data.assignedTo !== undefined) {
      updates.push('assigned_to = ?');
      params.push(data.assignedTo.trim());
    }
    if (data.priority !== undefined) {
      updates.push('priority = ?');
      params.push(data.priority);
    }
    if (data.deadline !== undefined) {
      updates.push('deadline = ?');
      params.push(data.deadline || null);
    }
    if (data.storeName !== undefined) {
      updates.push('store_name = ?');
      params.push(data.storeName.trim() || null);
    }
    if (data.notes !== undefined) {
      updates.push('notes = ?');
      params.push(data.notes.trim() || null);
    }

    const now = new Date().toISOString();
    updates.push('updated_by_user_id = ?', 'updated_at = ?');
    params.push(userId, now);

    params.push(itemId, familyId);

    const stmt = this.appDb.db.prepare(`
      UPDATE shopping_items
      SET ${updates.join(', ')}
      WHERE id = ? AND family_id = ?
    `);
    stmt.run(...params);

    return this.getShoppingItemById(itemId, familyId)!;
  }

  deleteShoppingItem(itemId: string, familyId: string): void {
    const existing = this.getShoppingItemById(itemId, familyId);
    if (!existing) {
      throw new Error('ITEM_NOT_FOUND');
    }
    this.appDb.db.prepare('DELETE FROM shopping_items WHERE id = ? AND family_id = ?').run(itemId, familyId);
  }

  listShoppingItems(
    familyId: string,
    filters?: {
      search?: string;
      category?: string;
      status?: string;
      priority?: string;
      assignedTo?: string;
    }
  ): ShoppingItemOutput[] {
    const whereClauses: string[] = ['family_id = ?'];
    const params: any[] = [familyId];

    if (filters?.search && filters.search.trim()) {
      const q = `%${filters.search.trim()}%`;
      whereClauses.push('(name LIKE ? OR store_name LIKE ? OR assigned_to LIKE ?)');
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
    if (filters?.priority && filters.priority !== 'all') {
      whereClauses.push('priority = ?');
      params.push(filters.priority);
    }
    if (filters?.assignedTo && filters.assignedTo !== 'all') {
      whereClauses.push('assigned_to = ?');
      params.push(filters.assignedTo);
    }

    const stmt = this.appDb.db.prepare(`
      SELECT * FROM shopping_items
      WHERE ${whereClauses.join(' AND ')}
      ORDER BY
        CASE priority
          WHEN 'urgent' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
          ELSE 5
        END,
        deadline ASC,
        created_at DESC
    `);

    const rows = (stmt.all(...params) as unknown) as ShoppingItemRow[];
    return rows.map((r) => this.mapRowToOutput(r));
  }

  getShoppingSummary(familyId: string): ShoppingSummaryOutput {
    const today = new Date().toISOString().split('T')[0];

    const stmt = this.appDb.db.prepare(`
      SELECT
        COUNT(*) as total_items,
        COALESCE(SUM(estimated_price_paise), 0) as total_estimated_paise,
        COALESCE(SUM(CASE WHEN status = 'purchased' THEN actual_price_paise ELSE 0 END), 0) as total_actual_paise,
        COALESCE(SUM(CASE WHEN status = 'purchased' THEN 1 ELSE 0 END), 0) as purchased_count,
        COALESCE(SUM(CASE WHEN status NOT IN ('purchased', 'cancelled') THEN 1 ELSE 0 END), 0) as pending_count,
        COALESCE(SUM(CASE WHEN deadline IS NOT NULL AND deadline < ? AND status NOT IN ('purchased', 'cancelled') THEN 1 ELSE 0 END), 0) as overdue_count
      FROM shopping_items
      WHERE family_id = ?
    `);

    const result = stmt.get(today, familyId) as any;
    const estimatedTotalPaise = Number(result?.total_estimated_paise || 0);
    const actualSpentPaise = Number(result?.total_actual_paise || 0);
    const variancePaise = estimatedTotalPaise - actualSpentPaise;

    return {
      estimatedTotal: estimatedTotalPaise / 100,
      estimatedTotalPaise,
      actualSpent: actualSpentPaise / 100,
      actualSpentPaise,
      variance: variancePaise / 100,
      variancePaise,
      totalItems: Number(result?.total_items || 0),
      purchasedItems: Number(result?.purchased_count || 0),
      pendingItems: Number(result?.pending_count || 0),
      overdueItems: Number(result?.overdue_count || 0),
    };
  }
}
