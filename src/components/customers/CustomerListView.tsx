import React, { useState, useMemo } from 'react';
import { Customer, PaymentRecord } from '../../types/finance';
import { computeCustomerFinancialProfile } from '../../utils/financeCalculations';
import { formatINR } from '../../utils/currency';
import { getTodayISO } from '../../utils/dateUtils';
import { StatusBadge } from '../common/StatusBadge';
import { exportCustomersToCSV } from '../../utils/csvExport';
import { useLanguage } from '../../hooks/useLanguage';
import {
  Search,
  PlusCircle,
  Phone,
  MessageCircle,
  ChevronRight,
  MapPin,
  UserX,
  FileSpreadsheet,
} from 'lucide-react';

interface CustomerListViewProps {
  customers: Customer[];
  payments: PaymentRecord[];
  onSelectCustomer: (customer: Customer) => void;
  onOpenAddCustomer: () => void;
  onQuickPayToday: (customer: Customer) => void;
  todayDate?: string;
}

export const CustomerListView: React.FC<CustomerListViewProps> = ({
  customers,
  payments,
  onSelectCustomer,
  onOpenAddCustomer,
  onQuickPayToday,
  todayDate = getTodayISO(),
}) => {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVillage, setSelectedVillage] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'ALL' | 'ACTIVE' | 'DUE' | 'COMPLETED'>('ALL');
  const [sortBy, setSortBy] = useState<'name' | 'due' | 'amount' | 'date'>('due');

  // Extract unique villages
  const villages = useMemo(() => {
    const list = Array.from(new Set(customers.map((c) => c.village.trim()).filter(Boolean)));
    return ['ALL', ...list.sort()];
  }, [customers]);

  // Filter & sort customers
  const filteredCustomers = useMemo(() => {
    return customers
      .filter((c) => {
        const query = searchQuery.toLowerCase().trim();
        const matchesQuery =
          !query ||
          c.name.toLowerCase().includes(query) ||
          c.mobile.includes(query) ||
          c.village.toLowerCase().includes(query);

        const matchesVillage = selectedVillage === 'ALL' || c.village === selectedVillage;

        const profile = computeCustomerFinancialProfile(c, payments, todayDate);

        let matchesStatus = true;
        if (selectedStatusFilter === 'ACTIVE') matchesStatus = !profile.isFullyPaid;
        else if (selectedStatusFilter === 'DUE') matchesStatus = profile.totalDueTillToday > 0;
        else if (selectedStatusFilter === 'COMPLETED') matchesStatus = profile.isFullyPaid;

        return matchesQuery && matchesVillage && matchesStatus;
      })
      .sort((a, b) => {
        const profileA = computeCustomerFinancialProfile(a, payments, todayDate);
        const profileB = computeCustomerFinancialProfile(b, payments, todayDate);

        if (sortBy === 'due') {
          return profileB.totalDueTillToday - profileA.totalDueTillToday;
        }
        if (sortBy === 'amount') {
          return b.financeAmount - a.financeAmount;
        }
        if (sortBy === 'date') {
          return b.startDate.localeCompare(a.startDate);
        }
        return a.name.localeCompare(b.name);
      });
  }, [customers, payments, searchQuery, selectedVillage, selectedStatusFilter, sortBy, todayDate]);

  return (
    <div className="space-y-5 pb-20">
      {/* Header with Title and Quick Add */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {t('customers')} & {t('passbook')}
          </h2>
          <p className="text-xs sm:text-sm text-gold-200/70 font-medium">
            {t('appTagline')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportCustomersToCSV(customers, payments)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-dark-900 hover:bg-dark-850 border border-gold-500/30 text-gold-400 rounded-xl text-xs font-bold transition-all"
            title="Export all customers to CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>{t('exportCSV')}</span>
          </button>

          <button
            onClick={onOpenAddCustomer}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-600 hover:to-yellow-600 active:scale-95 text-dark-950 font-black text-xs sm:text-sm rounded-xl shadow-glow-gold transition-all"
          >
            <PlusCircle className="w-4 h-4 stroke-[2.5]" />
            <span>{t('addCustomer')}</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-dark-900 p-3.5 rounded-2xl border border-gold-500/20 shadow-sm">
        {/* Search */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gold-500/20 bg-dark-850 text-white outline-none focus:border-gold-400"
          />
        </div>

        {/* Village Filter */}
        <div>
          <select
            value={selectedVillage}
            onChange={(e) => setSelectedVillage(e.target.value)}
            className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-gold-500/20 bg-dark-850 text-white outline-none focus:border-gold-400"
          >
            {villages.map((v) => (
              <option key={v} value={v}>
                {v === 'ALL' ? `🏡 ${t('allVillages')}` : `📍 ${v}`}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value as any)}
            className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-gold-500/20 bg-dark-850 text-white outline-none focus:border-gold-400"
          >
            <option value="ALL">📋 All Statuses</option>
            <option value="ACTIVE">⚡ {t('active')}</option>
            <option value="DUE">🔴 {t('due')}</option>
            <option value="COMPLETED">🟢 {t('completed')}</option>
          </select>
        </div>

        {/* Sort By */}
        <div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-gold-500/20 bg-dark-850 text-white outline-none focus:border-gold-400"
          >
            <option value="due">⚠️ {t('due')} First</option>
            <option value="name">🔤 {t('customerName')} (A-Z)</option>
            <option value="amount">💰 {t('financeAmount')}</option>
            <option value="date">📅 {t('startDate')}</option>
          </select>
        </div>
      </div>

      {/* Customer Cards List */}
      {filteredCustomers.length === 0 ? (
        <div className="p-12 text-center bg-dark-900 rounded-3xl border border-gold-500/20">
          <UserX className="w-12 h-12 mx-auto text-gold-400/50 mb-3" />
          <h3 className="text-base font-bold text-white">No customers found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
            {t('zeroFakeData')}
          </p>
          <button
            onClick={onOpenAddCustomer}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-dark-950 rounded-xl text-xs font-black shadow-glow-gold"
          >
            <PlusCircle className="w-4 h-4 stroke-[2.5]" />
            <span>{t('addCustomer')}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map((customer) => {
            const profile = computeCustomerFinancialProfile(customer, payments, todayDate);
            const todayItem = profile.todayStatus;
            const hasDue = profile.totalDueTillToday > 0;

            return (
              <div
                key={customer.id}
                className="bg-dark-900 border border-gold-500/20 hover:border-gold-500/40 rounded-2xl p-4 sm:p-5 shadow-card hover:shadow-card-hover transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Top Row: Avatar, Name & Village */}
                  <div className="flex items-start justify-between gap-2 pb-3 border-b border-dark-750">
                    <div
                      onClick={() => onSelectCustomer(customer)}
                      className="flex items-start gap-3 cursor-pointer flex-1"
                    >
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-amber-600 via-yellow-500 to-amber-300 flex items-center justify-center text-dark-950 font-black text-base shrink-0 shadow-glow-gold">
                        {customer.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-extrabold text-white text-base group-hover:text-gold-400 transition-colors">
                          {customer.name}
                        </h3>
                        <p className="text-xs text-slate-400 flex items-center gap-1 font-medium mt-0.5">
                          <MapPin className="w-3 h-3 text-gold-400" />
                          {customer.village}
                        </p>
                      </div>
                    </div>

                    {/* Today Status Badge */}
                    {todayItem ? (
                      <StatusBadge status={todayItem.status} size="sm" />
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-dark-800 text-slate-400 font-bold">
                        {profile.isFullyPaid ? t('completed') : t('active')}
                      </span>
                    )}
                  </div>

                  {/* Financial Quick Breakdown */}
                  <div className="grid grid-cols-2 gap-2 my-3 text-xs">
                    <div className="p-2 rounded-xl bg-dark-850 border border-dark-750">
                      <span className="text-[10px] text-slate-400">{t('financeAmount')}</span>
                      <div className="font-mono font-bold text-white text-sm">
                        {formatINR(customer.financeAmount)}
                      </div>
                    </div>

                    <div className="p-2 rounded-xl bg-dark-850 border border-gold-500/20">
                      <span className="text-[10px] text-gold-400">{t('dailyCollection1Percent')}</span>
                      <div className="font-mono font-extrabold text-gold-400 text-sm">
                        {formatINR(customer.dailyRate)}
                      </div>
                    </div>

                    <div className="p-2 rounded-xl bg-dark-850 border border-dark-750">
                      <span className="text-[10px] text-emerald-400">{t('totalCollectedCust')}</span>
                      <div className="font-mono font-bold text-emerald-400">
                        {formatINR(profile.totalCollected)}
                      </div>
                    </div>

                    <div className={`p-2 rounded-xl border ${hasDue ? 'bg-rose-950/60 border-rose-500/30' : 'bg-dark-850 border-dark-750'}`}>
                      <span className={`text-[10px] ${hasDue ? 'text-rose-300 font-bold' : 'text-slate-400'}`}>
                        {t('due')}
                      </span>
                      <div className={`font-mono font-bold ${hasDue ? 'text-rose-400' : 'text-slate-400'}`}>
                        {formatINR(profile.totalDueTillToday)}
                      </div>
                    </div>
                  </div>

                  {/* Repayment Progress Bar */}
                  <div className="space-y-1 mb-4">
                    <div className="flex justify-between text-[11px] font-semibold text-slate-400">
                      <span>{profile.progressPercent}% {t('repaymentProgress')}</span>
                      <span className="text-gold-400">{t('balanceDue')}: {formatINR(profile.totalRemainingBalance)}</span>
                    </div>
                    <div className="w-full bg-dark-950 h-2 rounded-full overflow-hidden border border-gold-500/20">
                      <div
                        className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full rounded-full transition-all duration-300 shadow-glow-gold"
                        style={{ width: `${profile.progressPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="flex items-center justify-between gap-2 pt-3 border-t border-dark-750">
                  {/* Quick WhatsApp / Call */}
                  <div className="flex items-center gap-1.5">
                    <a
                      href={`tel:${customer.mobile}`}
                      className="p-2 rounded-lg bg-dark-800 hover:bg-dark-750 border border-dark-750 text-slate-300 hover:text-white"
                      title={t('call')}
                    >
                      <Phone className="w-3.5 h-3.5 text-gold-400" />
                    </a>
                    <button
                      onClick={() => {
                        const phone = customer.mobile.replace(/\D/g, '');
                        const cleanPhone = phone.length === 10 ? `91${phone}` : phone;
                        window.open(`https://wa.me/${cleanPhone}`, '_blank');
                      }}
                      className="p-2 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-500/30 text-emerald-400"
                      title={t('whatsapp')}
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* View Details / Quick Pay / Quick Due */}
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    {todayItem && todayItem.remainingDue > 0 && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            // Quick Pay opens the modal with partial/full/due option
                            onQuickPayToday(customer);
                          }}
                          className="px-2.5 py-1.5 bg-rose-950/70 hover:bg-rose-900 border border-rose-500/40 text-rose-300 font-extrabold text-xs rounded-xl transition-all flex items-center gap-1"
                          title="Mark / Review Due"
                        >
                          <span>🔴 {t('due')}</span>
                        </button>

                        <button
                          onClick={() => onQuickPayToday(customer)}
                          className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-dark-950 font-black text-xs rounded-xl shadow-glow-gold transition-all flex items-center gap-1"
                        >
                          <span>🟢 {t('markPaid')}</span>
                          <span>₹{customer.dailyRate}</span>
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => onSelectCustomer(customer)}
                      className="px-3 py-1.5 bg-dark-800 hover:bg-dark-750 border border-gold-500/20 text-gold-400 font-bold text-xs rounded-xl flex items-center gap-1 transition-all"
                    >
                      <span>{t('passbook')}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
