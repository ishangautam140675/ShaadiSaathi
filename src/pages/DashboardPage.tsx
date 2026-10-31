import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from '../context/LanguageContext';
import { useWedding } from '../context/WeddingContext';
import { MetricCard } from '../components/common/MetricCard';
import { Badge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { AddExpenseModal } from '../components/modals/AddExpenseModal';
import { RecordShagunModal } from '../components/modals/RecordShagunModal';
import { PhaseNoticeModal } from '../components/common/PhaseNoticeModal';
import {
  Wallet,
  CreditCard,
  PiggyBank,
  Clock,
  Plus,
  Gift,
  CheckSquare,
  ScanLine,
  ArrowUpRight,
  TrendingUp,
  Sparkles,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { t, language } = useTranslation();
  const {
    summary,
    budgetCategories,
    expenses,
    checklistTasks,
    isPreviewMode,
    togglePreviewMode,
    toggleTaskCompletion,
  } = useWedding();

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isShagunModalOpen, setIsShagunModalOpen] = useState(false);
  const [isTaskNoticeOpen, setIsTaskNoticeOpen] = useState(false);
  const [isScanNoticeOpen, setIsScanNoticeOpen] = useState(false);

  const formatCurrency = (val: number) => {
    return `₹${val.toLocaleString('en-IN')}`;
  };

  const recentExpenses = expenses.slice(0, 5);
  const upcomingTasks = checklistTasks.filter((t) => !t.isCompleted).slice(0, 4);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Dashboard Top Title & Mode Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-gold/25">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-royal text-burgundy">
            {t.dashboard.title}
          </h1>
          <p className="text-xs sm:text-sm text-charcoal-muted mt-1">
            {t.dashboard.subtitle}
          </p>
        </div>

        {/* Quick Mode Toggle for Testing */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={togglePreviewMode}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs ${
              isPreviewMode
                ? 'bg-rose text-burgundy border-gold/50 hover:bg-rose-dark/30'
                : 'bg-ivory-light text-sage-dark border-sage/40 hover:bg-sage/10'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-gold-dark" />
            <span>
              {isPreviewMode
                ? language === 'hi'
                  ? 'डेमो डेटा चालू (टॉगल करें)'
                  : 'Demo Preview ON (Toggle)'
                : language === 'hi'
                  ? 'खाली स्थिति (टॉगल करें)'
                  : 'Empty State (Toggle)'}
            </span>
          </button>
        </div>
      </div>

      {/* Financial Health Metrics Grid */}
      <section aria-label="Wedding Budget Metrics">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Budget */}
          <MetricCard
            title={t.dashboard.totalBudget}
            value={formatCurrency(summary.totalBudget)}
            subtitle={`${summary.brideName} & ${summary.groomName}`}
            icon={<Wallet className="w-5 h-5" />}
            variant="burgundy"
          />

          {/* Total Expenses Paid */}
          <MetricCard
            title={t.dashboard.totalSpent}
            value={formatCurrency(summary.totalSpent)}
            subtitle={`${summary.budgetUtilizationPct}% of total budget`}
            icon={<CreditCard className="w-5 h-5" />}
            variant="ivory"
            badge={
              <Badge variant="rose" size="sm">
                {summary.budgetUtilizationPct}%
              </Badge>
            }
          />

          {/* Remaining Budget */}
          <MetricCard
            title={t.dashboard.remainingBudget}
            value={formatCurrency(summary.remainingBudget)}
            subtitle="Available uncommitted funds"
            icon={<PiggyBank className="w-5 h-5" />}
            variant="sage"
            badge={
              <Badge variant="sage" size="sm">
                Safe
              </Badge>
            }
          />

          {/* Pending Vendor Balances */}
          <MetricCard
            title={t.dashboard.pendingPayments}
            value={formatCurrency(summary.totalPendingPayments)}
            subtitle="Due to booked vendors"
            icon={<Clock className="w-5 h-5" />}
            variant="gold"
          />
        </div>
      </section>

      {/* Budget Utilization Progress Bar */}
      <section className="bg-ivory-light rounded-2xl p-5 border border-gold/30 card-shadow">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-burgundy" />
            <h2 className="text-xs sm:text-sm font-bold text-burgundy uppercase tracking-wider">
              {t.dashboard.budgetUtilization}
            </h2>
          </div>
          <span className="text-xs font-bold text-burgundy">
            {summary.budgetUtilizationPct}% ({formatCurrency(summary.totalSpent)} / {formatCurrency(summary.totalBudget)})
          </span>
        </div>

        <div
          role="progressbar"
          aria-valuenow={summary.budgetUtilizationPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t.dashboard.budgetUtilization}
          className="w-full bg-rose/40 h-3.5 rounded-full overflow-hidden border border-gold/30 p-0.5"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-burgundy via-burgundy-light to-gold transition-all duration-500"
            style={{ width: `${Math.min(summary.budgetUtilizationPct, 100)}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-charcoal-muted mt-2">
          <span>₹0</span>
          <span>50% ({formatCurrency(summary.totalBudget / 2)})</span>
          <span>100% ({formatCurrency(summary.totalBudget)})</span>
        </div>
      </section>

      {/* Quick Actions Row */}
      <section aria-label="Quick Actions">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-burgundy uppercase tracking-wider font-royal">
            {t.dashboard.quickActions}
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={() => setIsExpenseModalOpen(true)}
            className="p-4 rounded-2xl bg-ivory-light hover:bg-rose/40 border border-gold/40 text-left transition-all duration-200 card-shadow hover:card-shadow-hover group cursor-pointer flex flex-col justify-between"
          >
            <div className="w-9 h-9 rounded-xl bg-burgundy/10 text-burgundy flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm font-bold text-burgundy block">
                {t.dashboard.addExpense}
              </span>
              <span className="text-[11px] text-charcoal-muted mt-0.5 block">
                {language === 'hi' ? 'कैटरर, वेन्यू, खरीदारी' : 'Catering, venue, shopping'}
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setIsShagunModalOpen(true)}
            className="p-4 rounded-2xl bg-ivory-light hover:bg-rose/40 border border-gold/40 text-left transition-all duration-200 card-shadow hover:card-shadow-hover group cursor-pointer flex flex-col justify-between"
          >
            <div className="w-9 h-9 rounded-xl bg-gold/20 text-gold-dark flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm font-bold text-burgundy block">
                {t.dashboard.recordShagun}
              </span>
              <span className="text-[11px] text-charcoal-muted mt-0.5 block">
                {language === 'hi' ? 'लिफ़ाफ़ा एवं आशीर्वाद' : 'Cash envelope & blessings'}
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setIsTaskNoticeOpen(true)}
            className="p-4 rounded-2xl bg-ivory-light hover:bg-rose/40 border border-gold/40 text-left transition-all duration-200 card-shadow hover:card-shadow-hover group cursor-pointer flex flex-col justify-between"
          >
            <div className="w-9 h-9 rounded-xl bg-sage/20 text-sage-dark flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm font-bold text-burgundy block">
                {t.dashboard.newTask}
              </span>
              <span className="text-[11px] text-charcoal-muted mt-0.5 block">
                {language === 'hi' ? 'परिवार के दायित्व' : 'Duties & timeline'}
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setIsScanNoticeOpen(true)}
            className="p-4 rounded-2xl bg-ivory-light hover:bg-rose/40 border border-gold/40 text-left transition-all duration-200 card-shadow hover:card-shadow-hover group cursor-pointer flex flex-col justify-between"
          >
            <div className="w-9 h-9 rounded-xl bg-rose text-burgundy flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <ScanLine className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm font-bold text-burgundy block">
                {t.dashboard.scanBill}
              </span>
              <span className="text-[11px] text-charcoal-muted mt-0.5 block">
                {language === 'hi' ? 'पर्ची व बिल फोटो' : 'Bill slip verification'}
              </span>
            </div>
          </button>
        </div>
      </section>

      {/* Main Grid: Recent Expenses + Upcoming Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Expenses List (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold font-royal text-burgundy">
              {t.dashboard.recentTransactions}
            </h2>
            <NavLink
              to="/expenses"
              className="text-xs font-semibold text-burgundy hover:text-gold-dark flex items-center gap-1 transition-colors"
            >
              <span>{t.dashboard.viewAllExpenses}</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </NavLink>
          </div>

          {recentExpenses.length === 0 ? (
            <EmptyState
              title={t.expenses.emptyTitle}
              description={t.dashboard.noRecentExpenses}
              actionLabel={t.dashboard.addExpense}
              onAction={() => setIsExpenseModalOpen(true)}
              secondaryActionLabel={t.dashboard.emptyStateToggle}
              onSecondaryAction={togglePreviewMode}
            />
          ) : (
            <div className="bg-ivory-light rounded-2xl border border-gold/30 divide-y divide-gold/20 card-shadow overflow-hidden">
              {recentExpenses.map((exp) => (
                <div
                  key={exp.id}
                  className="p-4 flex items-center justify-between gap-3 hover:bg-rose-light/30 transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-burgundy/10 text-burgundy flex items-center justify-center flex-shrink-0 mt-0.5 font-bold text-xs uppercase">
                      {exp.category.slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-charcoal truncate">
                        {exp.title}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-charcoal-muted mt-0.5 flex-wrap">
                        <span>{exp.date}</span>
                        <span>&bull;</span>
                        <span className="truncate">{exp.paidBy}</span>
                        <span>&bull;</span>
                        <Badge
                          variant={exp.side === 'bride' ? 'rose' : exp.side === 'groom' ? 'gold' : 'sage'}
                          size="sm"
                        >
                          {exp.side === 'bride' ? t.common.brideSide : exp.side === 'groom' ? t.common.groomSide : t.common.mutual}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <span className="text-sm sm:text-base font-bold text-burgundy block">
                      {formatCurrency(exp.amount)}
                    </span>
                    <Badge
                      variant={exp.status === 'paid' ? 'sage' : exp.status === 'partial' ? 'gold' : 'rose'}
                      size="sm"
                      className="mt-1"
                    >
                      {exp.status === 'paid' ? t.expenses.paid : exp.status === 'partial' ? t.expenses.partial : t.expenses.pending}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Tasks & Category Snapshot (1 Col) */}
        <div className="space-y-6">
          {/* Upcoming Tasks */}
          <div className="bg-ivory-light rounded-2xl p-5 border border-gold/30 card-shadow space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold font-royal text-burgundy">
                {t.dashboard.upcomingTasks}
              </h2>
              <NavLink
                to="/checklist"
                className="text-xs font-semibold text-gold-dark hover:underline"
              >
                {t.nav.checklist}
              </NavLink>
            </div>

            {upcomingTasks.length === 0 ? (
              <p className="text-xs text-charcoal-muted py-4 text-center">
                {t.dashboard.noUpcomingTasks}
              </p>
            ) : (
              <div className="space-y-2.5">
                {upcomingTasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-3 rounded-xl bg-ivory border border-gold/25 flex items-start gap-3 hover:border-gold/50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      id={`dash-task-${task.id}`}
                      checked={task.isCompleted}
                      onChange={() => toggleTaskCompletion(task.id)}
                      className="w-4 h-4 rounded text-burgundy border-gold/50 focus:ring-burgundy mt-0.5 cursor-pointer"
                    />
                    <label htmlFor={`dash-task-${task.id}`} className="min-w-0 flex-1 cursor-pointer">
                      <p className="text-xs font-medium text-charcoal leading-snug">
                        {task.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-charcoal-muted">
                        <span className="font-semibold text-burgundy">
                          {task.assignedTo}
                        </span>
                        <span>&bull;</span>
                        <span>{task.dueDate}</span>
                      </div>
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Budget Categories Miniature Snapshot */}
          <div className="bg-ivory-light rounded-2xl p-5 border border-gold/30 card-shadow space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold font-royal text-burgundy">
                {t.dashboard.budgetByCategory}
              </h2>
              <NavLink
                to="/reports"
                className="text-xs font-semibold text-gold-dark hover:underline"
              >
                {t.nav.reports}
              </NavLink>
            </div>

            <div className="space-y-2 text-xs">
              {budgetCategories.slice(0, 4).map((cat) => {
                const pct = cat.allocatedAmount > 0 ? (cat.spentAmount / cat.allocatedAmount) * 100 : 0;
                return (
                  <div key={cat.category} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-charcoal capitalize">
                        {t.categories[cat.category]}
                      </span>
                      <span className="text-charcoal-muted font-mono">
                        {formatCurrency(cat.spentAmount)} / {formatCurrency(cat.allocatedAmount)}
                      </span>
                    </div>
                    <div className="w-full bg-rose/30 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-burgundy h-full rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <AddExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
      />

      <RecordShagunModal
        isOpen={isShagunModalOpen}
        onClose={() => setIsShagunModalOpen(false)}
      />

      <PhaseNoticeModal
        isOpen={isTaskNoticeOpen}
        onClose={() => setIsTaskNoticeOpen(false)}
        featureName={language === 'hi' ? 'कार्य आवंटन व समयरेखा' : 'Task Assignment & Timeline'}
        targetPhase="Phase 1 Ready"
        description={
          language === 'hi'
            ? 'तैयारी चेकलिस्ट पृष्ठ पर जाकर आप रस्मों, खरीदारी और परिवार के सदस्यों के दायित्वों को पूरा या अधूरा मार्क कर सकते हैं।'
            : 'Visit the Checklist screen to interactively view, filter, and track family member responsibilities.'
        }
      />

      <PhaseNoticeModal
        isOpen={isScanNoticeOpen}
        onClose={() => setIsScanNoticeOpen(false)}
        featureName="SmartScan Receipt Upload"
        targetPhase="Phase 5"
        description={
          language === 'hi'
            ? 'स्मार्ट स्कैन रसीद फोटो से जानकारी पढ़ने का काम फेज़ 5 में करेगा। आप स्मार्ट स्कैन स्क्रीन पर जाकर 4-चरणीय सत्यापन प्रक्रिया का पूर्वावलोकन देख सकते हैं।'
            : 'Camera and slip OCR will be integrated in Phase 5 using open-source, free-tier document processing. Visit the SmartScan screen to preview the 4-step human-verified staging workflow.'
        }
      />
    </div>
  );
};
