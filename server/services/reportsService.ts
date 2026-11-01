import { type AppDatabase, getDatabase } from '../db/database.ts';

export interface CategoryReportItem {
  category: string;
  count: number;
  totalPaise: number;
  totalAmount: number;
  paidPaise: number;
  paidAmount: number;
  outstandingPaise: number;
  outstandingAmount: number;
  percentageOfBudget: number;
  percentageOfSpend: number;
}

export interface VendorReportItem {
  vendorId: string;
  vendorName: string;
  category: string;
  agreedPaise: number;
  agreedAmount: number;
  paidPaise: number;
  paidAmount: number;
  balancePaise: number;
  balanceAmount: number;
  status: string;
  paymentCount: number;
}

export interface DateRangeReportItem {
  period: string; // YYYY-MM
  expenseCount: number;
  totalPaise: number;
  totalAmount: number;
  paidPaise: number;
  paidAmount: number;
}

export interface ComprehensiveReportData {
  currency: string;
  asOfDate: string;
  budgetSummary: {
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
    budgetUtilization: number;
  };
  categories: CategoryReportItem[];
  vendors: VendorReportItem[];
  shopping: {
    totalItems: number;
    estimatedTotal: number;
    actualSpent: number;
    variance: number;
    purchasedCount: number;
    pendingCount: number;
  };
  checklist: {
    totalTasks: number;
    completedTasks: number;
    pendingTasks: number;
    completionPercentage: number;
  };
  shagunGifts: {
    totalCashShagun: number;
    cashEnvelopesCount: number;
    physicalGiftsCount: number;
    jewelleryGiftsCount: number;
    totalGiftsCount: number;
    brideSideAmount: number;
    groomSideAmount: number;
    mutualAmount: number;
  };
  monthlyTimeline: DateRangeReportItem[];
}

export class ReportsService {
  private appDb: AppDatabase;

  constructor(appDb?: AppDatabase) {
    this.appDb = appDb || getDatabase();
  }

  private getDb() {
    return this.appDb.getDb();
  }

