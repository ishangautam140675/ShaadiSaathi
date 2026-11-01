import React, { createContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useWedding } from './useWedding';
import { useAuth } from './useAuth';
import type {
  Expense,
  ExpenseEntity,
  BudgetItem,
  ShoppingItem,
  Vendor,
  ShagunGift,
  ChecklistTask,
  WeddingSummary,
  FinancialSummaryData,
} from '../types';
import {
  INITIAL_WEDDING_SUMMARY,
  MOCK_BUDGET_CATEGORIES,
  MOCK_EXPENSES,
  MOCK_SHOPPING_ITEMS,
  MOCK_VENDORS,
  MOCK_SHAGUN_GIFTS,
  MOCK_CHECKLIST_TASKS,
} from '../data/mockData';

export interface WeddingContextType {
  // Mode toggle
  isPreviewMode: boolean;
  togglePreviewMode: () => void;
  setPreviewMode: (enabled: boolean) => void;

  // Data
  summary: WeddingSummary;
  financialSummary: FinancialSummaryData | null;
  budgetCategories: BudgetItem[];
  expenses: (Expense | ExpenseEntity)[];
  shoppingItems: ShoppingItem[];
  vendors: Vendor[];
  shagunGifts: ShagunGift[];
  checklistTasks: ChecklistTask[];

  // Loading & State
  isLoadingFinancials: boolean;
  financialError: string | null;

  // Mutations
  addExpense: (expense: any) => Promise<any>;
  updateExpense: (id: string, expense: any) => Promise<any>;
  deleteExpense: (id: string) => Promise<boolean>;
  updateBudget: (newBudget: number) => Promise<any>;
  refreshFinancials: () => Promise<void>;

  addShoppingItem: (item: Omit<ShoppingItem, 'id'>) => ShoppingItem;
  addVendor: (vendor: Omit<Vendor, 'id'>) => Vendor;
  addShagunGift: (gift: Omit<ShagunGift, 'id'>) => ShagunGift;
  addChecklistTask: (task: Omit<ChecklistTask, 'id'>) => ChecklistTask;
  toggleTaskCompletion: (taskId: string) => void;

  // Helper notice state
  lastActionMessage: string | null;
  clearActionMessage: () => void;
}

export const WeddingContext = createContext<WeddingContextType | undefined>(undefined);

