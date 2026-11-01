import { AppDatabase } from '../db/database.ts';

export interface BudgetInfo {
  totalBudget: number;
  totalBudgetPaise: number;
  currency: string;
  updatedAt: string;
  budgetUpdatedByUserId: string | null;
}

export class BudgetService {
  private appDb: AppDatabase;

  constructor(appDb: AppDatabase) {
    this.appDb = appDb;
  }

  getBudget(familyId: string): BudgetInfo {
    const stmt = this.appDb.db.prepare(`
      SELECT total_budget, total_budget_paise, currency, updated_at, budget_updated_by_user_id
      FROM families
      WHERE id = ?
    `);

    const row = stmt.get(familyId) as {
      total_budget: number;
      total_budget_paise: number;
      currency: string;
      updated_at: string;
      budget_updated_by_user_id: string | null;
    } | undefined;

    if (!row) {
      throw new Error('FAMILY_NOT_FOUND: Wedding workspace not found.');
    }

    const totalBudgetPaise = row.total_budget_paise !== undefined && row.total_budget_paise !== null
      ? row.total_budget_paise
      : Math.round(row.total_budget * 100);

    return {
      totalBudget: totalBudgetPaise / 100,
      totalBudgetPaise,
      currency: row.currency || 'INR',
      updatedAt: row.updated_at,
      budgetUpdatedByUserId: row.budget_updated_by_user_id,
    };
  }

  updateBudget(familyId: string, userId: string, newBudget: number): BudgetInfo {
    if (typeof newBudget !== 'number' || isNaN(newBudget) || !isFinite(newBudget) || newBudget < 0) {
      throw new Error('VALIDATION_ERROR: Target budget must be a valid non-negative number.');
    }

    // Maximum cap: ₹100 Crores (1,000,000,000)
    if (newBudget > 1000000000) {
      throw new Error('VALIDATION_ERROR: Target budget exceeds maximum allowed limit of ₹100 Crores.');
    }

    // Authoritative integer paise math
    const budgetPaise = Math.round(newBudget * 100);
    const normalizedBudget = budgetPaise / 100;
    const now = new Date().toISOString();

    const stmt = this.appDb.db.prepare(`
      UPDATE families
      SET total_budget = ?,
          total_budget_paise = ?,
          budget_updated_by_user_id = ?,
          updated_at = ?
      WHERE id = ?
    `);

    const result = stmt.run(normalizedBudget, budgetPaise, userId, now, familyId);
    if (result.changes === 0) {
      throw new Error('FAMILY_NOT_FOUND: Wedding workspace not found.');
    }

    return {
      totalBudget: normalizedBudget,
      totalBudgetPaise: budgetPaise,
      currency: 'INR',
      updatedAt: now,
      budgetUpdatedByUserId: userId,
    };
  }
}
