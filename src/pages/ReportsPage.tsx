import React, { useState } from 'react';
import { useTranslation } from '../context/LanguageContext';
import { useWedding } from '../context/WeddingContext';
import { PhaseNoticeModal } from '../components/common/PhaseNoticeModal';
import type { ExpenseCategory } from '../types';
import {
  FileSpreadsheet,
  FileText,
  Info,
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const { t, language } = useTranslation();
  const { summary, budgetCategories, expenses } = useWedding();

  const [isExportNoticeOpen, setIsExportNoticeOpen] = useState(false);
  const [exportType, setExportType] = useState<'PDF' | 'Excel'>('PDF');

  const handleExportClick = (type: 'PDF' | 'Excel') => {
    setExportType(type);
    setIsExportNoticeOpen(true);
  };

  // Spending by family side
  const brideSpend = expenses
    .filter((e) => e.side === 'bride')
    .reduce((sum, e) => sum + e.amount, 0);

  const groomSpend = expenses
    .filter((e) => e.side === 'groom')
    .reduce((sum, e) => sum + e.amount, 0);

  const mutualSpend = expenses
    .filter((e) => e.side === 'mutual')
    .reduce((sum, e) => sum + e.amount, 0);

  const totalSpend = brideSpend + groomSpend + mutualSpend;

  const bridePct = totalSpend > 0 ? Math.round((brideSpend / totalSpend) * 100) : 0;
  const groomPct = totalSpend > 0 ? Math.round((groomSpend / totalSpend) * 100) : 0;
  const mutualPct = totalSpend > 0 ? Math.round((mutualSpend / totalSpend) * 100) : 0;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-gold/25">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-royal text-burgundy">
            {t.reports.title}
          </h1>
          <p className="text-xs sm:text-sm text-charcoal-muted mt-1">
            {t.reports.subtitle}
          </p>
        </div>

        {/* Future Export Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleExportClick('PDF')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gold/40 bg-ivory text-burgundy text-xs font-semibold hover:bg-rose/40 transition-colors cursor-pointer shadow-2xs"
          >
            <FileText className="w-4 h-4 text-burgundy" />
            <span>{t.reports.exportPdf}</span>
          </button>

          <button
            type="button"
            onClick={() => handleExportClick('Excel')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gold/40 bg-ivory text-sage-dark text-xs font-semibold hover:bg-sage/15 transition-colors cursor-pointer shadow-2xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-sage" />
            <span>{t.reports.exportExcel}</span>
          </button>
        </div>
      </div>

      {/* Honest Notice */}
      <div className="p-4 rounded-2xl bg-ivory-light border border-gold/30 text-xs text-charcoal-muted flex items-start gap-2.5">
        <Info className="w-4 h-4 text-gold-dark flex-shrink-0 mt-0.5" />
        <span>{t.reports.honestNotice}</span>
      </div>

      {/* Visual Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Budget Allocation vs Actual Spent (Native Responsive SVG) */}
        <div className="bg-ivory-light rounded-2xl p-5 border border-gold/30 card-shadow space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold font-royal text-burgundy">
              {t.reports.budgetVsActual}
            </h2>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-charcoal-muted">
                <span className="w-3 h-3 rounded-sm bg-rose" />
                {t.reports.budgeted}
              </span>
              <span className="flex items-center gap-1 text-charcoal">
                <span className="w-3 h-3 rounded-sm bg-burgundy" />
                {t.reports.actual}
              </span>
            </div>
          </div>

          {/* Bar Comparison Stack */}
          <div className="space-y-3 pt-2">
            {budgetCategories.slice(0, 6).map((cat) => {
              const allocWidth = Math.min((cat.allocatedAmount / 700000) * 100, 100);
              const spentWidth = Math.min((cat.spentAmount / 700000) * 100, 100);

              return (
                <div key={cat.category} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="text-charcoal capitalize truncate max-w-[150px]">
                      {t.categories[cat.category as ExpenseCategory]}
                    </span>
                    <span className="text-[11px] font-mono text-charcoal-muted">
                      ₹{cat.spentAmount.toLocaleString('en-IN')} / ₹{cat.allocatedAmount.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="space-y-1">
                    {/* Allocated Bar */}
                    <div className="w-full bg-rose/30 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-rose-dark h-full rounded-full transition-all duration-300"
                        style={{ width: `${allocWidth}%` }}
                      />
                    </div>
                    {/* Spent Bar */}
                    <div className="w-full bg-gold/20 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-burgundy h-full rounded-full transition-all duration-300"
                        style={{ width: `${spentWidth}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chart 2: Expenditure by Family Side (Ladkewale / Ladkiwale / Mutual) */}
        <div className="bg-ivory-light rounded-2xl p-5 border border-gold/30 card-shadow space-y-4 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold font-royal text-burgundy">
              {t.reports.spendingBySide}
            </h2>
            <p className="text-xs text-charcoal-muted mt-1">
              {language === 'hi'
                ? 'वर और वधू दोनों पक्षों के खर्चों का निष्पक्ष एवं पारदर्शी संतुलन'
                : 'Balanced multi-family visibility ensuring transparency and mutual peace of mind.'}
            </p>
          </div>

          {/* Side Comparison Blocks */}
          <div className="space-y-3 py-2">
            <div>
              <div className="flex items-center justify-between text-xs font-semibold mb-1">
                <span className="text-burgundy">{t.common.brideSide}</span>
                <span className="font-mono">
                  ₹{brideSpend.toLocaleString('en-IN')} ({bridePct}%)
                </span>
              </div>
              <div className="w-full bg-rose/40 h-3 rounded-full overflow-hidden">
                <div
                  className="bg-burgundy h-full rounded-full transition-all duration-300"
                  style={{ width: `${bridePct}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-semibold mb-1">
                <span className="text-gold-dark">{t.common.groomSide}</span>
                <span className="font-mono">
                  ₹{groomSpend.toLocaleString('en-IN')} ({groomPct}%)
                </span>
              </div>
              <div className="w-full bg-rose/40 h-3 rounded-full overflow-hidden">
                <div
                  className="bg-gold h-full rounded-full transition-all duration-300"
                  style={{ width: `${groomPct}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-semibold mb-1">
                <span className="text-sage-dark">{t.common.mutual}</span>
                <span className="font-mono">
                  ₹{mutualSpend.toLocaleString('en-IN')} ({mutualPct}%)
                </span>
              </div>
              <div className="w-full bg-rose/40 h-3 rounded-full overflow-hidden">
                <div
                  className="bg-sage h-full rounded-full transition-all duration-300"
                  style={{ width: `${mutualPct}%` }}
                />
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-ivory border border-gold/30 text-xs flex items-center justify-between font-semibold">
            <span>Total Family Expenditure</span>
            <span className="text-burgundy font-bold text-base">
              ₹{totalSpend.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>

      {/* Itemized Category Breakdown Table */}
      <div className="bg-ivory-light rounded-2xl border border-gold/30 card-shadow overflow-hidden">
        <div className="px-5 py-4 border-b border-gold/25 bg-ivory">
          <h2 className="text-sm font-bold font-royal text-burgundy">
            {t.reports.categoryBreakdown}
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-ivory/60 border-b border-gold/20 text-charcoal-muted uppercase text-[11px] font-bold tracking-wider">
              <tr>
                <th className="py-3 px-4">{t.reports.category}</th>
                <th className="py-3 px-4 text-right">{t.reports.budgeted}</th>
                <th className="py-3 px-4 text-right">{t.reports.actual}</th>
                <th className="py-3 px-4 text-right">{t.reports.difference}</th>
                <th className="py-3 px-4 text-center">{t.reports.percentage}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gold/15">
              {budgetCategories.map((cat) => {
                const diff = cat.allocatedAmount - cat.spentAmount;
                const pct = summary.totalSpent > 0 ? ((cat.spentAmount / summary.totalSpent) * 100).toFixed(1) : '0';

                return (
                  <tr key={cat.category} className="hover:bg-rose-light/30 transition-colors">
                    <td className="py-3 px-4 font-semibold text-charcoal capitalize">
                      {t.categories[cat.category as ExpenseCategory]}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-charcoal-muted">
                      ₹{cat.allocatedAmount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-burgundy">
                      ₹{cat.spentAmount.toLocaleString('en-IN')}
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-mono font-semibold ${
                        diff >= 0 ? 'text-sage-dark' : 'text-burgundy'
                      }`}
                    >
                      {diff >= 0 ? '+' : '-'}₹{Math.abs(diff).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-charcoal-muted">
                      {pct}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Export Roadmap Modal */}
      <PhaseNoticeModal
        isOpen={isExportNoticeOpen}
        onClose={() => setIsExportNoticeOpen(false)}
        featureName={`Export to ${exportType}`}
        targetPhase="Phase 4"
        description={
          language === 'hi'
            ? `${exportType} निर्यात सुविधा फेज़ 4 में सक्रिय की जाएगी। इसमें रंगीन सारांश, श्रेणीवार विभाजन और सीए/अकाउंटेंट के लिए एक्सेल शीट शामिल होगी।`
            : `${exportType} report generation is scheduled for Phase 4. It will produce clean, printable summaries and formatted CSV/Excel workbooks designed for wedding accountants.`
        }
        checklistItems={[
          'Client-side print-ready PDF styling with wedding crest',
          'Formatted Excel spreadsheet with formulas and category tabs',
          'Option to export Shagun register independently',
          'Zero paid PDF SaaS or external print servers required',
        ]}
      />
    </div>
  );
};