export const WeddingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();

  // Mode: if authenticated, default preview mode to false (real live database)
  const [isPreviewMode, setIsPreviewMode] = useState<boolean>(!isAuthenticated);

  // When user logs in/out, synchronize preview mode
  useEffect(() => {
    if (isAuthenticated) {
      setIsPreviewMode(false);
    }
  }, [isAuthenticated]);

  // Real backend state
  const [persistedExpenses, setPersistedExpenses] = useState<ExpenseEntity[]>([]);
  const [financialSummary, setFinancialSummary] = useState<FinancialSummaryData | null>(null);
  const [persistedBudget, setPersistedBudget] = useState<number>(2500000);
  const [isLoadingFinancials, setIsLoadingFinancials] = useState<boolean>(false);
  const [financialError, setFinancialError] = useState<string | null>(null);

  // In-memory states for Phase 1 demo mode
  const [mockExpenses, setMockExpenses] = useState<Expense[]>(MOCK_EXPENSES);
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>(MOCK_SHOPPING_ITEMS);
  const [vendors, setVendors] = useState<Vendor[]>(MOCK_VENDORS);
  const [shagunGifts, setShagunGifts] = useState<ShagunGift[]>(MOCK_SHAGUN_GIFTS);
  const [checklistTasks, setChecklistTasks] = useState<ChecklistTask[]>(MOCK_CHECKLIST_TASKS);
  const [lastActionMessage, setLastActionMessage] = useState<string | null>(null);

  const getAuthHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    try {
      const token = localStorage.getItem('shaadisaathi_session_token');
      if (token) headers['Authorization'] = `Bearer ${token}`;
    } catch {
      // Storage restricted
    }
    return headers;
  };

  // Refresh Real Database Financials
  const refreshFinancials = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      setIsLoadingFinancials(true);
      setFinancialError(null);

      // 1. Fetch Budget
      const budgetRes = await fetch('/api/budget', { headers: getAuthHeaders() });
      if (budgetRes.ok) {
        const budgetData = await budgetRes.json();
        setPersistedBudget(budgetData.totalBudget);
      }

      // 2. Fetch Expenses Summary
      const summaryRes = await fetch('/api/expenses/summary', { headers: getAuthHeaders() });
      if (summaryRes.ok) {
        const summaryData = await summaryRes.json();
        setFinancialSummary(summaryData);
      }

      // 3. Fetch Expenses List
      const listRes = await fetch('/api/expenses?limit=100', { headers: getAuthHeaders() });
      if (listRes.ok) {
        const listData = await listRes.json();
        setPersistedExpenses(listData.expenses || []);
      }
    } catch (err: any) {
      setFinancialError(err.message || 'Failed to load financial records.');
    } finally {
      setIsLoadingFinancials(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      refreshFinancials();
    }
  }, [isAuthenticated, refreshFinancials]);

  const togglePreviewMode = () => {
    setIsPreviewMode((prev) => !prev);
  };

  const setPreviewMode = (enabled: boolean) => {
    setIsPreviewMode(enabled);
  };

  const clearActionMessage = () => {
    setLastActionMessage(null);
  };

  // Real Add Expense
  const addExpense = async (newExp: any): Promise<any> => {
    if (isAuthenticated && !isPreviewMode) {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(newExp),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to record expense in database.');
      }

      await refreshFinancials();
      setLastActionMessage('Expense successfully recorded to database.');
      return data.expense;
    } else {
      // Mock mode fallback
      const created: Expense = {
        ...newExp,
        id: `exp-${Date.now()}`,
        paymentMode: newExp.paymentMethod || 'upi',
        status: newExp.paymentStatus || 'paid',
        paidBy: newExp.paidByName || 'Family Member',
      };
      setMockExpenses((prev) => [created, ...prev]);
      setLastActionMessage('Expense saved to session preview.');
      return created;
    }
  };

  // Real Update Expense
  const updateExpense = async (id: string, updatedData: any): Promise<any> => {
    if (isAuthenticated && !isPreviewMode) {
      const res = await fetch(`/api/expenses/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updatedData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to update expense.');
      }

      await refreshFinancials();
      setLastActionMessage('Expense updated in database.');
      return data.expense;
    } else {
      setMockExpenses((prev) =>
        prev.map((e) => (e.id === id ? { ...e, ...updatedData } : e))
      );
      setLastActionMessage('Expense updated in preview session.');
      return updatedData;
    }
  };

  // Real Delete Expense
  const deleteExpense = async (id: string): Promise<boolean> => {
    if (isAuthenticated && !isPreviewMode) {
      const res = await fetch(`/api/expenses/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to delete expense.');
      }

      await refreshFinancials();
      setLastActionMessage('Expense removed from database.');
      return true;
    } else {
      setMockExpenses((prev) => prev.filter((e) => e.id !== id));
      setLastActionMessage('Expense removed from preview session.');
      return true;
    }
  };

  // Real Update Budget
  const updateBudget = async (newBudget: number): Promise<any> => {
    if (isAuthenticated && !isPreviewMode) {
      const res = await fetch('/api/budget', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ totalBudget: newBudget }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to update wedding budget.');
      }

      setPersistedBudget(data.budget.totalBudget);
      await refreshFinancials();
      setLastActionMessage('Wedding budget updated successfully.');
      return data.budget;
    } else {
      setPersistedBudget(newBudget);
      setLastActionMessage('Budget updated in preview.');
      return { totalBudget: newBudget };
    }
  };

  // Add Shopping Item
  const addShoppingItem = (newItem: Omit<ShoppingItem, 'id'>): ShoppingItem => {
    const created: ShoppingItem = {
      ...newItem,
      id: `shop-${Date.now()}`,
    };
    setShoppingItems((prev) => [created, ...prev]);
    setLastActionMessage('Shopping item saved in local session!');
    return created;
  };

  // Add Vendor
  const addVendor = (newVendor: Omit<Vendor, 'id'>): Vendor => {
    const created: Vendor = {
      ...newVendor,
      id: `ven-${Date.now()}`,
    };
    setVendors((prev) => [created, ...prev]);
    setLastActionMessage('Vendor added to local session!');
    return created;
  };

  // Add Shagun
  const addShagunGift = (newGift: Omit<ShagunGift, 'id'>): ShagunGift => {
    const created: ShagunGift = {
      ...newGift,
      id: `shagun-${Date.now()}`,
    };
    setShagunGifts((prev) => [created, ...prev]);
    setLastActionMessage('Shagun recorded in local session!');
    return created;
  };

  // Add Task
  const addChecklistTask = (newTask: Omit<ChecklistTask, 'id'>): ChecklistTask => {
    const created: ChecklistTask = {
      ...newTask,
      id: `task-${Date.now()}`,
    };
    setChecklistTasks((prev) => [created, ...prev]);
    setLastActionMessage('Task added to local session!');
    return created;
  };

  // Toggle Task Completion
  const toggleTaskCompletion = (taskId: string) => {
    setChecklistTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, isCompleted: !t.isCompleted } : t))
    );
  };

  // Active Expenses depending on mode
  const activeExpenses: (Expense | ExpenseEntity)[] = useMemo(() => {
    if (isPreviewMode) {
      return mockExpenses;
    }
    return persistedExpenses;
  }, [isPreviewMode, mockExpenses, persistedExpenses]);

  const activeShopping = useMemo(() => (isPreviewMode ? shoppingItems : []), [isPreviewMode, shoppingItems]);
  const activeVendors = useMemo(() => (isPreviewMode ? vendors : []), [isPreviewMode, vendors]);
  const activeShagun = useMemo(() => (isPreviewMode ? shagunGifts : []), [isPreviewMode, shagunGifts]);
  const activeChecklist = useMemo(() => (isPreviewMode ? checklistTasks : []), [isPreviewMode, checklistTasks]);

  // Derived financial summary
  const summary: WeddingSummary = useMemo(() => {
    if (isPreviewMode) {
      const totalSpent = mockExpenses.reduce(
        (sum, e) => sum + (e.status === 'paid' ? e.amount : 0),
        0
      );
      const totalPending = vendors.reduce((sum, v) => sum + v.balanceDue, 0);
      const totalBudget = INITIAL_WEDDING_SUMMARY.totalBudget;
      const remaining = totalBudget - totalSpent;
      const utilization = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

      return {
        ...INITIAL_WEDDING_SUMMARY,
        totalSpent,
        remainingBudget: remaining,
        totalPendingPayments: totalPending,
        budgetUtilizationPct: Number(utilization.toFixed(1)),
      };
    }

    if (financialSummary) {
      return {
        brideName: user?.name ? `${user.name}'s Wedding` : 'Wedding Sanctuary',
        groomName: '',
        weddingDate: '',
        totalBudget: financialSummary.totalBudget,
        currency: 'INR',
        totalSpent: financialSummary.totalPaid,
        remainingBudget: financialSummary.remainingBudget,
        totalPendingPayments: financialSummary.totalOutstanding,
        budgetUtilizationPct: financialSummary.budgetUtilizationPercentage,
      };
    }

    return {
      brideName: 'Wedding Sanctuary',
      groomName: '',
      weddingDate: '',
      totalBudget: persistedBudget,
      currency: 'INR',
      totalSpent: 0,
      remainingBudget: persistedBudget,
      totalPendingPayments: 0,
      budgetUtilizationPct: 0,
    };
  }, [isPreviewMode, mockExpenses, vendors, financialSummary, user, persistedBudget]);

  // Category breakdown
  const budgetCategories: BudgetItem[] = useMemo(() => {
    if (isPreviewMode) {
      return MOCK_BUDGET_CATEGORIES.map((cat) => {
        const categorySpent = mockExpenses
          .filter((e) => e.category === cat.category)
          .reduce((sum, e) => sum + e.amount, 0);
        return {
          ...cat,
          spentAmount: categorySpent,
        };
      });
    }

    if (financialSummary?.categoryBreakdown) {
      return financialSummary.categoryBreakdown.map((c) => ({
        category: c.category,
        allocatedAmount: 0,
        spentAmount: c.totalAmount,
      }));
    }

    return [];
  }, [isPreviewMode, mockExpenses, financialSummary]);

  return (
    <WeddingContext.Provider
      value={{
        isPreviewMode,
        togglePreviewMode,
        setPreviewMode,
        summary,
        financialSummary,
        budgetCategories,
        expenses: activeExpenses,
        shoppingItems: activeShopping,
        vendors: activeVendors,
        shagunGifts: activeShagun,
        checklistTasks: activeChecklist,
        isLoadingFinancials,
        financialError,
        addExpense,
        updateExpense,
        deleteExpense,
        updateBudget,
        refreshFinancials,
        addShoppingItem,
        addVendor,
        addShagunGift,
        addChecklistTask,
        toggleTaskCompletion,
        lastActionMessage,
        clearActionMessage,
      }}
    >
      {children}
    </WeddingContext.Provider>
  );
};

export { useWedding };
