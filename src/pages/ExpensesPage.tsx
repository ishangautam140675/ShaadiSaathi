import React, { useState, useMemo } from 'react';
import { useTranslation } from '../context/LanguageContext';
import { useWedding } from '../context/WeddingContext';
import { useAuth } from '../context/useAuth';
import { Badge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { AddExpenseModal } from '../components/modals/AddExpenseModal';
import { DeleteExpenseModal } from '../components/modals/DeleteExpenseModal';
import type { Expense, ExpenseEntity, ExpenseCategory } from '../types';
import {
  Receipt,
  Plus,
  Search,
  Filter,
  FileCheck,
  Edit2,
  Trash2,
  ArrowUpDown,
  Lock,
  Clock,
} from 'lucide-react';

export const ExpensesPage: React.FC = () => {
  const { t, language } = useTranslation();
  const {
    expenses,
    deleteExpense,
    isPreviewMode,
    togglePreviewMode,
    isLoadingFinancials,
  } = useWedding();
  const { user } = useAuth();

  const isViewer = user?.role === 'VIEWER';

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | ExpenseEntity | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | ExpenseEntity | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const filteredExpenses = useMemo(() => {
    return expenses
      .filter((exp) => {
        const titleMatch = exp.title.toLowerCase().includes(searchQuery.toLowerCase());
        const payerMatch = (
          ('paidByName' in exp && exp.paidByName) ||
          ('paidBy' in exp && exp.paidBy) ||
          ''
        ).toLowerCase().includes(searchQuery.toLowerCase());
        const vendorMatch = (
          ('vendorName' in exp && exp.vendorName) ||
          ('paidTo' in exp && exp.paidTo) ||
          ''
        ).toLowerCase().includes(searchQuery.toLowerCase());

        const matchesSearch = titleMatch || payerMatch || vendorMatch;

        const matchesCategory =
          selectedCategory === 'all' || exp.category === selectedCategory;

        const currentStatus = ('paymentStatus' in exp && exp.paymentStatus) || exp.status;
        const normalizedStatus = currentStatus === 'partial' ? 'partially_paid' : currentStatus;
        const filterStatusNorm = selectedStatus === 'partial' ? 'partially_paid' : selectedStatus;

        const matchesStatus =
          selectedStatus === 'all' || normalizedStatus === filterStatusNorm;

        return matchesSearch && matchesCategory && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === 'amount') {
          return sortOrder === 'asc' ? a.amount - b.amount : b.amount - a.amount;
        }
        // date sort
        return sortOrder === 'asc'
          ? a.date.localeCompare(b.date)
          : b.date.localeCompare(a.date);
      });
  }, [expenses, searchQuery, selectedCategory, selectedStatus, sortBy, sortOrder]);

  const totalFiltered = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  const handleEdit = (exp: Expense | ExpenseEntity) => {
    setExpenseToEdit(exp);
    setIsAddModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsAddModalOpen(false);
    setExpenseToEdit(null);
  };

  const handleDeleteConfirm = async (id: string) => {
    await deleteExpense(id);
    setExpenseToDelete(null);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-gold/25">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-royal text-burgundy">
            {t.expenses.title}
          </h1>
          <p className="text-xs sm:text-sm text-charcoal-muted mt-1">
            {t.expenses.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isViewer ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gold/15 text-gold-dark text-xs font-semibold">
              <Lock className="w-3.5 h-3.5" />
              <span>{language === 'hi' ? 'केवल पठन अनुमति' : 'Read-Only (Viewer)'}</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setExpenseToEdit(null);
                setIsAddModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-burgundy hover:bg-burgundy-dark text-ivory text-sm font-semibold transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4 text-gold-light" />
              <span>{t.expenses.addExpenseBtn}</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-ivory-light rounded-2xl p-4 border border-gold/30 card-shadow flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-gold-dark absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.expenses.searchPlaceholder}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-gold/40 bg-ivory text-charcoal text-xs sm:text-sm focus:border-burgundy"
          />
        </div>

        {/* Filters & Sorting */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Category */}
          <div className="flex items-center gap-1.5 bg-ivory px-3 py-1.5 rounded-xl border border-gold/40">
            <Filter className="w-3.5 h-3.5 text-gold-dark" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-transparent text-xs font-semibold text-charcoal focus:outline-none capitalize"
            >
              <option value="all">{t.expenses.allCategories}</option>
              <option value="venue">{t.categories.venue}</option>
              <option value="catering">{t.categories.catering}</option>
              <option value="decoration">{t.categories.decoration || t.categories.decor}</option>
              <option value="clothing">{t.categories.clothing || t.categories.attire}</option>
              <option value="jewellery">{t.categories.jewellery || t.categories.jewelry}</option>
              <option value="photography">{t.categories.photography}</option>
              <option value="invitations">{t.categories.invitations || t.categories.invitations_gifts}</option>
              <option value="makeup">{t.categories.makeup}</option>
              <option value="transport">{t.categories.transport || t.categories.logistics_travel}</option>
              <option value="gifts">{t.categories.gifts}</option>
              <option value="other">{t.categories.other || t.categories.miscellaneous}</option>
            </select>
          </div>

          {/* Payment Status */}
          <div className="flex items-center gap-1.5 bg-ivory px-3 py-1.5 rounded-xl border border-gold/40">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-transparent text-xs font-semibold text-charcoal focus:outline-none"
            >
              <option value="all">{t.expenses.allStatuses}</option>
              <option value="paid">{t.expenses.statusPaid}</option>
              <option value="partially_paid">{t.expenses.statusPartial}</option>
              <option value="pending">{t.expenses.statusPending}</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-1.5 bg-ivory px-3 py-1.5 rounded-xl border border-gold/40">
            <ArrowUpDown className="w-3.5 h-3.5 text-gold-dark" />
            <select
              value={`${sortBy}_${sortOrder}`}
              onChange={(e) => {
                const [by, order] = e.target.value.split('_');
                setSortBy(by as 'date' | 'amount');
                setSortOrder(order as 'asc' | 'desc');
              }}
              className="bg-transparent text-xs font-semibold text-charcoal focus:outline-none"
            >
              <option value="date_desc">{language === 'hi' ? 'नवीनतम तारीख' : 'Newest Date'}</option>
              <option value="date_asc">{language === 'hi' ? 'पुरानी तारीख' : 'Oldest Date'}</option>
              <option value="amount_desc">{language === 'hi' ? 'अधिकतम राशि' : 'Highest Amount'}</option>
              <option value="amount_asc">{language === 'hi' ? 'न्यूनतम राशि' : 'Lowest Amount'}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Filtered Count & Total Banner */}
      {filteredExpenses.length > 0 && (
        <div className="flex items-center justify-between text-xs text-charcoal-muted px-1">
          <span>
            {language === 'hi'
              ? `${filteredExpenses.length} खर्च प्रविष्टियां मिलीं`
              : `Showing ${filteredExpenses.length} expense records`}
          </span>
          <span className="font-semibold text-burgundy">
            {language === 'hi' ? 'कुल प्रदर्शित व्यय:' : 'Total Filtered Spend:'}{' '}
            <strong className="text-sm">₹{totalFiltered.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
          </span>
        </div>
      )}

      {/* Main Expenses List or Empty State */}
      {isLoadingFinancials ? (
        <div className="py-12 text-center text-xs text-charcoal-muted bg-ivory-light rounded-2xl border border-gold/30">
          <div className="w-7 h-7 border-2 border-burgundy border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <span>{t.expenses.loadingExpenses}</span>
        </div>
      ) : filteredExpenses.length === 0 ? (
        <EmptyState
          icon={<Receipt className="w-8 h-8 text-burgundy" />}
          title={t.expenses.emptyTitle}
          description={t.expenses.emptySubtitle}
          actionLabel={isViewer ? undefined : t.expenses.addExpenseBtn}
          onAction={isViewer ? undefined : () => setIsAddModalOpen(true)}
          secondaryActionLabel={
            searchQuery || selectedCategory !== 'all' || selectedStatus !== 'all'
              ? t.expenses.clearFilters
              : isPreviewMode
              ? t.dashboard.emptyStateToggle
              : undefined
          }
          onSecondaryAction={() => {
            if (searchQuery || selectedCategory !== 'all' || selectedStatus !== 'all') {
              setSearchQuery('');
              setSelectedCategory('all');
              setSelectedStatus('all');
            } else if (isPreviewMode) {
              togglePreviewMode();
            }
          }}
        />
      ) : (
        <div className="space-y-3">
          {/* Desktop Structured Table */}
          <div className="hidden md:block bg-ivory-light rounded-2xl border border-gold/30 card-shadow overflow-hidden">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-ivory border-b border-gold/25 text-charcoal-muted uppercase text-[11px] font-bold tracking-wider">
                <tr>
                  <th className="py-3 px-4">Expense Details</th>
                  <th className="py-3 px-4">{t.common.category}</th>
                  <th className="py-3 px-4">{t.common.date}</th>
                  <th className="py-3 px-4">{t.expenses.paidBy}</th>
                  <th className="py-3 px-4 text-right">{t.common.amount}</th>
                  <th className="py-3 px-4 text-center">{t.common.status}</th>
                  {!isViewer && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gold/15">
                {filteredExpenses.map((exp) => {
                  const currentStatus = ('paymentStatus' in exp && exp.paymentStatus) || exp.status;
                  const payer = ('paidByName' in exp && exp.paidByName) || ('paidBy' in exp && exp.paidBy) || '';
                  const vendor = ('vendorName' in exp && exp.vendorName) || ('paidTo' in exp && exp.paidTo) || '';
                  const method = ('paymentMethod' in exp && exp.paymentMethod) || ('paymentMode' in exp && exp.paymentMode) || 'upi';

                  const paidAmt = exp.paidAmount !== undefined ? exp.paidAmount : exp.amount;
                  const outstanding = exp.outstandingBalance !== undefined ? exp.outstandingBalance : Math.max(0, exp.amount - paidAmt);

                  return (
                    <tr key={exp.id} className="hover:bg-rose-light/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-burgundy flex items-center gap-1.5">
                          <span>{exp.title}</span>
                          {exp.isOfflineDraft && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                              <Clock className="w-2.5 h-2.5" />
                              {language === 'hi' ? 'स्थानीय ड्राफ्ट' : 'Offline Draft'}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-charcoal-muted flex items-center gap-2 mt-0.5">
                          {vendor && <span>To: {vendor}</span>}
                          {exp.notes && <span className="truncate max-w-[200px] text-charcoal-muted/80">({exp.notes})</span>}
                          {('receiptAttached' in exp && exp.receiptAttached) && (
                            <span className="inline-flex items-center gap-0.5 text-sage font-medium">
                              <FileCheck className="w-3 h-3" />
                              Receipt
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 capitalize text-charcoal">
                        <Badge variant="outline" size="sm">
                          {t.categories[exp.category as ExpenseCategory] || exp.category}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-charcoal-muted whitespace-nowrap">
                        {exp.date}
                      </td>
                      <td className="py-3.5 px-4 text-charcoal">
                        <div className="font-medium">{payer}</div>
                        <span className="text-[10px] text-charcoal-muted uppercase">
                          {method.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="font-bold text-burgundy text-base">
                          ₹{exp.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                        {currentStatus === 'partially_paid' || currentStatus === 'partial' ? (
                          <div className="text-[11px] text-charcoal-muted">
                            Paid: ₹{paidAmt.toLocaleString('en-IN')} &bull; Due: <span className="text-burgundy font-semibold">₹{outstanding.toLocaleString('en-IN')}</span>
                          </div>
                        ) : null}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <Badge
                          variant={
                            currentStatus === 'paid'
                              ? 'sage'
                              : currentStatus === 'partially_paid' || currentStatus === 'partial'
                              ? 'gold'
                              : 'rose'
                          }
                          size="sm"
                        >
                          {currentStatus === 'paid'
                            ? t.expenses.statusPaid
                            : currentStatus === 'partially_paid' || currentStatus === 'partial'
                            ? t.expenses.statusPartial
                            : t.expenses.statusPending}
                        </Badge>
                      </td>
                      {!isViewer && (
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleEdit(exp)}
                              title="Edit Expense"
                              className="p-1.5 rounded-lg hover:bg-rose/40 text-charcoal-muted hover:text-burgundy transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setExpenseToDelete(exp)}
                              title="Delete Expense"
                              className="p-1.5 rounded-lg hover:bg-red-50 text-charcoal-muted hover:text-red-600 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List */}
          <div className="md:hidden space-y-3">
            {filteredExpenses.map((exp) => {
              const currentStatus = ('paymentStatus' in exp && exp.paymentStatus) || exp.status;
              const payer = ('paidByName' in exp && exp.paidByName) || ('paidBy' in exp && exp.paidBy) || '';
              const vendor = ('vendorName' in exp && exp.vendorName) || ('paidTo' in exp && exp.paidTo) || '';
              const paidAmt = exp.paidAmount !== undefined ? exp.paidAmount : exp.amount;
              const outstanding = exp.outstandingBalance !== undefined ? exp.outstandingBalance : Math.max(0, exp.amount - paidAmt);

              return (
                <div
                  key={exp.id}
                  className="bg-ivory-light p-4 rounded-2xl border border-gold/30 card-shadow space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-xs uppercase tracking-wider text-charcoal-muted font-bold block mb-0.5">
                        {t.categories[exp.category as ExpenseCategory] || exp.category}
                      </span>
                      <h3 className="text-sm font-bold text-burgundy leading-snug flex items-center gap-1.5 flex-wrap">
                        <span>{exp.title}</span>
                        {exp.isOfflineDraft && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                            <Clock className="w-2.5 h-2.5" />
                            {language === 'hi' ? 'स्थानीय ड्राफ्ट' : 'Offline Draft'}
                          </span>
                        )}
                      </h3>
                      {vendor && (
                        <span className="text-[11px] text-charcoal-muted block mt-0.5">
                          To: {vendor}
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-base font-bold text-burgundy whitespace-nowrap block">
                        ₹{exp.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                      {outstanding > 0 && (
                        <span className="text-[10px] text-red-600 font-semibold block">
                          Due: ₹{outstanding.toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-charcoal-muted pt-2 border-t border-gold/20">
                    <div className="flex items-center gap-1.5 truncate">
                      <span>{exp.date}</span>
                      <span>&bull;</span>
                      <span className="truncate">{payer}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          currentStatus === 'paid'
                            ? 'sage'
                            : currentStatus === 'partially_paid' || currentStatus === 'partial'
                            ? 'gold'
                            : 'rose'
                        }
                        size="sm"
                      >
                        {currentStatus === 'paid'
                          ? t.expenses.statusPaid
                          : currentStatus === 'partially_paid' || currentStatus === 'partial'
                          ? t.expenses.statusPartial
                          : t.expenses.statusPending}
                      </Badge>

                      {!isViewer && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleEdit(exp)}
                            className="p-1 rounded text-charcoal-muted hover:text-burgundy"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setExpenseToDelete(exp)}
                            className="p-1 rounded text-charcoal-muted hover:text-red-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      <AddExpenseModal
        isOpen={isAddModalOpen}
        onClose={handleCloseModal}
        expenseToEdit={expenseToEdit}
      />

      {/* Delete Confirmation Modal */}
      <DeleteExpenseModal
        isOpen={!!expenseToDelete}
        onClose={() => setExpenseToDelete(null)}
        onConfirm={handleDeleteConfirm}
        expense={expenseToDelete}
      />
    </div>
  );
};
