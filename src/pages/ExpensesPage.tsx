import React, { useState, useMemo } from 'react';
import { useTranslation } from '../context/LanguageContext';
import { useWedding } from '../context/WeddingContext';
import { Badge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { AddExpenseModal } from '../components/modals/AddExpenseModal';
import type { ExpenseCategory } from '../types';
import {
  Receipt,
  Plus,
  Search,
  Filter,
  FileCheck,
} from 'lucide-react';

export const ExpensesPage: React.FC = () => {
  const { t, language } = useTranslation();
  const { expenses, isPreviewMode, togglePreviewMode } = useWedding();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      const matchesSearch =
        exp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exp.paidBy.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (exp.paidTo && exp.paidTo.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory =
        selectedCategory === 'all' || exp.category === selectedCategory;

      const matchesStatus =
        selectedStatus === 'all' || exp.status === selectedStatus;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [expenses, searchQuery, selectedCategory, selectedStatus]);

  const totalFiltered = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

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
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-burgundy hover:bg-burgundy-dark text-ivory text-sm font-semibold transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4 text-gold-light" />
            <span>{t.expenses.addExpenseBtn}</span>
          </button>
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

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-ivory px-3 py-1.5 rounded-xl border border-gold/40">
            <Filter className="w-3.5 h-3.5 text-gold-dark" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-transparent text-xs font-semibold text-charcoal focus:outline-none capitalize"
            >
              <option value="all">{t.expenses.allCategories}</option>
              {Object.entries(t.categories).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-ivory px-3 py-1.5 rounded-xl border border-gold/40">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-transparent text-xs font-semibold text-charcoal focus:outline-none"
            >
              <option value="all">{t.expenses.allStatuses}</option>
              <option value="paid">{t.expenses.paid}</option>
              <option value="partial">{t.expenses.partial}</option>
              <option value="pending">{t.expenses.pending}</option>
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
            <strong className="text-sm">₹{totalFiltered.toLocaleString('en-IN')}</strong>
          </span>
        </div>
      )}

      {/* Main Expenses List or Empty State */}
      {filteredExpenses.length === 0 ? (
        <EmptyState
          icon={<Receipt className="w-8 h-8 text-burgundy" />}
          title={t.expenses.emptyTitle}
          description={t.expenses.emptySubtitle}
          actionLabel={t.expenses.addExpenseBtn}
          onAction={() => setIsModalOpen(true)}
          secondaryActionLabel={
            isPreviewMode
              ? language === 'hi'
                ? 'फ़िल्टर साफ़ करें'
                : 'Clear Filters'
              : t.dashboard.emptyStateToggle
          }
          onSecondaryAction={() => {
            if (isPreviewMode) {
              setSearchQuery('');
              setSelectedCategory('all');
              setSelectedStatus('all');
            } else {
              togglePreviewMode();
            }
          }}
        />
      ) : (
        <div className="space-y-3">
          {/* Responsive Card Grid on Mobile & Structured Table on Desktop */}
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
                </tr>
              </thead>
              <tbody className="divide-y divide-gold/15">
                {filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-rose-light/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-burgundy">{exp.title}</div>
                      <div className="text-[11px] text-charcoal-muted flex items-center gap-2 mt-0.5">
                        {exp.paidTo && <span>To: {exp.paidTo}</span>}
                        {exp.receiptAttached && (
                          <span className="inline-flex items-center gap-0.5 text-sage font-medium">
                            <FileCheck className="w-3 h-3" />
                            Receipt
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 capitalize text-charcoal">
                      <Badge variant="outline" size="sm">
                        {t.categories[exp.category as ExpenseCategory]}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-charcoal-muted whitespace-nowrap">
                      {exp.date}
                    </td>
                    <td className="py-3.5 px-4 text-charcoal">
                      <div>{exp.paidBy}</div>
                      <span className="text-[10px] text-charcoal-muted uppercase">
                        {exp.paymentMode.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-burgundy text-base whitespace-nowrap">
                      ₹{exp.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <Badge
                        variant={exp.status === 'paid' ? 'sage' : exp.status === 'partial' ? 'gold' : 'rose'}
                        size="sm"
                      >
                        {exp.status === 'paid' ? t.expenses.paid : exp.status === 'partial' ? t.expenses.partial : t.expenses.pending}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List */}
          <div className="md:hidden space-y-3">
            {filteredExpenses.map((exp) => (
              <div
                key={exp.id}
                className="bg-ivory-light p-4 rounded-2xl border border-gold/30 card-shadow space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-xs uppercase tracking-wider text-charcoal-muted font-bold block mb-0.5">
                      {t.categories[exp.category as ExpenseCategory]}
                    </span>
                    <h3 className="text-sm font-bold text-burgundy leading-snug">
                      {exp.title}
                    </h3>
                  </div>
                  <span className="text-base font-bold text-burgundy whitespace-nowrap">
                    ₹{exp.amount.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-charcoal-muted pt-2 border-t border-gold/20">
                  <div className="flex items-center gap-1.5">
                    <span>{exp.date}</span>
                    <span>&bull;</span>
                    <span className="truncate">{exp.paidBy}</span>
                  </div>
                  <Badge
                    variant={exp.status === 'paid' ? 'sage' : exp.status === 'partial' ? 'gold' : 'rose'}
                    size="sm"
                  >
                    {exp.status === 'paid' ? t.expenses.paid : exp.status === 'partial' ? t.expenses.partial : t.expenses.pending}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Modal */}
      <AddExpenseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};
