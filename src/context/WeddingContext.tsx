import React, { createContext, useState, useMemo } from 'react';
import { useWedding } from './useWedding';
import type {
  Expense,
  BudgetItem,
  ShoppingItem,
  Vendor,
  ShagunGift,
  ChecklistTask,
  WeddingSummary,
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
  budgetCategories: BudgetItem[];
  expenses: Expense[];
  shoppingItems: ShoppingItem[];
  vendors: Vendor[];
  shagunGifts: ShagunGift[];
  checklistTasks: ChecklistTask[];

  // Mutations (In-memory for Phase 1 session preview)
  addExpense: (expense: Omit<Expense, 'id'>) => Expense;
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
  // Default to Preview Mode true so the user can immediately evaluate the beautiful UI and cards,
  // but with an honest, prominent banner at all times.
  const [isPreviewMode, setIsPreviewMode] = useState<boolean>(true);

  // In-memory states initialized from mock data
  const [expenses, setExpenses] = useState<Expense[]>(MOCK_EXPENSES);
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>(MOCK_SHOPPING_ITEMS);
  const [vendors, setVendors] = useState<Vendor[]>(MOCK_VENDORS);
  const [shagunGifts, setShagunGifts] = useState<ShagunGift[]>(MOCK_SHAGUN_GIFTS);
  const [checklistTasks, setChecklistTasks] = useState<ChecklistTask[]>(MOCK_CHECKLIST_TASKS);
  const [lastActionMessage, setLastActionMessage] = useState<string | null>(null);

  const togglePreviewMode = () => {
    setIsPreviewMode((prev) => !prev);
  };

  const setPreviewMode = (enabled: boolean) => {
    setIsPreviewMode(enabled);
  };

  const clearActionMessage = () => {
    setLastActionMessage(null);
  };

  // Add Expense
  const addExpense = (newExp: Omit<Expense, 'id'>): Expense => {
    const created: Expense = {
      ...newExp,
      id: `exp-${Date.now()}`,
    };
    setExpenses((prev) => [created, ...prev]);
    setLastActionMessage(
      'Expense validated and added to local session! Permanent database synchronization will connect in Phase 2.'
    );
    return created;
  };

  // Add Shopping Item
  const addShoppingItem = (newItem: Omit<ShoppingItem, 'id'>): ShoppingItem => {
    const created: ShoppingItem = {
      ...newItem,
      id: `shop-${Date.now()}`,
    };
    setShoppingItems((prev) => [created, ...prev]);
    setLastActionMessage(
      'Shopping item saved in local session! Cloud synchronization will connect in Phase 2.'
    );
    return created;
  };

  // Add Vendor
  const addVendor = (newVendor: Omit<Vendor, 'id'>): Vendor => {
    const created: Vendor = {
      ...newVendor,
      id: `ven-${Date.now()}`,
    };
    setVendors((prev) => [created, ...prev]);
    setLastActionMessage(
      'Vendor added to local session! Contract persistence will connect in Phase 2.'
    );
    return created;
  };

  // Add Shagun
  const addShagunGift = (newGift: Omit<ShagunGift, 'id'>): ShagunGift => {
    const created: ShagunGift = {
      ...newGift,
      id: `shagun-${Date.now()}`,
    };
    setShagunGifts((prev) => [created, ...prev]);
    setLastActionMessage(
      'Shagun recorded in local session! Remember, Shagun is strictly separated from wedding operating accounts.'
    );
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

  // Active records depending on mode
  const activeExpenses = useMemo(() => (isPreviewMode ? expenses : []), [isPreviewMode, expenses]);
  const activeShopping = useMemo(() => (isPreviewMode ? shoppingItems : []), [isPreviewMode, shoppingItems]);
  const activeVendors = useMemo(() => (isPreviewMode ? vendors : []), [isPreviewMode, vendors]);
  const activeShagun = useMemo(() => (isPreviewMode ? shagunGifts : []), [isPreviewMode, shagunGifts]);
  const activeChecklist = useMemo(() => (isPreviewMode ? checklistTasks : []), [isPreviewMode, checklistTasks]);

  // Derived financial summary
  const summary: WeddingSummary = useMemo(() => {
    if (!isPreviewMode) {
      return {
        brideName: 'Kavya Sharma',
        groomName: 'Rohan Verma',
        weddingDate: '2026-12-18',
        totalBudget: 2500000,
        currency: 'INR',
        totalSpent: 0,
        remainingBudget: 2500000,
        totalPendingPayments: 0,
        budgetUtilizationPct: 0,
      };
    }

    const totalSpent = activeExpenses.reduce((sum, e) => sum + (e.status === 'paid' ? e.amount : 0), 0);
    const totalPending = activeVendors.reduce((sum, v) => sum + v.balanceDue, 0);
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
  }, [isPreviewMode, activeExpenses, activeVendors]);

  // Category breakdown
  const budgetCategories = useMemo(() => {
    if (!isPreviewMode) {
      return MOCK_BUDGET_CATEGORIES.map((c) => ({ ...c, spentAmount: 0 }));
    }
    return MOCK_BUDGET_CATEGORIES.map((cat) => {
      const categorySpent = activeExpenses
        .filter((e) => e.category === cat.category)
        .reduce((sum, e) => sum + e.amount, 0);
      return {
        ...cat,
        spentAmount: categorySpent,
      };
    });
  }, [isPreviewMode, activeExpenses]);

  return (
    <WeddingContext.Provider
      value={{
        isPreviewMode,
        togglePreviewMode,
        setPreviewMode,
        summary,
        budgetCategories,
        expenses: activeExpenses,
        shoppingItems: activeShopping,
        vendors: activeVendors,
        shagunGifts: activeShagun,
        checklistTasks: activeChecklist,
        addExpense,
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
