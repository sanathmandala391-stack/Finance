import React, { useState, useEffect } from 'react';
import { Customer, DayScheduleItem, PaymentMethod } from '../../types/finance';
import { Modal } from '../common/Modal';
import { formatINR } from '../../utils/currency';
import { formatDisplayDate, getTodayISO } from '../../utils/dateUtils';
import { useLanguage } from '../../hooks/useLanguage';
import { CheckCircle2, IndianRupee, ShieldAlert, Plus, Wallet, Smartphone, Building2, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useSoundEffects } from '../../hooks/useSoundEffects';

interface QuickPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  dayScheduleItem: DayScheduleItem | null;
  onConfirmPayment: (params: {
    customerId: string;
    scheduleDate: string;
    dayNumber: number;
    paymentDate: string;
    amount: number;
    paymentMethod: PaymentMethod;
    notes?: string;
  }) => void;
  todayDate?: string;
}

export const QuickPaymentModal: React.FC<QuickPaymentModalProps> = ({
  isOpen,
  onClose,
  customer,
  dayScheduleItem,
  onConfirmPayment,
  todayDate = getTodayISO(),
}) => {
  const { t } = useLanguage();
  const { playPaymentSuccessSound } = useSoundEffects();
  const [amount, setAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [notes, setNotes] = useState('');
  const [isCustomAmount, setIsCustomAmount] = useState(false);

  useEffect(() => {
    if (dayScheduleItem && customer) {
      const defaultAmount = dayScheduleItem.remainingDue > 0 
        ? dayScheduleItem.remainingDue 
        : customer.dailyRate;
      setAmount(defaultAmount);
      setIsCustomAmount(false);
      setPaymentMethod('CASH');
      setNotes('');
    }
  }, [dayScheduleItem, customer, isOpen]);

  if (!customer || !dayScheduleItem) return null;

  const targetRate = customer.dailyRate;
  const isPartial = amount < targetRate && amount > 0;
  const isFull = amount >= targetRate;

  const handleAddAmount = (extra: number) => {
    setAmount((prev) => Math.max(0, (prev || 0) + extra));
  };

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) return;

    onConfirmPayment({
      customerId: customer.id,
      scheduleDate: dayScheduleItem.date,
      dayNumber: dayScheduleItem.dayNumber,
      paymentDate: todayDate,
      amount,
      paymentMethod,
      notes: notes.trim(),
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

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('confirmPayment')}
      subtitle={`Customer: ${customer.name} (${customer.village})`}
      maxWidth="md"
    >
      <form onSubmit={handleQuickSubmit} className="space-y-4">
        {/* Schedule Day Banner */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-dark-850 border border-gold-500/30">
          <div>
            <span className="text-xs font-semibold text-slate-400">
              {t('scheduledDate')}
            </span>
            <div className="text-sm font-bold text-white">
              {t('day')} {dayScheduleItem.dayNumber} ({formatDisplayDate(dayScheduleItem.date)})
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-semibold text-slate-400">
              {t('todaysTarget')}
            </span>
            <div className="text-sm sm:text-base font-extrabold text-gold-400 font-mono">
              {formatINR(targetRate)}
            </div>
          </div>
        </div>

        {/* Amount Selection */}
        <div className="rounded-2xl bg-dark-850 border border-gold-500/30 p-3.5 sm:p-4 space-y-3">
          <label className="block text-xs font-bold text-gold-300 uppercase tracking-wider">
            {t('amountToCollect')}
          </label>

          {!isCustomAmount ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-dark-900 via-dark-850 to-dark-900 border-2 border-gold-500/60 shadow-glow-gold">
                <div>
                  <div className="text-xs font-bold text-gold-400 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    {t('fullTarget')}
                  </div>
                  <div className="text-3xl font-black text-white font-mono mt-0.5">
                    {formatINR(targetRate)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCustomAmount(true)}
                  className="text-xs px-3.5 py-2 rounded-xl border border-gold-500/40 bg-dark-800 font-bold text-gold-300 hover:text-gold-200 hover:bg-dark-750 transition-all active:scale-95"
                >
                  {t('partialPay')} / Custom
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gold-400">
                  <IndianRupee className="w-5 h-5 font-bold" />
                </div>
                <input
                  type="number"
                  step="any"
                  min="1"
                  inputMode="decimal"
                  value={amount || ''}
                  onChange={(e) => setAmount(e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))}
                  autoFocus
                  placeholder="Enter custom amount"
                  className="w-full pl-11 pr-4 py-3 text-2xl font-black font-mono rounded-xl border-2 border-gold-400 bg-dark-900 text-white outline-none shadow-inner transition-all"
                />
              </div>

              {/* Quick amount shortcuts */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setAmount(targetRate)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-bold border transition-all active:scale-95 ${
                    amount === targetRate
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-dark-950 border-gold-400 shadow-glow-gold'
                      : 'bg-gold-500/20 text-gold-300 border-gold-500/40 hover:bg-gold-500/30'
                  }`}
                >
                  Full: {formatINR(targetRate)}
                </button>
                {targetRate >= 100 && (
                  <button
                    type="button"
                    onClick={() => setAmount(Math.round(targetRate / 2))}
                    className={`text-xs px-3 py-1.5 rounded-lg font-semibold border transition-all active:scale-95 ${
                      amount === Math.round(targetRate / 2)
                        ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-dark-950 border-gold-400'
                        : 'bg-dark-900 border-dark-750 text-slate-300 hover:text-white hover:border-gold-500/40'
                    }`}
                  >
                    Half: {formatINR(Math.round(targetRate / 2))}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleAddAmount(100)}
                  className="text-xs px-2.5 py-1.5 rounded-lg bg-dark-900 font-bold border border-dark-750 text-slate-300 hover:text-gold-400 hover:border-gold-500/40 transition-all active:scale-95 flex items-center gap-0.5"
                >
                  <Plus className="w-3 h-3" />₹100
                </button>

                <button
                  type="button"
                  onClick={() => handleAddAmount(500)}
                  className="text-xs px-2.5 py-1.5 rounded-lg bg-dark-900 font-bold border border-dark-750 text-slate-300 hover:text-gold-400 hover:border-gold-500/40 transition-all active:scale-95 flex items-center gap-0.5"
                >
                  <Plus className="w-3 h-3" />₹500
                </button>
              </div>
            </div>
          )}

          {isPartial && (
            <div className="text-xs flex items-center gap-2 text-amber-300 bg-amber-950/70 p-2.5 rounded-xl border border-amber-500/40">
              <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400" />
              <span>
                {t('partial')}: Remaining <strong className="text-amber-200 font-mono font-bold">{formatINR(targetRate - amount)}</strong> will remain Due.
              </span>
            </div>
          )}

          {isFull && amount > 0 && isCustomAmount && (
            <div className="text-xs flex items-center gap-2 text-emerald-300 bg-emerald-950/60 p-2.5 rounded-xl border border-emerald-500/40">
              <Sparkles className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>
                Full Target Achieved: Scheduled Day {dayScheduleItem.dayNumber} will be marked <strong className="text-emerald-200">100% Paid</strong>.
              </span>
            </div>
          )}
        </div>

        {/* Payment Method */}
        <div>
          <label className="block text-xs font-bold text-gold-300 mb-1.5">
            {t('paymentMode')}
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['CASH', 'UPI', 'BANK'] as PaymentMethod[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setPaymentMethod(mode)}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 ${
                  paymentMethod === mode
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-dark-950 border-gold-400 font-black shadow-glow-gold'
                    : 'bg-dark-850 text-slate-300 border-dark-750 hover:bg-dark-800'
                }`}
              >
                {mode === 'CASH' ? (
                  <>
                    <Wallet className="w-3.5 h-3.5 shrink-0" />
                    <span>Cash</span>
                  </>
                ) : mode === 'UPI' ? (
                  <>
                    <Smartphone className="w-3.5 h-3.5 shrink-0" />
                    <span>UPI</span>
                  </>
                ) : (
                  <>
                    <Building2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Bank</span>
                  </>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Optional Notes */}
        <div>
          <label className="block text-xs font-bold text-gold-300 mb-1.5">
            {t('notes')}
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Paid at village shop"
            className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-gold-500/30 bg-dark-850 text-white outline-none focus:border-gold-400 transition-all"
          />
        </div>

        {/* Submit Actions */}
        <div className="pt-3 border-t border-dark-750 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2.5 text-xs sm:text-sm font-bold text-slate-400 hover:text-white transition-colors"
          >
            {t('cancel')}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2.5 bg-rose-950/80 hover:bg-rose-900 border border-rose-500/50 text-rose-300 font-extrabold text-xs sm:text-sm rounded-xl transition-all flex items-center gap-1 active:scale-95"
            title="Mark as Due"
          >
            <span>🔴 {t('markDue')}</span>
          </button>

          <button
            type="submit"
            disabled={amount <= 0}
            className="flex-1 py-3 px-4 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-600 hover:to-yellow-600 active:scale-95 text-dark-950 font-black text-xs sm:text-sm rounded-xl shadow-glow-gold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
            <span>{t('confirmPayment')} {formatINR(amount)}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
