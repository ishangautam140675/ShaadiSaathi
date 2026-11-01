import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '../context/LanguageContext';
import { Badge } from '../components/common/Badge';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  IndianRupee,
  TrendingUp,
  CreditCard,
  Wallet,
  ShoppingBag,
  Gift,
  Printer,
  RefreshCw,
} from 'lucide-react';

interface ComprehensiveReport {
  currency: string;
  asOfDate: string;
  budgetSummary: {
    totalBudget: number;
    totalCommitted: number;
    totalPaid: number;
    totalOutstanding: number;
    remainingBudget: number;
    cashRemaining: number;
    budgetUtilization: number;
  };
  categories: Array<{
    category: string;
    count: number;
    totalAmount: number;
    paidAmount: number;
    outstandingAmount: number;
    percentageOfBudget: number;
    percentageOfSpend: number;
  }>;
  vendors: Array<{
    vendorId: string;
    vendorName: string;
    category: string;
    agreedAmount: number;
    paidAmount: number;
    balanceAmount: number;
    status: string;
    paymentCount: number;
  }>;
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
  monthlyTimeline: Array<{
    period: string;
    expenseCount: number;
    totalAmount: number;
    paidAmount: number;
  }>;
}

export const ReportsPage: React.FC = () => {
  const { t } = useTranslation();

  const [report, setReport] = useState<ComprehensiveReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Date filters
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);

    let url = '/api/reports/summary';
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (params.toString()) url += `?${params.toString()}`;

    try {
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) {
        throw new Error('Failed to load financial report data.');
      }
      const data = await res.json();
      setReport(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error loading reports.');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleExportCsv = (type: 'expenses' | 'vendors' | 'gifts') => {
    let url = `/api/export/csv?type=${type}`;
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;
    window.open(url, '_blank');
  };

  const handleExportJson = () => {
    window.open('/api/export/json', '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (amt: number) => {
    return `₹${amt.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header & Export Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-gold/25">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold font-royal text-burgundy">
              {t.reports.title}
            </h1>
            <Badge variant="burgundy" size="sm">
              Live DB Analytics
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-charcoal-muted mt-1">
            {t.reports.subtitle}
          </p>
        </div>

        {/* Action Buttons: CSV & Master JSON Export */}
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          {/* CSV Expenses */}
          <button
            type="button"
            onClick={() => handleExportCsv('expenses')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gold/40 bg-ivory text-burgundy text-xs font-semibold hover:bg-rose/40 transition-colors cursor-pointer shadow-2xs"
            title="Export Expenses as RFC 4180 CSV with UTF-8 BOM"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-burgundy" />
            <span>{t.reports.exportExcel}</span>
          </button>

          {/* CSV Vendors */}
          <button
            type="button"
            onClick={() => handleExportCsv('vendors')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gold/40 bg-ivory text-charcoal text-xs font-semibold hover:bg-rose/40 transition-colors cursor-pointer shadow-2xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-gold-dark" />
            <span>{t.reports.exportVendorsCsv}</span>
          </button>

          {/* CSV Shagun */}
          <button
            type="button"
            onClick={() => handleExportCsv('gifts')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gold/40 bg-ivory text-charcoal text-xs font-semibold hover:bg-rose/40 transition-colors cursor-pointer shadow-2xs"
          >
            <Gift className="w-3.5 h-3.5 text-sage" />
            <span>{t.reports.exportGiftsCsv}</span>
          </button>

          {/* Master JSON Backup */}
          <button
            type="button"
            onClick={handleExportJson}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gold/50 bg-burgundy hover:bg-burgundy-dark text-ivory text-xs font-semibold transition-colors cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-gold-light" />
            <span>{t.reports.exportJsonArchive}</span>
          </button>

          {/* Print View */}
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gold/30 bg-ivory text-charcoal-muted hover:text-charcoal text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{t.reports.exportPdf}</span>
          </button>
        </div>
      </div>

      {/* Date Range Filter Bar */}
      <div className="bg-ivory-light p-3.5 rounded-2xl border border-gold/30 card-shadow flex flex-wrap items-center justify-between gap-3 text-xs print:hidden">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-burgundy" />
          <span className="font-semibold text-charcoal">{t.reports.filterByDate}:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-2 py-1 rounded-lg border border-gold/30 bg-ivory text-charcoal text-xs"
          />
          <span className="text-charcoal-muted">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-2 py-1 rounded-lg border border-gold/30 bg-ivory text-charcoal text-xs"
          />
          {(startDate || endDate) && (
            <button
              type="button"
              onClick={() => {
                setStartDate('');
                setEndDate('');
              }}
              className="text-burgundy hover:underline text-xs font-semibold cursor-pointer"
            >
              {t.reports.resetFilter}
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={fetchReport}
          className="text-charcoal-muted hover:text-burgundy flex items-center gap-1 font-medium cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Analytics</span>
        </button>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-burgundy/10 border border-burgundy/30 text-burgundy text-xs">
          {errorMsg}
        </div>
      )}

      {loading && !report && (
        <div className="py-12 text-center text-xs text-charcoal-muted">
          Loading comprehensive financial report...
        </div>
      )}

      {report && (
        <>
          {/* Top KPI Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Target Budget */}
            <div className="bg-ivory-light p-4 rounded-2xl border border-gold/30 card-shadow space-y-1">
              <span className="text-[11px] font-semibold text-charcoal-muted flex items-center gap-1">
                <IndianRupee className="w-3.5 h-3.5 text-gold-dark" />
                Target Budget
              </span>
              <div className="text-lg sm:text-xl font-bold font-royal text-burgundy">
                {formatCurrency(report.budgetSummary.totalBudget)}
              </div>
              <div className="text-[10px] text-charcoal-muted">
                Utilization: {report.budgetSummary.budgetUtilization}%
              </div>
            </div>

            {/* Total Committed */}
            <div className="bg-ivory-light p-4 rounded-2xl border border-gold/30 card-shadow space-y-1">
              <span className="text-[11px] font-semibold text-charcoal-muted flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-burgundy" />
                {t.reports.totalCommitted}
              </span>
              <div className="text-lg sm:text-xl font-bold font-royal text-charcoal">
                {formatCurrency(report.budgetSummary.totalCommitted)}
              </div>
              <div className="text-[10px] text-charcoal-muted">
                Remaining: {formatCurrency(report.budgetSummary.remainingBudget)}
              </div>
            </div>

            {/* Total Paid */}
            <div className="bg-ivory-light p-4 rounded-2xl border border-gold/30 card-shadow space-y-1">
              <span className="text-[11px] font-semibold text-charcoal-muted flex items-center gap-1">
                <CreditCard className="w-3.5 h-3.5 text-sage" />
                {t.reports.totalPaid}
              </span>
              <div className="text-lg sm:text-xl font-bold font-royal text-sage-dark">
                {formatCurrency(report.budgetSummary.totalPaid)}
              </div>
              <div className="text-[10px] text-charcoal-muted">
                Cash in Hand: {formatCurrency(report.budgetSummary.cashRemaining)}
              </div>
            </div>

            {/* Outstanding Balance */}
            <div className="bg-ivory-light p-4 rounded-2xl border border-gold/30 card-shadow space-y-1">
              <span className="text-[11px] font-semibold text-charcoal-muted flex items-center gap-1">
                <Wallet className="w-3.5 h-3.5 text-gold-dark" />
                {t.reports.totalOutstanding}
              </span>
              <div className="text-lg sm:text-xl font-bold font-royal text-burgundy">
                {formatCurrency(report.budgetSummary.totalOutstanding)}
              </div>
              <div className="text-[10px] text-charcoal-muted">
                Pending Settlements
              </div>
            </div>
          </div>

          {/* Section 1: Category Breakdown & Spending Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Category Table (7 cols) */}
            <div className="lg:col-span-7 bg-ivory-light rounded-2xl p-5 border border-gold/30 card-shadow space-y-4">
              <h2 className="text-sm font-bold font-royal text-burgundy">
                {t.reports.categoryBreakdown}
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gold/20 text-[11px] text-charcoal-muted font-semibold uppercase tracking-wider">
                      <th className="py-2 px-2.5">Category</th>
                      <th className="py-2 px-2.5 text-right">Committed</th>
                      <th className="py-2 px-2.5 text-right">Paid</th>
                      <th className="py-2 px-2.5 text-right">Due</th>
                      <th className="py-2 px-2.5 text-right">% Spend</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gold/10">
                    {report.categories.map((cat) => (
                      <tr key={cat.category} className="hover:bg-ivory/50">
                        <td className="py-2 px-2.5 font-medium text-charcoal capitalize">
                          {cat.category} ({cat.count})
                        </td>
                        <td className="py-2 px-2.5 text-right font-bold text-burgundy">
                          {formatCurrency(cat.totalAmount)}
                        </td>
                        <td className="py-2 px-2.5 text-right text-sage-dark font-medium">
                          {formatCurrency(cat.paidAmount)}
                        </td>
                        <td className="py-2 px-2.5 text-right text-charcoal-muted">
                          {formatCurrency(cat.outstandingAmount)}
                        </td>
                        <td className="py-2 px-2.5 text-right text-charcoal font-semibold">
                          {cat.percentageOfSpend}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Visual Progress Bar Distribution (5 cols) */}
            <div className="lg:col-span-5 bg-ivory-light rounded-2xl p-5 border border-gold/30 card-shadow space-y-4">
              <h2 className="text-sm font-bold font-royal text-burgundy">
                {t.reports.budgetVsActual}
              </h2>

              <div className="space-y-3 pt-1">
                {report.categories.slice(0, 6).map((cat) => (
                  <div key={cat.category} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-charcoal capitalize">{cat.category}</span>
                      <span className="text-charcoal-muted">{cat.percentageOfSpend}% ({formatCurrency(cat.totalAmount)})</span>
                    </div>
                    <div className="h-2 rounded-full bg-ivory border border-gold/20 overflow-hidden">
                      <div
                        className="h-full bg-burgundy rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, cat.percentageOfSpend)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section 2: Vendors & Contracts */}
          <div className="bg-ivory-light rounded-2xl p-5 border border-gold/30 card-shadow space-y-4">
            <h2 className="text-sm font-bold font-royal text-burgundy">
              {t.reports.vendorSummaryTitle}
            </h2>

            {report.vendors.length === 0 ? (
              <p className="text-xs text-charcoal-muted py-2">No vendor contracts recorded.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gold/20 text-[11px] text-charcoal-muted font-semibold uppercase tracking-wider">
                      <th className="py-2 px-2.5">Vendor Name</th>
                      <th className="py-2 px-2.5">Category</th>
                      <th className="py-2 px-2.5 text-right">Contract</th>
                      <th className="py-2 px-2.5 text-right">Paid</th>
                      <th className="py-2 px-2.5 text-right">Balance Due</th>
                      <th className="py-2 px-2.5 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gold/10">
                    {report.vendors.map((ven) => (
                      <tr key={ven.vendorId} className="hover:bg-ivory/50">
                        <td className="py-2 px-2.5 font-medium text-charcoal">{ven.vendorName}</td>
                        <td className="py-2 px-2.5 text-charcoal-muted capitalize">{ven.category}</td>
                        <td className="py-2 px-2.5 text-right font-bold text-burgundy">
                          {formatCurrency(ven.agreedAmount)}
                        </td>
                        <td className="py-2 px-2.5 text-right text-sage-dark font-medium">
                          {formatCurrency(ven.paidAmount)}
                        </td>
                        <td className="py-2 px-2.5 text-right text-charcoal font-semibold">
                          {formatCurrency(ven.balanceAmount)}
                        </td>
                        <td className="py-2 px-2.5 text-right">
                          <Badge variant="outline" size="sm">
                            {ven.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section 3: Shopping Register & Sacred Shagun (Strictly Decoupled) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Shopping Variance */}
            <div className="bg-ivory-light rounded-2xl p-5 border border-gold/30 card-shadow space-y-3">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-burgundy" />
                <h2 className="text-sm font-bold font-royal text-burgundy">
                  {t.reports.shoppingSummaryTitle}
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-ivory border border-gold/25">
                  <span className="text-[10px] text-charcoal-muted block font-medium">Estimated Budget</span>
                  <span className="text-base font-bold text-charcoal block mt-0.5">
                    {formatCurrency(report.shopping.estimatedTotal)}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-ivory border border-gold/25">
                  <span className="text-[10px] text-charcoal-muted block font-medium">Actual Spent</span>
                  <span className="text-base font-bold text-burgundy block mt-0.5">
                    {formatCurrency(report.shopping.actualSpent)}
                  </span>
                </div>
              </div>

              <div className="text-xs text-charcoal-muted pt-1">
                Variance: <strong>{formatCurrency(report.shopping.variance)}</strong> ({report.shopping.purchasedCount} of {report.shopping.totalItems} items purchased)
              </div>
            </div>

            {/* Sacred Gifts & Shagun Ledger */}
            <div className="bg-ivory-light rounded-2xl p-5 border border-gold/30 card-shadow space-y-3">
              <div className="flex items-center gap-2">
                <Gift className="w-4 h-4 text-sage" />
                <h2 className="text-sm font-bold font-royal text-burgundy">
                  {t.reports.shagunSummaryTitle}
                </h2>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2">
                <div className="p-2.5 rounded-xl bg-ivory border border-gold/25 text-center">
                  <span className="text-[10px] text-charcoal-muted block font-medium">Total Cash Shagun</span>
                  <span className="text-sm font-bold text-sage-dark block mt-0.5">
                    {formatCurrency(report.shagunGifts.totalCashShagun)}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-ivory border border-gold/25 text-center">
                  <span className="text-[10px] text-charcoal-muted block font-medium">Bride's Side</span>
                  <span className="text-sm font-bold text-burgundy block mt-0.5">
                    {formatCurrency(report.shagunGifts.brideSideAmount)}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-ivory border border-gold/25 text-center">
                  <span className="text-[10px] text-charcoal-muted block font-medium">Groom's Side</span>
                  <span className="text-sm font-bold text-charcoal block mt-0.5">
                    {formatCurrency(report.shagunGifts.groomSideAmount)}
                  </span>
                </div>
              </div>

              <div className="text-xs text-charcoal-muted pt-1">
                Total Gifts: {report.shagunGifts.totalGiftsCount} ({report.shagunGifts.cashEnvelopesCount} envelopes, {report.shagunGifts.jewelleryGiftsCount} jewellery, {report.shagunGifts.physicalGiftsCount} physical)
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
