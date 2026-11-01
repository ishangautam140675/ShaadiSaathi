export * from './auth';

export type Language = 'en' | 'hi';

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
  | 'other'
  | 'attire'
  | 'jewelry'
  | 'decor'
  | 'music_entertainment'
  | 'logistics_travel'
  | 'invitations_gifts'
  | 'miscellaneous';

export type PaymentStatus = 'paid' | 'partially_paid' | 'pending' | 'partial';
export type PaymentMethod = 'cash' | 'upi' | 'card' | 'bank_transfer' | 'other' | 'cheque';
export type PaymentMode = PaymentMethod;

export interface Expense {
  id: string;
  title: string;
  amount: number;
  amountPaise?: number;
  paidAmount?: number;
  paidAmountPaise?: number;
  outstandingBalance?: number;
  category: ExpenseCategory;
  date: string;
  paidBy: string;
  paidByName?: string;
  paidTo?: string;
  vendorName?: string | null;
  paymentMode: PaymentMode;
  paymentMethod?: PaymentMethod;
  status: PaymentStatus;
  paymentStatus?: PaymentStatus;
  notes?: string | null;
  side?: 'groom' | 'bride' | 'mutual';
  receiptAttached?: boolean;
}

export interface ExpenseEntity {
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
  paidByUserId?: string | null;
  vendorName?: string | null;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  notes?: string | null;
  side?: 'groom' | 'bride' | 'mutual' | string;
  createdByUserId: string;
  updatedByUserId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetItem {
  category: ExpenseCategory;
  allocatedAmount: number;
  spentAmount: number;
}

export interface ShoppingStatusItem {
  id: string;
  title: string;
  category: 'bride' | 'groom' | 'family' | 'pooja_ceremony' | 'return_gifts' | 'other';
  estimatedPrice: number;
  actualPrice?: number;
  status: 'to_buy' | 'in_tailoring' | 'purchased' | 'cancelled';
  assignedTo: string;
  storeName?: string;
  notes?: string;
  urgency: 'high' | 'medium' | 'low';
}

export type ShoppingStatus = 'to_buy' | 'in_tailoring' | 'purchased' | 'cancelled';
export type ShoppingItem = ShoppingStatusItem;

export interface Vendor {
  id: string;
  name: string;
  category: ExpenseCategory;
  contactPerson: string;
  phone: string;
  city: string;
  agreedAmount: number;
  advancePaid: number;
  balanceDue: number;
  dueDate: string;
  status: 'booked' | 'advance_paid' | 'fully_paid';
  notes?: string;
}

export interface ShagunGift {
  id: string;
  donorName: string;
  relation: string;
  side: 'groom' | 'bride' | 'mutual';
  giftType: 'cash' | 'gold_silver' | 'item';
  cashAmount?: number;
  itemDescription?: string;
  eventName: 'roka' | 'engagement' | 'sangeet' | 'haldi' | 'wedding' | 'reception';
  date: string;
  returnGiftNotes?: string;
  thankYouSent: boolean;
}

export type ChecklistPhase =
  | '6_months'
  | '3_months'
  | '1_month'
  | 'wedding_week'
  | 'day_of'
  | 'post_wedding';

export interface ChecklistTask {
  id: string;
  title: string;
  phase: ChecklistPhase;
  category: string;
  isCompleted: boolean;
  priority: 'high' | 'medium' | 'low';
  assignedTo: string;
  dueDate: string;
}

export interface WeddingSummary {
  brideName: string;
  groomName: string;
  weddingDate: string;
  totalBudget: number;
  currency: string;
  totalSpent: number;
  remainingBudget: number;
  totalPendingPayments: number;
  budgetUtilizationPct: number;
}

export interface FinancialSummaryData {
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
  categoryBreakdown: Array<{
    category: ExpenseCategory;
    totalAmount: number;
    totalAmountPaise: number;
    totalPaid: number;
    totalPaidPaise: number;
    totalOutstanding: number;
    totalOutstandingPaise: number;
    count: number;
    percentageOfTotal: number;
  }>;
  recentExpenses: ExpenseEntity[];
}