  /**
   * Compute comprehensive database-backed wedding financial analytics
   */
  public getComprehensiveReport(
    familyId: string,
    filters?: { startDate?: string; endDate?: string }
  ): ComprehensiveReportData {
    const db = this.getDb();

    // 1. Family Budget
    const familyRow = db.prepare('SELECT total_budget_paise, total_budget FROM families WHERE id = ?').get(familyId) as any;
    const totalBudgetPaise = familyRow ? Number(familyRow.total_budget_paise || 0) : 0;
    const totalBudget = totalBudgetPaise / 100;

    // 2. Expenses Base Query (with optional date filtering)
    let dateFilterSql = '';
    const dateParams: any[] = [familyId];

    if (filters?.startDate && filters?.endDate) {
      dateFilterSql = 'AND date >= ? AND date <= ?';
      dateParams.push(filters.startDate, filters.endDate);
    } else if (filters?.startDate) {
      dateFilterSql = 'AND date >= ?';
      dateParams.push(filters.startDate);
    } else if (filters?.endDate) {
      dateFilterSql = 'AND date <= ?';
      dateParams.push(filters.endDate);
    }

    const expSummaryRow = db.prepare(`
      SELECT
        COALESCE(SUM(amount_paise), 0) AS total_committed_paise,
        COALESCE(SUM(paid_amount_paise), 0) AS total_paid_paise,
        COALESCE(SUM(amount_paise - paid_amount_paise), 0) AS total_outstanding_paise,
        COUNT(*) AS total_count
      FROM expenses
      WHERE family_id = ? ${dateFilterSql}
    `).get(...dateParams) as any;

    const totalCommittedPaise = Number(expSummaryRow.total_committed_paise || 0);
    const totalPaidPaise = Number(expSummaryRow.total_paid_paise || 0);
    const totalOutstandingPaise = Number(expSummaryRow.total_outstanding_paise || 0);

    const totalCommitted = totalCommittedPaise / 100;
    const totalPaid = totalPaidPaise / 100;
    const totalOutstanding = totalOutstandingPaise / 100;

    const remainingBudgetPaise = totalBudgetPaise - totalCommittedPaise;
    const remainingBudget = remainingBudgetPaise / 100;

    const cashRemainingPaise = totalBudgetPaise - totalPaidPaise;
    const cashRemaining = cashRemainingPaise / 100;

    const budgetUtilization = totalBudgetPaise > 0
      ? Math.round((totalCommittedPaise / totalBudgetPaise) * 1000) / 10
      : 0;

    // 3. Category Breakdown
    const catRows = db.prepare(`
      SELECT
        category,
        COUNT(*) AS count,
        COALESCE(SUM(amount_paise), 0) AS cat_total_paise,
        COALESCE(SUM(paid_amount_paise), 0) AS cat_paid_paise,
        COALESCE(SUM(amount_paise - paid_amount_paise), 0) AS cat_outstanding_paise
      FROM expenses
      WHERE family_id = ? ${dateFilterSql}
      GROUP BY category
      ORDER BY cat_total_paise DESC
    `).all(...dateParams) as any[];

    const categories: CategoryReportItem[] = catRows.map((r) => {
      const catTotalPaise = Number(r.cat_total_paise || 0);
      const catPaidPaise = Number(r.cat_paid_paise || 0);
      const catOutstandingPaise = Number(r.cat_outstanding_paise || 0);

      return {
        category: r.category,
        count: Number(r.count),
        totalPaise: catTotalPaise,
        totalAmount: catTotalPaise / 100,
        paidPaise: catPaidPaise,
        paidAmount: catPaidPaise / 100,
        outstandingPaise: catOutstandingPaise,
        outstandingAmount: catOutstandingPaise / 100,
        percentageOfBudget: totalBudgetPaise > 0 ? Math.round((catTotalPaise / totalBudgetPaise) * 1000) / 10 : 0,
        percentageOfSpend: totalCommittedPaise > 0 ? Math.round((catTotalPaise / totalCommittedPaise) * 1000) / 10 : 0,
      };
    });

    // 4. Vendor Breakdown
    const vendorRows = db.prepare(`
      SELECT
        v.id,
        v.name,
        v.category,
        v.agreed_amount_paise,
        v.paid_amount_paise,
        v.balance_due_paise,
        v.status,
        (SELECT COUNT(*) FROM vendor_payments vp WHERE vp.vendor_id = v.id) AS payment_count
      FROM vendors v
      WHERE v.family_id = ?
      ORDER BY v.agreed_amount_paise DESC
    `).all(familyId) as any[];

    const vendors: VendorReportItem[] = vendorRows.map((v) => ({
      vendorId: v.id,
      vendorName: v.name,
      category: v.category,
      agreedPaise: Number(v.agreed_amount_paise || 0),
      agreedAmount: Number(v.agreed_amount_paise || 0) / 100,
      paidPaise: Number(v.paid_amount_paise || 0),
      paidAmount: Number(v.paid_amount_paise || 0) / 100,
      balancePaise: Number(v.balance_due_paise || 0),
      balanceAmount: Number(v.balance_due_paise || 0) / 100,
      status: v.status,
      paymentCount: Number(v.payment_count || 0),
    }));

    // 5. Shopping Register Summary
    const shopSummaryRow = db.prepare(`
      SELECT
        COUNT(*) AS total_items,
        COALESCE(SUM(estimated_price_paise), 0) AS estimated_total_paise,
        COALESCE(SUM(actual_price_paise), 0) AS actual_spent_paise,
        COALESCE(SUM(CASE WHEN status = 'purchased' THEN 1 ELSE 0 END), 0) AS purchased_count,
        COALESCE(SUM(CASE WHEN status != 'purchased' THEN 1 ELSE 0 END), 0) AS pending_count
      FROM shopping_items
      WHERE family_id = ?
    `).get(familyId) as any;

    const estTotal = Number(shopSummaryRow.estimated_total_paise || 0) / 100;
    const actSpent = Number(shopSummaryRow.actual_spent_paise || 0) / 100;

    // 6. Checklist Tasks Summary
    const taskSummaryRow = db.prepare(`
      SELECT
        COUNT(*) AS total_tasks,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0) AS completed_tasks,
        COALESCE(SUM(CASE WHEN status != 'completed' THEN 1 ELSE 0 END), 0) AS pending_tasks
      FROM checklist_tasks
      WHERE family_id = ?
    `).get(familyId) as any;

    const totalTasks = Number(taskSummaryRow.total_tasks || 0);
    const completedTasks = Number(taskSummaryRow.completed_tasks || 0);
    const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // 7. Shagun & Gifts Summary (Strictly Decoupled)
    const giftsSummaryRow = db.prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN gift_type IN ('cash', 'shagun') THEN amount_paise ELSE 0 END), 0) AS total_cash_paise,
        COALESCE(SUM(CASE WHEN gift_type IN ('cash', 'shagun') THEN 1 ELSE 0 END), 0) AS cash_count,
        COALESCE(SUM(CASE WHEN gift_type = 'physical_gift' THEN 1 ELSE 0 END), 0) AS physical_count,
        COALESCE(SUM(CASE WHEN gift_type = 'jewellery' THEN 1 ELSE 0 END), 0) AS jewellery_count,
        COUNT(*) AS total_gifts_count,
        COALESCE(SUM(CASE WHEN side = 'bride' THEN amount_paise ELSE 0 END), 0) AS bride_cash_paise,
        COALESCE(SUM(CASE WHEN side = 'groom' THEN amount_paise ELSE 0 END), 0) AS groom_cash_paise,
        COALESCE(SUM(CASE WHEN side = 'mutual' THEN amount_paise ELSE 0 END), 0) AS mutual_cash_paise
      FROM gifts_shagun
      WHERE family_id = ?
    `).get(familyId) as any;

    // 8. Monthly Timeline Breakdown
    const monthlyRows = db.prepare(`
      SELECT
        substr(date, 1, 7) AS period,
        COUNT(*) AS expense_count,
        COALESCE(SUM(amount_paise), 0) AS total_paise,
        COALESCE(SUM(paid_amount_paise), 0) AS paid_paise
      FROM expenses
      WHERE family_id = ? ${dateFilterSql}
      GROUP BY substr(date, 1, 7)
      ORDER BY period ASC
    `).all(...dateParams) as any[];

    const monthlyTimeline: DateRangeReportItem[] = monthlyRows.map((m) => ({
      period: m.period,
      expenseCount: Number(m.expense_count),
      totalPaise: Number(m.total_paise),
      totalAmount: Number(m.total_paise) / 100,
      paidPaise: Number(m.paid_paise),
      paidAmount: Number(m.paid_paise) / 100,
    }));

    return {
      currency: 'INR',
      asOfDate: new Date().toISOString(),
      budgetSummary: {
        totalBudget,
        totalBudgetPaise,
        totalCommitted,
        totalCommittedPaise,
        totalPaid,
        totalPaidPaise,
        totalOutstanding,
        totalOutstandingPaise,
        remainingBudget,
        remainingBudgetPaise,
        cashRemaining,
        cashRemainingPaise,
        budgetUtilization,
      },
      categories,
      vendors,
      shopping: {
        totalItems: Number(shopSummaryRow.total_items || 0),
        estimatedTotal: estTotal,
        actualSpent: actSpent,
        variance: estTotal - actSpent,
        purchasedCount: Number(shopSummaryRow.purchased_count || 0),
        pendingCount: Number(shopSummaryRow.pending_count || 0),
      },
      checklist: {
        totalTasks,
        completedTasks,
        pendingTasks: Number(taskSummaryRow.pending_tasks || 0),
        completionPercentage,
      },
      shagunGifts: {
        totalCashShagun: Number(giftsSummaryRow.total_cash_paise || 0) / 100,
        cashEnvelopesCount: Number(giftsSummaryRow.cash_count || 0),
        physicalGiftsCount: Number(giftsSummaryRow.physical_count || 0),
        jewelleryGiftsCount: Number(giftsSummaryRow.jewellery_count || 0),
        totalGiftsCount: Number(giftsSummaryRow.total_gifts_count || 0),
        brideSideAmount: Number(giftsSummaryRow.bride_cash_paise || 0) / 100,
        groomSideAmount: Number(giftsSummaryRow.groom_cash_paise || 0) / 100,
        mutualAmount: Number(giftsSummaryRow.mutual_cash_paise || 0) / 100,
      },
      monthlyTimeline,
    };
  }
}

export const reportsService = new ReportsService();
