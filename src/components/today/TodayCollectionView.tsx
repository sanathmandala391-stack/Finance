import React, { useState, useMemo } from 'react';
import { Customer, DayScheduleItem, PaymentRecord } from '../../types/finance';
import { computeCustomerFinancialProfile } from '../../utils/financeCalculations';
import { formatINR } from '../../utils/currency';
import { formatDisplayDate, getTodayISO } from '../../utils/dateUtils';
import { StatusBadge } from '../common/StatusBadge';
import { QuickPaymentModal } from './QuickPaymentModal';
import { PayDueModal } from '../schedule/PayDueModal';
import { exportTodayCollectionSheetToCSV } from '../../utils/csvExport';
import { useSoundEffects } from '../../hooks/useSoundEffects';
import { useLanguage } from '../../hooks/useLanguage';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  Search,
  CheckCircle2,
  Phone,
  MessageCircle,
  AlertTriangle,
  FileSpreadsheet,
  Check,
  MapPin,
  Flame,
  Coins,
  XCircle,
} from 'lucide-react';

interface TodayCollectionViewProps {
  customers: Customer[];
  payments: PaymentRecord[];
  onRecordPayment: (params: any) => void;
  onSelectCustomer: (customer: Customer) => void;
  todayDate?: string;
}

export const TodayCollectionView: React.FC<TodayCollectionViewProps> = ({
  customers,
  payments,
  onRecordPayment,
  onSelectCustomer,
  todayDate = getTodayISO(),
}) => {
  const { t } = useLanguage();
  const { playPaymentSuccessSound, playClickSound } = useSoundEffects();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVillage, setSelectedVillage] = useState('ALL');
  const [statusTab, setStatusTab] = useState<'PENDING' | 'PAID' | 'ALL'>('PENDING');

  // Modal states
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedDayItem, setSelectedDayItem] = useState<DayScheduleItem | null>(null);
  const [isQuickPayModalOpen, setIsQuickPayModalOpen] = useState(false);
  const [isPayDueModalOpen, setIsPayDueModalOpen] = useState(false);

  // Extract unique villages
  const villages = useMemo(() => {
    const list = Array.from(new Set(customers.map((c) => c.village.trim()).filter(Boolean)));
    return ['ALL', ...list.sort()];
  }, [customers]);

  // Compute active customers & today's items
  const customerProfiles = useMemo(() => {
    return customers.map((customer) => {
      const profile = computeCustomerFinancialProfile(customer, payments, todayDate);
      return {
        customer,
        profile,
        todayItem: profile.todayStatus,
      };
    });
  }, [customers, payments, todayDate]);

  // Summary statistics for today's collection run
  const summary = useMemo(() => {
    let totalTarget = 0;
    let totalCollectedToday = 0;
    let totalPendingToday = 0;
    let pendingCustomersCount = 0;
    let paidCustomersCount = 0;

    for (const item of customerProfiles) {
      if (item.todayItem) {
        totalTarget += item.todayItem.targetAmount;
        totalCollectedToday += item.todayItem.paidAmount;
        totalPendingToday += item.todayItem.remainingDue;

        if (item.todayItem.remainingDue > 0) {
          pendingCustomersCount++;
        } else {
          paidCustomersCount++;
        }
      }
    }

    const progress = totalTarget > 0 ? Math.min(100, Math.round((totalCollectedToday / totalTarget) * 100)) : 100;

    return {
      totalTarget,
      totalCollectedToday,
      totalPendingToday,
      pendingCustomersCount,
      paidCustomersCount,
      progress,
    };
  }, [customerProfiles]);

  // Filtered customer list for the run
  const filteredRun = useMemo(() => {
    return customerProfiles.filter(({ customer, todayItem }) => {
      if (!todayItem) return false;

      const query = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !query ||
        customer.name.toLowerCase().includes(query) ||
        customer.mobile.includes(query) ||
        customer.village.toLowerCase().includes(query);

      const matchesVillage = selectedVillage === 'ALL' || customer.village === selectedVillage;

      let matchesStatus = true;
      if (statusTab === 'PENDING') matchesStatus = todayItem.remainingDue > 0;
      else if (statusTab === 'PAID') matchesStatus = todayItem.paidAmount >= todayItem.targetAmount;

      return matchesQuery && matchesVillage && matchesStatus;
    });
  }, [customerProfiles, searchQuery, selectedVillage, statusTab]);

  // State to track customers marked as Due during today's collection run
  const [markedDueIds, setMarkedDueIds] = useState<Record<string, boolean>>({});

  // 1-Click Fast Instant Pay Today
  const handleInstantPayToday = (customer: Customer, dayItem: DayScheduleItem) => {
    const amount = dayItem.remainingDue > 0 ? dayItem.remainingDue : customer.dailyRate;
    onRecordPayment({
      customerId: customer.id,
      scheduleDate: dayItem.date,
      dayNumber: dayItem.dayNumber,
      paymentDate: todayDate,
      amount,
      paymentMethod: 'CASH',
      notes: 'Collected on daily run',
    });

    // Remove from marked due if was previously marked
    setMarkedDueIds((prev) => {
      const next = { ...prev };
      delete next[customer.id];
      return next;
    });

    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
      });
    } catch {
      // Ignore
    }
    playPaymentSuccessSound();
  };

  // Mark customer as Due for today (explicit acknowledgement)
  const handleMarkAsDueToday = (customer: Customer) => {
    setMarkedDueIds((prev) => ({
      ...prev,
      [customer.id]: true,
    }));
    playClickSound();
  };

  // Undo Mark Due
  const handleUndoMarkDue = (customer: Customer) => {
    setMarkedDueIds((prev) => {
      const next = { ...prev };
      delete next[customer.id];
      return next;
    });
    playClickSound();
  };

  // Open Settle Due Modal for customer's oldest past overdue day
  const handleOpenClearPastDue = (customer: Customer, profile: any) => {
    // Find first past due day
    const pastDueDay = profile.schedule.find((s: DayScheduleItem) => s.isPast && s.remainingDue > 0);
    if (pastDueDay) {
      setSelectedCustomer(customer);
      setSelectedDayItem(pastDueDay);
      setIsPayDueModalOpen(true);
    } else {
      onSelectCustomer(customer);
    }
  };

  return (
    <div className="space-y-5 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-amber-400 fill-amber-400" />
              <span>{t('todaysRunTitle')}</span>
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-gold-200/70 font-medium">
            {t('activeDate')}: <strong className="text-gold-400">{formatDisplayDate(todayDate)}</strong>
          </p>
        </div>

        <button
          onClick={() => exportTodayCollectionSheetToCSV(customers, payments)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-dark-900 hover:bg-dark-850 border border-gold-500/30 text-gold-400 rounded-xl text-xs font-bold transition-all shadow-sm"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          <span>{t('exportSheet')}</span>
        </button>
      </div>

      {/* Hero Collection Run Status Card (Luxury Black & Gold) */}
      <div className="bg-gradient-to-br from-dark-850 via-dark-900 to-black text-white rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden border border-gold-500/30">
        <div className="relative z-10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-extrabold text-gold-400 uppercase tracking-wider flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-amber-400" />
                {t('liveProgress')}
              </span>
              <div className="text-2xl sm:text-4xl font-black font-mono mt-1 text-white tracking-tight">
                {formatINR(summary.totalCollectedToday)}
                <span className="text-sm sm:text-lg font-normal text-slate-400">
                  {' '}
                  / {formatINR(summary.totalTarget)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-dark-950/80 px-3.5 py-2 rounded-2xl border border-gold-500/20 text-center">
                <span className="text-[10px] text-slate-400 uppercase font-bold">{t('todaysPending')}</span>
                <div className="text-base sm:text-lg font-black text-amber-400 font-mono">
                  {formatINR(summary.totalPendingToday)}
                </div>
              </div>

              <div className="bg-dark-950/80 px-3.5 py-2 rounded-2xl border border-gold-500/20 text-center">
                <span className="text-[10px] text-slate-400 uppercase font-bold">{t('completed')}</span>
                <div className="text-base sm:text-lg font-black text-emerald-400 font-mono">
                  {summary.paidCustomersCount} / {customerProfiles.length}
                </div>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-bold text-slate-300">
              <span className="text-gold-400">{summary.progress}% {t('targetAchieved')}</span>
              <span className="text-amber-300">{summary.pendingCustomersCount} {t('pendingCount')}</span>
            </div>
            <div className="w-full bg-dark-950 rounded-full h-3.5 overflow-hidden p-0.5 border border-gold-500/30">
              <div
                className="bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300 h-full rounded-full transition-all duration-500 shadow-glow-gold"
                style={{ width: `${summary.progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs: Village & Status */}
      <div className="space-y-3">
        {/* Village Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {villages.map((v) => (
            <button
              key={v}
              onClick={() => setSelectedVillage(v)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                selectedVillage === v
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-dark-950 font-black shadow-glow-gold'
                  : 'bg-dark-900 text-slate-300 hover:text-gold-400 border border-gold-500/20'
              }`}
            >
              {v === 'ALL' ? `🏡 ${t('allVillages')}` : `📍 ${v}`}
            </button>
          ))}
        </div>

        {/* Status Tab Toggle & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1 bg-dark-900 p-1 rounded-xl border border-gold-500/20">
            <button
              onClick={() => setStatusTab('PENDING')}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusTab === 'PENDING'
                  ? 'bg-amber-950 text-amber-300 border border-amber-500/50 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🟡 {t('todayPending')} ({summary.pendingCustomersCount})
            </button>
            <button
              onClick={() => setStatusTab('PAID')}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusTab === 'PAID'
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/50 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🟢 {t('paid')} ({summary.paidCustomersCount})
            </button>
            <button
              onClick={() => setStatusTab('ALL')}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusTab === 'ALL'
                  ? 'bg-gold-500/20 text-gold-400 border border-gold-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t('viewAll')} ({customerProfiles.length})
            </button>
          </div>

          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gold-500/20 bg-dark-900 text-white outline-none focus:border-gold-400"
            />
          </div>
        </div>
      </div>

      {/* Collection Run Cards List */}
      {filteredRun.length === 0 ? (
        <div className="p-10 text-center bg-dark-900 rounded-3xl border border-gold-500/20">
          <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-400 mb-2" />
          <h3 className="text-base font-bold text-white">
            {statusTab === 'PENDING'
              ? t('allDoneToday')
              : 'No matching records'}
          </h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRun.map(({ customer, profile, todayItem }) => {
            if (!todayItem) return null;

            const isPaid = todayItem.paidAmount >= todayItem.targetAmount;
            const isMarkedDue = !!markedDueIds[customer.id];
            const hasOverdue = profile.dueDaysCount > 0;

            return (
              <div
                key={customer.id}
                className={`rounded-2xl border p-4 sm:p-5 transition-all shadow-card hover:shadow-card-hover flex flex-col justify-between ${
                  isPaid
                    ? 'bg-dark-900/90 border-emerald-500/40'
                    : isMarkedDue
                    ? 'bg-dark-900 border-rose-500/50'
                    : 'bg-dark-900 border-gold-500/20 hover:border-gold-500/40'
                }`}
              >
                <div>
                  {/* Top: Customer details & Today badge */}
                  <div className="flex items-start justify-between gap-3 pb-3 border-b border-dark-750">
                    <div
                      onClick={() => onSelectCustomer(customer)}
                      className="cursor-pointer group flex items-start gap-3 flex-1"
                    >
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-amber-600 via-yellow-500 to-amber-300 text-dark-950 font-black flex items-center justify-center text-base shrink-0 shadow-glow-gold">
                        {customer.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-base text-white group-hover:text-gold-400 transition-colors">
                          {customer.name}
                        </h4>
                        <p className="text-xs text-slate-400 flex items-center gap-1 font-medium mt-0.5">
                          <MapPin className="w-3 h-3 text-gold-400" />
                          {customer.village}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      {isMarkedDue && !isPaid ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-950 text-rose-300 border border-rose-500/40">
                          🔴 {t('due')}
                        </span>
                      ) : (
                        <StatusBadge status={todayItem.status} size="sm" />
                      )}
                      <span className="text-[10px] font-mono text-gold-300/60">
                        {t('day')} {todayItem.dayNumber} / 100
                      </span>
                    </div>
                  </div>

                  {/* Overdue Alert Banner with Clear Due Option */}
                  {hasOverdue && (
                    <div className="my-2.5 p-2.5 rounded-xl bg-rose-950/60 border border-rose-500/40 flex items-center justify-between text-xs text-rose-300">
                      <div className="flex items-center gap-1.5 font-bold">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        <span>{profile.dueDaysCount} {t('pastDuesAlert')} ({formatINR(profile.totalDueTillToday)})</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleOpenClearPastDue(customer, profile)}
                        className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-[11px] shadow-sm transition-all flex items-center gap-1"
                      >
                        <Coins className="w-3.5 h-3.5" />
                        <span>{t('clearPastDue')}</span>
                      </button>
                    </div>
                  )}

                  {/* Collection Target & Paid info */}
                  <div className="grid grid-cols-3 gap-2 my-3 text-xs">
                    <div className="p-2.5 rounded-xl bg-dark-800 border border-dark-750">
                      <span className="text-[10px] text-slate-400">{t('todaysTarget')}</span>
                      <div className="font-mono font-bold text-white text-sm">
                        {formatINR(todayItem.targetAmount)}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-dark-800 border border-dark-750">
                      <span className="text-[10px] text-emerald-400">{t('todaysCollected')}</span>
                      <div className="font-mono font-bold text-emerald-400 text-sm">
                        {formatINR(todayItem.paidAmount)}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-dark-800 border border-dark-750">
                      <span className="text-[10px] text-slate-400">{t('remainingBalance')}</span>
                      <div className="font-mono font-bold text-gold-400 text-sm">
                        {formatINR(profile.totalRemainingBalance)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Big Action Buttons (PAID vs DUE vs CLEAR PAST DUE vs PARTIAL) */}
                <div className="pt-2.5 border-t border-dark-750 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    {/* Quick Call / WhatsApp */}
                    <div className="flex items-center gap-1.5">
                      <a
                        href={`tel:${customer.mobile}`}
                        className="p-2.5 rounded-xl bg-dark-800 hover:bg-dark-750 border border-dark-750 text-slate-300 hover:text-white"
                        title={t('call')}
                      >
                        <Phone className="w-4 h-4 text-gold-400" />
                      </a>
                      <button
                        onClick={() => {
                          const phone = customer.mobile.replace(/\D/g, '');
                          const cleanPhone = phone.length === 10 ? `91${phone}` : phone;
                          window.open(`https://wa.me/${cleanPhone}`, '_blank');
                        }}
                        className="p-2.5 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-500/30 text-emerald-400"
                        title={t('whatsapp')}
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Collection Buttons: DUE vs PAID vs PARTIAL */}
                    {isPaid ? (
                      <div className="flex-1 flex items-center justify-end gap-2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-black text-xs">
                          <Check className="w-4 h-4" /> {t('paidTodayBadge')} ({formatINR(todayItem.paidAmount)})
                        </span>
                        <button
                          onClick={() => onSelectCustomer(customer)}
                          className="px-3 py-2 rounded-xl bg-dark-800 hover:bg-dark-750 border border-dark-750 text-gold-400 text-xs font-bold"
                        >
                          {t('passbook')}
                        </button>
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-end gap-2">
                        {/* 1. DUE BUTTON (Beside Paid) */}
                        {isMarkedDue ? (
                          <button
                            type="button"
                            onClick={() => handleUndoMarkDue(customer)}
                            className="px-3 py-2.5 bg-rose-950 hover:bg-rose-900 border border-rose-500/60 text-rose-300 font-black text-xs sm:text-sm rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95 shrink-0"
                            title="Undo Due Mark"
                          >
                            <XCircle className="w-4 h-4 text-rose-400" />
                            <span>{t('dueMarkedBadge')}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleMarkAsDueToday(customer)}
                            className="px-3.5 py-2.5 bg-rose-950/70 hover:bg-rose-900 border border-rose-500/50 hover:border-rose-400 text-rose-300 font-black text-xs sm:text-sm rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95 shrink-0"
                            title="Mark as Due today"
                          >
                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                            <span>🔴 {t('markDue')}</span>
                          </button>
                        )}

                        {/* 2. PARTIAL BUTTON */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCustomer(customer);
                            setSelectedDayItem(todayItem);
                            setIsQuickPayModalOpen(true);
                          }}
                          className="px-2.5 py-2.5 bg-dark-800 hover:bg-dark-750 border border-gold-500/20 hover:border-gold-500/40 text-slate-300 hover:text-gold-400 font-bold text-xs rounded-xl transition-all shrink-0"
                          title="Enter partial amount"
                        >
                          {t('partialPay')}
                        </button>

                        {/* 3. PAID BUTTON */}
                        <button
                          type="button"
                          onClick={() => handleInstantPayToday(customer, todayItem)}
                          className="flex-1 py-2.5 px-3.5 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-600 hover:to-yellow-600 active:scale-95 text-dark-950 font-black text-xs sm:text-sm rounded-xl shadow-glow-gold flex items-center justify-center gap-1.5 transition-all"
                        >
                          <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                          <span>🟢 {t('markPaid')} {formatINR(todayItem.remainingDue)}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}


      {/* Quick Payment Modal */}
      {selectedCustomer && selectedDayItem && isQuickPayModalOpen && (
        <QuickPaymentModal
          isOpen={isQuickPayModalOpen}
          onClose={() => {
            setIsQuickPayModalOpen(false);
            setSelectedCustomer(null);
            setSelectedDayItem(null);
          }}
          customer={selectedCustomer}
          dayScheduleItem={selectedDayItem}
          onConfirmPayment={onRecordPayment}
          todayDate={todayDate}
        />
      )}

      {/* Settle Past Due Modal */}
      {selectedCustomer && selectedDayItem && isPayDueModalOpen && (
        <PayDueModal
          isOpen={isPayDueModalOpen}
          onClose={() => {
            setIsPayDueModalOpen(false);
            setSelectedCustomer(null);
            setSelectedDayItem(null);
          }}
          customer={selectedCustomer}
          dayItem={selectedDayItem}
          onConfirmPayment={onRecordPayment}
          todayDate={todayDate}
        />
      )}
    </div>
  );
};
