export * from './auth';

export type Language = 'en' | 'hi';

export type ExpenseCategory =
  | 'venue'
  | 'catering'
  | 'attire'
  | 'jewelry'
  | 'photography'
  | 'decor'
  | 'music_entertainment'
  | 'logistics_travel'
  | 'invitations_gifts'
  | 'miscellaneous';

export type PaymentStatus = 'paid' | 'pending' | 'partial';
export type PaymentMode = 'cash' | 'upi' | 'bank_transfer' | 'cheque' | 'card';

export interface Expense {
  id: string;
  title: string;
  amount: number;
  category: ExpenseCategory;
  date: string;
  paidBy: string;
  paidTo?: string;
  paymentMode: PaymentMode;
  status: PaymentStatus;
  notes?: string;
  side: 'groom' | 'bride' | 'mutual';
  receiptAttached?: boolean;
}

export interface BudgetItem {
  category: ExpenseCategory;
  allocatedAmount: number;
  spentAmount: number;
}

export type ShoppingStatus = 'to_buy' | 'in_tailoring' | 'purchased' | 'cancelled';

export interface ShoppingItem {
  id: string;
  title: string;
  category: 'bride' | 'groom' | 'family' | 'pooja_ceremony' | 'return_gifts' | 'other';
  estimatedPrice: number;
  actualPrice?: number;
  status: ShoppingStatus;
  assignedTo: string;
  storeName?: string;
  notes?: string;
  urgency: 'high' | 'medium' | 'low';
}

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
