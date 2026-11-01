import React, { createContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from './useAuth';
import type {
  Expense,
  ExpenseEntity,
  BudgetItem,
  ShoppingItem,
  ShoppingItemEntity,
  ShoppingSummaryData,
  Vendor,
  VendorEntity,
  VendorSummaryData,
  ShagunGift,
  GiftEntity,
  GiftsSummaryData,
  ChecklistTask,
  ChecklistTaskEntity,
  ChecklistSummaryData,
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
  shoppingItems: (ShoppingItem | ShoppingItemEntity)[];
  vendors: (Vendor | VendorEntity)[];
  shagunGifts: (ShagunGift | GiftEntity)[];
  checklistTasks: (ChecklistTask | ChecklistTaskEntity)[];

  // Summaries
  vendorSummary: VendorSummaryData | null;
  shoppingSummary: ShoppingSummaryData | null;
  giftsSummary: GiftsSummaryData | null;
  checklistSummary: ChecklistSummaryData | null;

  // Loading & State
  isLoadingFinancials: boolean;
  financialError: string | null;

  // Phase 3 Mutations
  addExpense: (expense: any) => Promise<any>;
  updateExpense: (id: string, expense: any) => Promise<any>;
  deleteExpense: (id: string) => Promise<boolean>;
  updateBudget: (newBudget: number) => Promise<any>;
  refreshFinancials: () => Promise<void>;

  // Phase 4 Vendor Mutations
  addVendor: (vendor: any) => Promise<any>;
  updateVendor: (id: string, vendor: any) => Promise<any>;
  deleteVendor: (id: string) => Promise<boolean>;
  addVendorPayment: (vendorId: string, payment: any) => Promise<any>;
  deleteVendorPayment: (vendorId: string, paymentId: string) => Promise<boolean>;

  // Phase 4 Shopping Mutations
  addShoppingItem: (item: any) => Promise<any>;
  updateShoppingItem: (id: string, item: any) => Promise<any>;
  deleteShoppingItem: (id: string) => Promise<boolean>;

  // Phase 4 Gifts & Shagun Mutations
  addShagunGift: (gift: any) => Promise<any>;
  updateShagunGift: (id: string, gift: any) => Promise<any>;
  deleteShagunGift: (id: string) => Promise<boolean>;

  // Phase 4 Checklist Mutations
  addChecklistTask: (task: any) => Promise<any>;
  updateChecklistTask: (id: string, task: any) => Promise<any>;
  toggleTaskCompletion: (taskId: string) => Promise<void>;
  deleteChecklistTask: (id: string) => Promise<boolean>;

  // Refresh all Phase 4 modules
  refreshModules: () => Promise<void>;

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

  // Real backend states
  const [persistedExpenses, setPersistedExpenses] = useState<ExpenseEntity[]>([]);
  const [financialSummary, setFinancialSummary] = useState<FinancialSummaryData | null>(null);
  const [persistedBudget, setPersistedBudget] = useState<number>(2500000);
  const [isLoadingFinancials, setIsLoadingFinancials] = useState<boolean>(false);
  const [financialError, setFinancialError] = useState<string | null>(null);

  // Phase 4 Persisted states
  const [persistedVendors, setPersistedVendors] = useState<VendorEntity[]>([]);
  const [vendorSummary, setVendorSummary] = useState<VendorSummaryData | null>(null);

  const [persistedShopping, setPersistedShopping] = useState<ShoppingItemEntity[]>([]);
  const [shoppingSummary, setShoppingSummary] = useState<ShoppingSummaryData | null>(null);

  const [persistedGifts, setPersistedGifts] = useState<GiftEntity[]>([]);
  const [giftsSummary, setGiftsSummary] = useState<GiftsSummaryData | null>(null);

  const [persistedChecklist, setPersistedChecklist] = useState<ChecklistTaskEntity[]>([]);
  const [checklistSummary, setChecklistSummary] = useState<ChecklistSummaryData | null>(null);

  // In-memory states for Phase 1 demo mode
  const [mockExpenses, setMockExpenses] = useState<Expense[]>(MOCK_EXPENSES);
  const [mockShopping, setMockShopping] = useState<ShoppingItem[]>(MOCK_SHOPPING_ITEMS);
  const [mockVendors, setMockVendors] = useState<Vendor[]>(MOCK_VENDORS);
  const [mockGifts, setMockGifts] = useState<ShagunGift[]>(MOCK_SHAGUN_GIFTS);
  const [mockChecklist, setMockChecklist] = useState<ChecklistTask[]>(MOCK_CHECKLIST_TASKS);
  const [lastActionMessage, setLastActionMessage] = useState<string | null>(null);

  const getAuthHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    try {
      const token = localStorage.getItem('shaadisaathi_session_token');
      if (token) headers['Authorization'] = `Bearer ${token}`;
    } catch {
      // Storage restricted
    }
    return headers;
  }, []);

  // Refresh Real Database Financials (Phase 3)
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

      // 3. Fetch Full Expenses List
      const expensesRes = await fetch('/api/expenses?limit=100', { headers: getAuthHeaders() });
      if (expensesRes.ok) {
        const expData = await expensesRes.json();
        setPersistedExpenses(expData.expenses || []);
      }
    } catch (err: any) {
      setFinancialError(err.message || 'Failed to load financial records.');
    } finally {
      setIsLoadingFinancials(false);
    }
  }, [isAuthenticated, getAuthHeaders]);

  // Refresh All Phase 4 Modules
  const refreshModules = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const headers = getAuthHeaders();

      // 1. Vendors
      const [vListRes, vSumRes] = await Promise.all([
        fetch('/api/vendors', { headers }),
        fetch('/api/vendors/summary', { headers }),
      ]);
      if (vListRes.ok) {
        const vData = await vListRes.json();
        setPersistedVendors(vData.vendors || []);
      }
      if (vSumRes.ok) {
        const vSumData = await vSumRes.json();
        setVendorSummary(vSumData);
      }

      // 2. Shopping
      const [sListRes, sSumRes] = await Promise.all([
        fetch('/api/shopping', { headers }),
        fetch('/api/shopping/summary', { headers }),
      ]);
      if (sListRes.ok) {
        const sData = await sListRes.json();
        setPersistedShopping(sData.items || []);
      }
      if (sSumRes.ok) {
        const sSumData = await sSumRes.json();
        setShoppingSummary(sSumData);
      }

      // 3. Gifts
      const [gListRes, gSumRes] = await Promise.all([
        fetch('/api/gifts', { headers }),
        fetch('/api/gifts/summary', { headers }),
      ]);
      if (gListRes.ok) {
        const gData = await gListRes.json();
        setPersistedGifts(gData.gifts || []);
      }
      if (gSumRes.ok) {
        const gSumData = await gSumRes.json();
        setGiftsSummary(gSumData);
      }

      // 4. Checklist
      const [cListRes, cSumRes] = await Promise.all([
        fetch('/api/checklist', { headers }),
        fetch('/api/checklist/summary', { headers }),
      ]);
      if (cListRes.ok) {
        const cData = await cListRes.json();
        setPersistedChecklist(cData.tasks || []);
      }
      if (cSumRes.ok) {
        const cSumData = await cSumRes.json();
        setChecklistSummary(cSumData);
      }
    } catch {
      // Non-fatal background fetch
    }
  }, [isAuthenticated, getAuthHeaders]);

  // Initial fetch when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      refreshFinancials();
      refreshModules();
    }
  }, [isAuthenticated, refreshFinancials, refreshModules]);

  const togglePreviewMode = () => {
    setIsPreviewMode((prev) => !prev);
  };

  const setPreviewMode = (enabled: boolean) => {
    setIsPreviewMode(enabled);
  };

  const clearActionMessage = () => {
    setLastActionMessage(null);
  };

  // --- Phase 3 Mutations ---
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

  // --- Phase 4 Vendor Mutations ---
  const addVendor = async (newVendor: any): Promise<any> => {
    if (isAuthenticated && !isPreviewMode) {
      const res = await fetch('/api/vendors', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(newVendor),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to register vendor.');
      }
      await refreshModules();
      if (newVendor.recordAdvanceInExpenses) {
        await refreshFinancials();
      }
      setLastActionMessage('Vendor successfully registered in database.');
      return data.vendor;
    } else {
      const created: Vendor = {
        ...newVendor,
        id: `ven-${Date.now()}`,
        balanceDue: Math.max(0, newVendor.agreedAmount - (newVendor.advancePaid || 0)),
        status: (newVendor.advancePaid || 0) >= newVendor.agreedAmount
          ? 'fully_paid'
          : (newVendor.advancePaid || 0) > 0 ? 'advance_paid' : 'booked',
      };
      setMockVendors((prev) => [created, ...prev]);
      setLastActionMessage('Vendor added to local preview.');
      return created;
    }
  };

  const updateVendor = async (id: string, updatedData: any): Promise<any> => {
    if (isAuthenticated && !isPreviewMode) {
      const res = await fetch(`/api/vendors/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updatedData),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to update vendor.');
      }
      await refreshModules();
      setLastActionMessage('Vendor updated successfully.');
      return data.vendor;
    } else {
      setMockVendors((prev) =>
        prev.map((v) => (v.id === id ? { ...v, ...updatedData } : v))
      );
      setLastActionMessage('Vendor updated in preview.');
      return updatedData;
    }
  };

  const deleteVendor = async (id: string): Promise<boolean> => {
    if (isAuthenticated && !isPreviewMode) {
      const res = await fetch(`/api/vendors/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to delete vendor.');
      }
      await refreshModules();
      setLastActionMessage('Vendor removed from database.');
      return true;
    } else {
      setMockVendors((prev) => prev.filter((v) => v.id !== id));
      setLastActionMessage('Vendor removed from preview.');
      return true;
    }
  };

  const addVendorPayment = async (vendorId: string, payment: any): Promise<any> => {
    if (isAuthenticated && !isPreviewMode) {
      const res = await fetch(`/api/vendors/${vendorId}/payments`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payment),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to log vendor payment.');
      }
      await refreshModules();
      if (payment.recordInExpenses) {
        await refreshFinancials();
      }
      setLastActionMessage('Vendor payment logged successfully.');
      return data.payment;
    } else {
      setMockVendors((prev) =>
        prev.map((v) => {
          if (v.id === vendorId) {
            const newPaid = (v.advancePaid || 0) + Number(payment.amount);
            const newBalance = Math.max(0, v.agreedAmount - newPaid);
            return {
              ...v,
              advancePaid: newPaid,
              balanceDue: newBalance,
              status: newBalance === 0 ? 'fully_paid' : 'advance_paid',
            };
          }
          return v;
        })
      );
      setLastActionMessage('Vendor payment logged in preview.');
      return payment;
    }
  };

  const deleteVendorPayment = async (vendorId: string, paymentId: string): Promise<boolean> => {
    if (isAuthenticated && !isPreviewMode) {
      const res = await fetch(`/api/vendors/${vendorId}/payments/${paymentId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to delete vendor payment.');
      }
      await refreshModules();
      await refreshFinancials();
      return true;
    }
    return true;
  };

  // --- Phase 4 Shopping Mutations ---
  const addShoppingItem = async (newItem: any): Promise<any> => {
    if (isAuthenticated && !isPreviewMode) {
      const res = await fetch('/api/shopping', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(newItem),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to record shopping item.');
      }
      await refreshModules();
      setLastActionMessage('Shopping item recorded in database.');
      return data.item;
    } else {
      const created: ShoppingItem = {
        ...newItem,
        id: `shop-${Date.now()}`,
        status: newItem.status || 'planned',
      };
      setMockShopping((prev) => [created, ...prev]);
      setLastActionMessage('Shopping item saved in local preview.');
      return created;
    }
  };

  const updateShoppingItem = async (id: string, updatedData: any): Promise<any> => {
    if (isAuthenticated && !isPreviewMode) {
      const res = await fetch(`/api/shopping/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updatedData),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to update shopping item.');
      }
      await refreshModules();
      setLastActionMessage('Shopping item updated.');
      return data.item;
    } else {
      setMockShopping((prev) =>
        prev.map((i) => (i.id === id ? { ...i, ...updatedData } : i))
      );
      setLastActionMessage('Shopping item updated in preview.');
      return updatedData;
    }
  };

  const deleteShoppingItem = async (id: string): Promise<boolean> => {
    if (isAuthenticated && !isPreviewMode) {
      const res = await fetch(`/api/shopping/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to remove shopping item.');
      }
      await refreshModules();
      setLastActionMessage('Shopping item removed.');
      return true;
    } else {
      setMockShopping((prev) => prev.filter((i) => i.id !== id));
      setLastActionMessage('Shopping item removed from preview.');
      return true;
    }
  };

  // --- Phase 4 Gifts & Shagun Mutations ---
  const addShagunGift = async (newGift: any): Promise<any> => {
    if (isAuthenticated && !isPreviewMode) {
      const res = await fetch('/api/gifts', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(newGift),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to record gift / shagun.');
      }
      await refreshModules();
      setLastActionMessage('Gift / Shagun recorded to sacred ledger.');
      return data.gift;
    } else {
      const created: ShagunGift = {
        ...newGift,
        id: `shagun-${Date.now()}`,
        donorName: newGift.donorName || newGift.giverName || 'Family Relative',
        eventName: newGift.eventName || 'wedding',
        date: newGift.date || new Date().toISOString().split('T')[0],
        thankYouSent: Boolean(newGift.thankYouSent),
      };
      setMockGifts((prev) => [created, ...prev]);
      setLastActionMessage('Shagun recorded in local preview.');
      return created;
    }
  };

  const updateShagunGift = async (id: string, updatedData: any): Promise<any> => {
    if (isAuthenticated && !isPreviewMode) {
      const res = await fetch(`/api/gifts/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updatedData),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to update gift record.');
      }
      await refreshModules();
      setLastActionMessage('Gift record updated.');
      return data.gift;
    } else {
      setMockGifts((prev) =>
        prev.map((g) => (g.id === id ? { ...g, ...updatedData } : g))
      );
      setLastActionMessage('Gift updated in preview.');
      return updatedData;
    }
  };

  const deleteShagunGift = async (id: string): Promise<boolean> => {
    if (isAuthenticated && !isPreviewMode) {
      const res = await fetch(`/api/gifts/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to delete gift.');
      }
      await refreshModules();
      setLastActionMessage('Gift record removed.');
      return true;
    } else {
      setMockGifts((prev) => prev.filter((g) => g.id !== id));
      setLastActionMessage('Gift removed from preview.');
      return true;
    }
  };

  // --- Phase 4 Checklist Mutations ---
  const addChecklistTask = async (newTask: any): Promise<any> => {
    if (isAuthenticated && !isPreviewMode) {
      const res = await fetch('/api/checklist', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(newTask),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to create checklist task.');
      }
      await refreshModules();
      setLastActionMessage('Task added to wedding checklist.');
      return data.task;
    } else {
      const created: ChecklistTask = {
        ...newTask,
        id: `task-${Date.now()}`,
        isCompleted: false,
      };
      setMockChecklist((prev) => [created, ...prev]);
      setLastActionMessage('Task added to local preview.');
      return created;
    }
  };

  const updateChecklistTask = async (id: string, updatedData: any): Promise<any> => {
    if (isAuthenticated && !isPreviewMode) {
      const res = await fetch(`/api/checklist/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updatedData),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to update task.');
      }
      await refreshModules();
      setLastActionMessage('Task updated.');
      return data.task;
    } else {
      setMockChecklist((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...updatedData } : t))
      );
      setLastActionMessage('Task updated in preview.');
      return updatedData;
    }
  };

  const toggleTaskCompletion = async (taskId: string): Promise<void> => {
    if (isAuthenticated && !isPreviewMode) {
      const res = await fetch(`/api/checklist/${taskId}/toggle`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to toggle task.');
      }
      await refreshModules();
    } else {
      setMockChecklist((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, isCompleted: !t.isCompleted } : t))
      );
    }
  };

  const deleteChecklistTask = async (id: string): Promise<boolean> => {
    if (isAuthenticated && !isPreviewMode) {
      const res = await fetch(`/api/checklist/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to delete task.');
      }
      await refreshModules();
      setLastActionMessage('Task deleted from checklist.');
      return true;
    } else {
      setMockChecklist((prev) => prev.filter((t) => t.id !== id));
      setLastActionMessage('Task removed from preview.');
      return true;
    }
  };

  // Active items depending on mode
  const activeExpenses: (Expense | ExpenseEntity)[] = useMemo(() => {
    return isPreviewMode ? mockExpenses : persistedExpenses;
  }, [isPreviewMode, mockExpenses, persistedExpenses]);

  const activeShopping: (ShoppingItem | ShoppingItemEntity)[] = useMemo(() => {
    return isPreviewMode ? mockShopping : persistedShopping;
  }, [isPreviewMode, mockShopping, persistedShopping]);

  const activeVendors: (Vendor | VendorEntity)[] = useMemo(() => {
    return isPreviewMode ? mockVendors : persistedVendors;
  }, [isPreviewMode, mockVendors, persistedVendors]);

  const activeGifts: (ShagunGift | GiftEntity)[] = useMemo(() => {
    return isPreviewMode ? mockGifts : persistedGifts;
  }, [isPreviewMode, mockGifts, persistedGifts]);

  const activeChecklist: (ChecklistTask | ChecklistTaskEntity)[] = useMemo(() => {
    return isPreviewMode ? mockChecklist : persistedChecklist;
  }, [isPreviewMode, mockChecklist, persistedChecklist]);

  // Derived financial summary
  const summary: WeddingSummary = useMemo(() => {
    if (isPreviewMode) {
      const totalSpent = mockExpenses.reduce(
        (sum, e) => sum + (e.status === 'paid' ? e.amount : 0),
        0
      );
      const totalPending = mockVendors.reduce((sum, v) => sum + v.balanceDue, 0);
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
  }, [isPreviewMode, mockExpenses, mockVendors, financialSummary, user, persistedBudget]);

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

    if (financialSummary) {
      return financialSummary.categoryBreakdown.map((item) => ({
        category: item.category,
        allocatedAmount: item.totalAmount,
        spentAmount: item.totalPaid,
      }));
    }

    return [];
  }, [isPreviewMode, mockExpenses, financialSummary]);

  const value: WeddingContextType = {
    isPreviewMode,
    togglePreviewMode,
    setPreviewMode,
    summary,
    financialSummary,
    budgetCategories,
    expenses: activeExpenses,
    shoppingItems: activeShopping,
    vendors: activeVendors,
    shagunGifts: activeGifts,
    checklistTasks: activeChecklist,
    vendorSummary,
    shoppingSummary,
    giftsSummary,
    checklistSummary,
    isLoadingFinancials,
    financialError,
    addExpense,
    updateExpense,
    deleteExpense,
    updateBudget,
    refreshFinancials,
    addVendor,
    updateVendor,
    deleteVendor,
    addVendorPayment,
    deleteVendorPayment,
    addShoppingItem,
    updateShoppingItem,
    deleteShoppingItem,
    addShagunGift,
    updateShagunGift,
    deleteShagunGift,
    addChecklistTask,
    updateChecklistTask,
    toggleTaskCompletion,
    deleteChecklistTask,
    refreshModules,
    lastActionMessage,
    clearActionMessage,
  };

  return <WeddingContext.Provider value={value}>{children}</WeddingContext.Provider>;
};

export const useWedding = (): WeddingContextType => {
  const context = React.useContext(WeddingContext);
  if (!context) {
    throw new Error('useWedding must be used within a WeddingProvider');
  }
  return context;
};

