import React, { useMemo } from 'react';
import { Customer, FinanceSummaryStats, PaymentRecord } from '../../types/finance';
import { formatINR } from '../../utils/currency';
import { formatDisplayDate, getTodayISO } from '../../utils/dateUtils';
import { computeCustomerFinancialProfile } from '../../utils/financeCalculations';
import { exportCustomersToCSV } from '../../utils/csvExport';
import { useLanguage } from '../../hooks/useLanguage';
import {
  BarChart3,
  Building2,
  AlertTriangle,
  FileSpreadsheet,
  Coins,
  CheckCircle2,
} from 'lucide-react';

interface ReportsViewProps {
  stats: FinanceSummaryStats;
  customers: Customer[];
  payments: PaymentRecord[];
  onSelectCustomer: (customer: Customer) => void;
  todayDate?: string;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  stats,
  customers,
  payments,
  onSelectCustomer,
  todayDate = getTodayISO(),
}) => {
  const { t } = useLanguage();

  // Profit & Loss Realized Breakdown
  const pnl = useMemo(() => {
    const totalFinanceDisbursed = stats.totalActualDisbursed; // 90%
    const upfrontProfit = stats.totalUpfrontProfit; // 10%
    const dailyCollections = stats.totalCustomerCollections;
    const totalCashInflow = upfrontProfit + dailyCollections;
    const netCashPosition = totalCashInflow - totalFinanceDisbursed;

    return {
      totalFinanceDisbursed,
      upfrontProfit,
      dailyCollections,
      totalCashInflow,
      netCashPosition,
    };
  }, [stats]);

  // Village analytics
  const villageAnalytics = useMemo(() => {
    const map: {
      [village: string]: {
        customers: number;
        totalFinance: number;
        totalCollected: number;
        totalDue: number;
        expectedTillToday: number;
      };
    } = {};

    customers.forEach((c) => {
      const v = c.village.trim() || 'Other';
      if (!map[v]) {
        map[v] = { customers: 0, totalFinance: 0, totalCollected: 0, totalDue: 0, expectedTillToday: 0 };
      }
      map[v].customers += 1;
      map[v].totalFinance += c.financeAmount;

      const profile = computeCustomerFinancialProfile(c, payments, todayDate);
      map[v].totalCollected += profile.totalCollected;
      map[v].totalDue += profile.totalDueTillToday;
      map[v].expectedTillToday += profile.totalExpectedTillToday;
    });

    return Object.entries(map).map(([village, d]) => {
      const efficiency = d.expectedTillToday > 0 ? Math.min(100, Math.round((d.totalCollected / d.expectedTillToday) * 100)) : 100;
      return {
        village,
        ...d,
        efficiency,
      };
    }).sort((a, b) => b.totalFinance - a.totalFinance);
  }, [customers, payments, todayDate]);

  // Defaulter list
  const defaulters = useMemo(() => {
    return customers
      .map((c) => {
        const profile = computeCustomerFinancialProfile(c, payments, todayDate);
        return { customer: c, profile };
      })
      .filter((item) => item.profile.dueDaysCount > 0)
      .sort((a, b) => b.profile.totalDueTillToday - a.profile.totalDueTillToday);
  }, [customers, payments, todayDate]);

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-gold-400" />
            <span>{t('financialReports')}</span>
          </h2>
          <p className="text-xs sm:text-sm text-gold-200/70 font-medium">
            {t('pnlTitle')}
          </p>
        </div>

        <button
          onClick={() => exportCustomersToCSV(customers, payments)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-dark-900 hover:bg-dark-850 border border-gold-500/30 text-gold-400 rounded-xl text-xs font-bold transition-all shadow-sm"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          <span>{t('exportCSV')}</span>
        </button>
      </div>

      {/* 1. Profit & Loss Statement Card (Black & Gold) */}
      <div className="bg-dark-900 rounded-3xl border border-gold-500/30 p-5 sm:p-6 shadow-card space-y-4">
        <div className="flex items-center justify-between border-b border-dark-750 pb-3">
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-amber-400" />
            <h3 className="font-extrabold text-base text-white">
              {t('pnlTitle')}
            </h3>
          </div>
          <span className="text-xs text-gold-400 font-mono font-medium">As of {formatDisplayDate(todayDate)}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-dark-850 border border-amber-500/30">
            <span className="text-[10px] font-bold text-amber-400 uppercase">
              {t('profit10Percent')}
            </span>
            <div className="text-2xl font-black text-amber-400 font-mono mt-0.5">
              {formatINR(pnl.upfrontProfit)}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">{t('profitPocketed')}</p>
          </div>

          <div className="p-4 rounded-2xl bg-dark-850 border border-emerald-500/30">
            <span className="text-[10px] font-bold text-emerald-400 uppercase">
              {t('totalCollectedAllTime')}
            </span>
            <div className="text-2xl font-black text-emerald-400 font-mono mt-0.5">
              {formatINR(pnl.dailyCollections)}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">1% {t('dailyCollection1Percent')}</p>
          </div>

          <div className="p-4 rounded-2xl bg-dark-850 border border-dark-750">
            <span className="text-[10px] font-bold text-slate-400 uppercase">
              {t('cashGiven90Percent')}
            </span>
            <div className="text-2xl font-black text-white font-mono mt-0.5">
              {formatINR(pnl.totalFinanceDisbursed)}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">{t('cashToBorrower')}</p>
          </div>

          <div className="p-4 rounded-2xl bg-black text-white border border-gold-500/40 shadow-glow-gold">
            <span className="text-[10px] font-bold text-gold-400 uppercase">
              {t('netCashPosition')}
            </span>
            <div className="text-2xl font-black font-mono mt-0.5 text-white">
              {formatINR(pnl.netCashPosition)}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Total Inflow - Cash Given</p>
          </div>
        </div>
      </div>

      {/* 2. Village Portfolio Breakdown Table */}
      <div className="bg-dark-900 rounded-3xl border border-gold-500/20 p-5 sm:p-6 shadow-card space-y-4">
        <div className="flex items-center justify-between border-b border-dark-750 pb-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-amber-400" />
            <h3 className="font-extrabold text-base text-white">
              {t('villagePerformance')}
            </h3>
          </div>
          <span className="text-xs text-gold-400 font-medium">{villageAnalytics.length} {t('allVillages')}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-dark-850 border-b border-dark-750 text-slate-400 font-bold uppercase tracking-wider">
                <th className="p-3">Village / Area</th>
                <th className="p-3">{t('customers')}</th>
                <th className="p-3">{t('totalFinanceBook')}</th>
                <th className="p-3">{t('totalCollectedCust')}</th>
                <th className="p-3">{t('due')}</th>
                <th className="p-3 text-right">Collection Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-750">
              {villageAnalytics.map((v) => (
                <tr key={v.village} className="hover:bg-dark-850 transition-colors">
                  <td className="p-3 font-bold text-white">
                    📍 {v.village}
                  </td>
                  <td className="p-3 font-semibold text-slate-300">
                    {v.customers}
                  </td>
                  <td className="p-3 font-mono font-bold text-white">
                    {formatINR(v.totalFinance)}
                  </td>
                  <td className="p-3 font-mono font-bold text-emerald-400">
                    {formatINR(v.totalCollected)}
                  </td>
                  <td className="p-3 font-mono font-bold text-rose-400">
                    {formatINR(v.totalDue)}
                  </td>
                  <td className="p-3 text-right">
                    <span
                      className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-black font-mono ${
                        v.efficiency >= 90
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                          : v.efficiency >= 70
                          ? 'bg-amber-950 text-amber-300 border border-amber-500/40'
                          : 'bg-rose-950 text-rose-300 border border-rose-500/40'
                      }`}
                    >
                      {v.efficiency}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Defaulters / High Due Ranking */}
      <div className="bg-dark-900 rounded-3xl border border-gold-500/20 p-5 sm:p-6 shadow-card space-y-4">
        <div className="flex items-center justify-between border-b border-dark-750 pb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-400" />
            <div>
              <h3 className="font-extrabold text-base text-white">
                {t('defaultersList')}
              </h3>
            </div>
          </div>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-950 text-rose-400 border border-rose-500/30 font-bold">
            {defaulters.length} {t('due')}
          </span>
        </div>

        {defaulters.length === 0 ? (
          <div className="py-10 text-center text-slate-400">
            <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-400 mb-2" />
            <p className="font-bold text-sm text-slate-200">{t('noOverdue')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-dark-850 border-b border-dark-750 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="p-3">{t('customerName')}</th>
                  <th className="p-3">Village</th>
                  <th className="p-3">{t('dailyCollection1Percent')}</th>
                  <th className="p-3">Missed Days</th>
                  <th className="p-3">{t('due')}</th>
                  <th className="p-3">{t('balanceDue')}</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-750">
                {defaulters.map(({ customer, profile }) => (
                  <tr key={customer.id} className="hover:bg-dark-850 transition-colors">
                    <td className="p-3 font-bold text-white">
                      {customer.name}
                    </td>
                    <td className="p-3 text-slate-300">
                      {customer.village}
                    </td>
                    <td className="p-3 font-mono font-bold text-gold-400">
                      {formatINR(customer.dailyRate)}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-md bg-rose-950 text-rose-400 font-black font-mono border border-rose-500/30">
                        {profile.dueDaysCount} {t('day')}
                      </span>
                    </td>
                    <td className="p-3 font-mono font-black text-rose-400 text-sm">
                      {formatINR(profile.totalDueTillToday)}
                    </td>
                    <td className="p-3 font-mono text-slate-300">
                      {formatINR(profile.totalRemainingBalance)}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => onSelectCustomer(customer)}
                        className="px-3 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 text-dark-950 font-black text-xs shadow-glow-gold transition-all"
                      >
                        {t('clearPastDue')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
