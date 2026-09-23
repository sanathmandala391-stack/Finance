import React, { useMemo } from 'react';
import { Customer, FinanceSummaryStats, PaymentRecord } from '../../types/finance';
import { StatCard } from '../common/StatCard';
import { formatINR } from '../../utils/currency';
import { formatDisplayDate, getTodayISO } from '../../utils/dateUtils';
import { computeCustomerFinancialProfile } from '../../utils/financeCalculations';
import { useLanguage } from '../../hooks/useLanguage';
import {
  Users,
  Coins,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  PlusCircle,
  Clock,
  CheckCircle2,
  Wallet,
  Building2,
} from 'lucide-react';

interface DashboardViewProps {
  stats: FinanceSummaryStats;
  customers: Customer[];
  payments: PaymentRecord[];
  onNavigateToTab: (tab: string) => void;
  onSelectCustomer: (customer: Customer) => void;
  onOpenAddCustomer: () => void;
  todayDate?: string;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  customers,
  payments,
  onNavigateToTab,
  onSelectCustomer,
  onOpenAddCustomer,
  todayDate = getTodayISO(),
}) => {
  const { t } = useLanguage();

  // Find customers who have overdue payments
  const overdueCustomers = useMemo(() => {
    return customers
      .map((c) => ({
        customer: c,
        profile: computeCustomerFinancialProfile(c, payments, todayDate),
      }))
      .filter((item) => item.profile.dueDaysCount > 0)
      .sort((a, b) => b.profile.totalDueTillToday - a.profile.totalDueTillToday);
  }, [customers, payments, todayDate]);

  // Recent payments
  const recentPayments = useMemo(() => {
    return [...payments]
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
      .slice(0, 6);
  }, [payments]);

  // Village summary
  const villageStats = useMemo(() => {
    const map: { [village: string]: { count: number; totalFinance: number; totalDue: number } } = {};
    customers.forEach((c) => {
      const v = c.village.trim() || 'Other';
      if (!map[v]) {
        map[v] = { count: 0, totalFinance: 0, totalDue: 0 };
      }
      map[v].count += 1;
      map[v].totalFinance += c.financeAmount;
      const profile = computeCustomerFinancialProfile(c, payments, todayDate);
      map[v].totalDue += profile.totalDueTillToday;
    });

    return Object.entries(map).map(([village, data]) => ({
      village,
      ...data,
    }));
  }, [customers, payments, todayDate]);

  const todayProgress = stats.todayExpectedCollection > 0
    ? Math.min(100, Math.round((stats.todayCollected / stats.todayExpectedCollection) * 100))
    : 100;

  return (
    <div className="space-y-6 pb-24">
      {/* Top Banner: Today's Run Hero Card (Black & Gold) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-dark-850 via-dark-900 to-black text-white p-6 sm:p-7 shadow-2xl border border-gold-500/30">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold-500/20 border border-gold-500/40 text-gold-400 text-xs font-black uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{t('appName')} • {formatDisplayDate(todayDate)}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              {t('todaysCollection')}: {formatINR(stats.todayCollected)}
              <span className="text-lg font-normal text-slate-400"> / {formatINR(stats.todayExpectedCollection)}</span>
            </h2>
            <p className="text-xs sm:text-sm text-gold-200/80 max-w-xl font-medium">
              {stats.todayPending > 0
                ? `${t('todaysPending')}: ${formatINR(stats.todayPending)} (${stats.activeCustomers} ${t('active')})`
                : t('allOnSchedule')}
            </p>

            {/* Today Progress bar */}
            <div className="pt-2 max-w-md space-y-1">
              <div className="flex justify-between text-xs font-bold text-slate-300">
                <span className="text-gold-400">{todayProgress}% {t('todaysCollected')}</span>
                <span className="text-amber-300">{t('todaysPending')}: {formatINR(stats.todayPending)}</span>
              </div>
              <div className="w-full bg-dark-950 rounded-full h-3 overflow-hidden p-0.5 border border-gold-500/30">
                <div
                  className="bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300 h-full rounded-full transition-all duration-500 shadow-glow-gold"
                  style={{ width: `${todayProgress}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigateToTab('today')}
              className="px-6 py-3.5 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-600 hover:to-yellow-600 active:scale-95 text-dark-950 font-black text-sm rounded-2xl shadow-glow-gold flex items-center gap-2 transition-all"
            >
              <span>{t('openTodaysRun')}</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
            <button
              onClick={onOpenAddCustomer}
              className="px-4 py-3.5 bg-dark-800 hover:bg-dark-750 active:scale-95 text-gold-400 font-bold text-sm rounded-2xl border border-gold-500/30 flex items-center gap-2 transition-all"
            >
              <PlusCircle className="w-4 h-4 text-amber-400" />
              <span>{t('newLoan')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main 4 Primary Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Customers */}
        <StatCard
          title={t('totalCustomers')}
          value={stats.totalCustomers}
          subtitle={`${stats.activeCustomers} ${t('active')} • ${stats.completedCustomers} ${t('completed')}`}
          icon={<Users className="w-6 h-6" />}
          iconBgColor="bg-gold-500/10 border border-gold-500/30"
          iconColor="text-gold-400"
          onClick={() => onNavigateToTab('customers')}
        />

        {/* Upfront Profit (Strictly Separated) */}
        <StatCard
          title={t('upfrontProfitCut')}
          value={formatINR(stats.totalUpfrontProfit)}
          subtitle={t('upfrontProfitDesc')}
          icon={<Coins className="w-6 h-6" />}
          iconBgColor="bg-amber-500/10 border border-amber-500/30"
          iconColor="text-amber-400"
        />

        {/* Actual Cash Disbursed */}
        <StatCard
          title={t('actualCashGiven')}
          value={formatINR(stats.totalActualDisbursed)}
          subtitle={t('actualCashGivenDesc')}
          icon={<Wallet className="w-6 h-6" />}
          iconBgColor="bg-emerald-500/10 border border-emerald-500/30"
          iconColor="text-emerald-400"
        />

        {/* Total Outstanding Past Due */}
        <StatCard
          title={t('totalOutstandingDue')}
          value={formatINR(stats.totalOutstandingDue)}
          subtitle={t('missedInstallments')}
          icon={<AlertTriangle className="w-6 h-6" />}
          iconBgColor={stats.totalOutstandingDue > 0 ? 'bg-rose-500/10 border border-rose-500/30' : 'bg-dark-800 border border-dark-750'}
          iconColor={stats.totalOutstandingDue > 0 ? 'text-rose-400' : 'text-slate-400'}
        />
      </div>

      {/* Secondary Financial Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-dark-900 border border-gold-500/20 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase">{t('todaysTarget')}</span>
          <div className="text-xl font-black text-white font-mono mt-1">
            {formatINR(stats.todayExpectedCollection)}
          </div>
          <span className="text-[10px] text-gold-300/70">1% {t('dailyCollection1Percent')}</span>
        </div>

        <div className="p-4 rounded-2xl bg-dark-900 border border-emerald-500/30 shadow-sm">
          <span className="text-[11px] font-bold text-emerald-400 uppercase">
            {t('todaysCollected')}
          </span>
          <div className="text-xl font-black text-emerald-400 font-mono mt-1">
            {formatINR(stats.todayCollected)}
          </div>
          <span className="text-[10px] text-emerald-500/80">{t('paidTodayBadge')}</span>
        </div>

        <div className="p-4 rounded-2xl bg-dark-900 border border-gold-500/20 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase">{t('totalCollectedAllTime')}</span>
          <div className="text-xl font-black text-gold-400 font-mono mt-1">
            {formatINR(stats.totalCustomerCollections)}
          </div>
          <span className="text-[10px] text-slate-400">{payments.length} {t('paymentHistory')}</span>
        </div>

        <div className="p-4 rounded-2xl bg-dark-900 border border-gold-500/20 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase">{t('remainingBalance')}</span>
          <div className="text-xl font-black text-white font-mono mt-1">
            {formatINR(stats.totalRepaymentBalance)}
          </div>
          <span className="text-[10px] text-slate-400">{t('balanceDue')}</span>
        </div>
      </div>

      {/* Two Column Section: Overdue Defaulters Alert & Recent Collections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Overdue Attention List */}
        <div className="bg-dark-900 rounded-3xl border border-gold-500/20 p-5 sm:p-6 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-dark-750">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-950 border border-rose-500/40 text-rose-400 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">
                    {t('overdueCustomers')} ({overdueCustomers.length})
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium">{t('missedInstallments')}</p>
                </div>
              </div>

              <button
                onClick={() => onNavigateToTab('customers')}
                className="text-xs font-bold text-gold-400 hover:underline"
              >
                {t('viewAll')}
              </button>
            </div>

            {overdueCustomers.length === 0 ? (
              <div className="py-10 text-center text-slate-400">
                <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-400 mb-2" />
                <p className="font-bold text-sm text-slate-200">{t('noOverdue')}</p>
                <p className="text-xs text-slate-500 mt-0.5">{t('allOnSchedule')}</p>
              </div>
            ) : (
              <div className="divide-y divide-dark-750 my-2">
                {overdueCustomers.slice(0, 4).map(({ customer, profile }) => (
                  <div
                    key={customer.id}
                    onClick={() => onSelectCustomer(customer)}
                    className="py-3 flex items-center justify-between cursor-pointer hover:bg-dark-850 px-2 rounded-xl transition-colors"
                  >
                    <div>
                      <h4 className="font-bold text-sm text-white">
                        {customer.name}
                      </h4>
                      <p className="text-xs text-slate-400">
                        {customer.village} • {profile.dueDaysCount} {t('due')}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-extrabold text-sm text-rose-400">
                        {formatINR(profile.totalDueTillToday)}
                      </div>
                      <span className="text-[10px] text-slate-400">{t('due')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => onNavigateToTab('customers')}
            className="mt-3 w-full py-2.5 rounded-xl bg-dark-800 hover:bg-dark-750 border border-gold-500/20 text-gold-400 font-bold text-xs transition-all text-center"
          >
            {t('defaultersList')}
          </button>
        </div>

        {/* Recent Collections Feed */}
        <div className="bg-dark-900 rounded-3xl border border-gold-500/20 p-5 sm:p-6 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-dark-750">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">
                    {t('recentCollections')}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium">{t('paymentHistory')}</p>
                </div>
              </div>

              <button
                onClick={() => onNavigateToTab('history')}
                className="text-xs font-bold text-gold-400 hover:underline"
              >
                {t('fullLedger')}
              </button>
            </div>

            {recentPayments.length === 0 ? (
              <div className="py-10 text-center text-slate-400">
                <p className="font-bold text-sm">{t('noRecent')}</p>
              </div>
            ) : (
              <div className="divide-y divide-dark-750 my-2">
                {recentPayments.map((p) => (
                  <div
                    key={p.id}
                    className="py-3 flex items-center justify-between px-2 rounded-xl"
                  >
                    <div>
                      <h4 className="font-bold text-sm text-white">
                        {p.customerName || 'Customer'}
                      </h4>
                      <p className="text-xs text-slate-400">
                        {t('day')} {p.dayNumber} • {formatDisplayDate(p.paymentDate)} ({p.paymentMethod})
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-extrabold text-sm text-emerald-400">
                        +{formatINR(p.amount)}
                      </div>
                      <span className="text-[10px] font-mono text-gold-300/60">{p.receiptNumber}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => onNavigateToTab('history')}
            className="mt-3 w-full py-2.5 rounded-xl bg-dark-800 hover:bg-dark-750 border border-gold-500/20 text-gold-400 font-bold text-xs transition-all text-center"
          >
            {t('fullLedger')}
          </button>
        </div>
      </div>

      {/* Village Distribution Summary */}
      <div className="bg-dark-900 rounded-3xl border border-gold-500/20 p-5 sm:p-6 shadow-card">
        <div className="flex items-center gap-2 pb-4 border-b border-dark-750">
          <Building2 className="w-5 h-5 text-amber-400" />
          <h3 className="font-extrabold text-base text-white">
            {t('villagePortfolio')}
          </h3>
        </div>

        {villageStats.length === 0 ? (
          <div className="py-8 text-center text-slate-400">
            <p className="font-bold text-sm text-slate-300">No village loans added yet.</p>
            <p className="text-xs text-slate-500 mt-1">Start by adding your first real village customer loan.</p>
            <button
              onClick={onOpenAddCustomer}
              className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-dark-950 font-black text-xs rounded-xl shadow-glow-gold"
            >
              <PlusCircle className="w-4 h-4 stroke-[2.5]" />
              <span>{t('addCustomer')}</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pt-4">
            {villageStats.map((v) => (
              <div
                key={v.village}
                className="p-3.5 rounded-2xl bg-dark-850 border border-gold-500/20"
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm text-white">
                    📍 {v.village}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gold-500/20 text-gold-400 border border-gold-500/30 font-bold">
                    {v.count} {t('customers')}
                  </span>
                </div>
                <div className="mt-2 text-xs space-y-1">
                  <div className="flex justify-between text-slate-400">
                    <span>{t('totalFinanceBook')}:</span>
                    <span className="font-mono font-bold text-white">{formatINR(v.totalFinance)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>{t('due')}:</span>
                    <span className={`font-mono font-bold ${v.totalDue > 0 ? 'text-rose-400' : 'text-slate-200'}`}>
                      {formatINR(v.totalDue)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
