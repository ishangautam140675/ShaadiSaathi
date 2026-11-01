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

export interface VendorPayment {
  id: string;
  vendorId: string;
  amount: number;
  amountPaise: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  transactionReference?: string;
  notes?: string;
  linkedExpenseId?: string;
  recordedByUserId: string;
  createdAt: string;
}

export interface Vendor {
  id: string;
  name: string;
  category: ExpenseCategory;
  contactPerson: string;
  phone: string;
  email?: string;
  city: string;
  address?: string;
  agreedAmount: number;
  agreedAmountPaise?: number;
  advancePaid: number;
  paidAmount?: number;
  paidAmountPaise?: number;
  balanceDue: number;
  balanceDuePaise?: number;
  dueDate: string;
  status: 'booked' | 'advance_paid' | 'fully_paid' | 'in_negotiation' | 'cancelled';
  eventName?: string;
  notes?: string;
  payments?: VendorPayment[];
  createdByUserId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type VendorEntity = Vendor;

export interface VendorSummaryData {
  totalContracted: number;
  totalContractedPaise: number;
  totalPaid: number;
  totalPaidPaise: number;
  totalBalanceDue: number;
  totalBalanceDuePaise: number;
  vendorCount: number;
}

export interface ShoppingStatusItem {
  id: string;
  title: string;
  name?: string; // alias
  category: string;
  description?: string;
  estimatedPrice: number;
  estimatedPricePaise?: number;
  actualPrice?: number;
  actualPricePaise?: number;
  quantity?: number;
  status: 'to_buy' | 'in_tailoring' | 'purchased' | 'cancelled' | 'planned';
  assignedTo: string;
  storeName?: string;
  notes?: string;
  urgency?: 'high' | 'medium' | 'low' | 'urgent';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  deadline?: string;
  isOverdue?: boolean;
}

export type ShoppingStatus = 'to_buy' | 'in_tailoring' | 'purchased' | 'cancelled' | 'planned';
export type ShoppingItem = ShoppingStatusItem;
export type ShoppingItemEntity = ShoppingItem;

export interface ShoppingSummaryData {
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

export interface ShagunGift {
  id: string;
  donorName: string;
  giverName?: string; // alias
  relation: string;
  side: 'groom' | 'bride' | 'mutual';
  giftType: 'cash' | 'gold_silver' | 'item' | 'shagun' | 'physical_gift' | 'jewellery' | 'other';
  cashAmount?: number;
  amount?: number; // alias
  amountPaise?: number;
  itemDescription?: string;
  description?: string; // alias
  eventName?: string;
  date?: string;
  dateReceived?: string; // alias
  recipient?: string;
  returnGiftNotes?: string;
  thankYouSent?: boolean;
  notes?: string;
}

export type GiftEntity = ShagunGift;

export interface GiftsSummaryData {
  totalCashShagun: number;
  totalCashShagunPaise: number;
  cashEnvelopesCount: number;
  physicalGiftsCount: number;
  jewelleryGiftsCount: number;
  totalGiftsCount: number;
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
  status?: 'pending' | 'completed';
  priority: 'high' | 'medium' | 'low' | 'urgent';
  assignedTo: string;
  dueDate: string;
  notes?: string;
  completedAt?: string;
}

export type ChecklistTaskEntity = ChecklistTask;

export interface ChecklistSummaryData {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  completionPercentage: number;
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
