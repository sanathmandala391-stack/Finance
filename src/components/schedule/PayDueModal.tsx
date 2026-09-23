import React, { useState, useEffect } from 'react';
import { Customer, DayScheduleItem, PaymentMethod } from '../../types/finance';
import { Modal } from '../common/Modal';
import { formatINR } from '../../utils/currency';
import { formatDisplayDate, getTodayISO, isBeforeDay } from '../../utils/dateUtils';
import { useLanguage } from '../../hooks/useLanguage';
import { CheckCircle2, History, IndianRupee, ShieldAlert, Sparkles, Plus, Wallet, Smartphone, Building2, Trash2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useSoundEffects } from '../../hooks/useSoundEffects';

interface PayDueModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  dayItem: DayScheduleItem | null;
  onConfirmPayment: (params: {
    customerId: string;
    scheduleDate: string;
    dayNumber: number;
    paymentDate: string;
    amount: number;
    paymentMethod: PaymentMethod;
    notes?: string;
  }) => void;
  onDeletePayment?: (paymentId: string) => void;
  todayDate?: string;
}

export const PayDueModal: React.FC<PayDueModalProps> = ({
  isOpen,
  onClose,
  customer,
  dayItem,
  onConfirmPayment,
  onDeletePayment,
  todayDate = getTodayISO(),
}) => {
  const { t } = useLanguage();
  const { playPaymentSuccessSound } = useSoundEffects();
  const [amount, setAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState<string>(todayDate);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (dayItem && customer) {
      const defaultAmount = dayItem.remainingDue > 0 ? dayItem.remainingDue : customer.dailyRate;
      setAmount(defaultAmount);
      setPaymentDate(todayDate);
      setPaymentMethod('CASH');
      setNotes(dayItem.isPast ? `Due cleared from ${formatDisplayDate(dayItem.date)}` : '');
    }
  }, [dayItem, customer, isOpen, todayDate]);

  if (!customer || !dayItem) return null;

  const remainingDue = dayItem.remainingDue > 0 ? dayItem.remainingDue : dayItem.targetAmount;
  const isLate = isBeforeDay(dayItem.date, paymentDate);
  const isPartial = amount < remainingDue && amount > 0;
  const isFull = amount >= remainingDue;

  const handleAddAmount = (extra: number) => {
    setAmount((prev) => Math.max(0, (prev || 0) + extra));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) return;

    onConfirmPayment({
      customerId: customer.id,
      scheduleDate: dayItem.date,
      dayNumber: dayItem.dayNumber,
      paymentDate,
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

  const handleDeleteExistingPayment = (paymentId: string, receiptNumber: string, paidAmt: number) => {
    if (
      window.confirm(
        `Are you sure you want to revert/delete payment ${receiptNumber} (${formatINR(
          paidAmt
        )}) for Day ${dayItem.dayNumber} (${formatDisplayDate(dayItem.date)})?\n\nThis will restore this installment to its original unpaid/due status.`
      )
    ) {
      onDeletePayment?.(paymentId);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        dayItem.paidAmount >= dayItem.targetAmount
          ? `Day ${dayItem.dayNumber} Payment Details (${formatDisplayDate(dayItem.date)})`
          : dayItem.isPast
          ? `${t('settleOverdueDay')} (${t('day')} ${dayItem.dayNumber})`
          : `${t('confirmPayment')} ${t('day')} ${dayItem.dayNumber}`
      }
      subtitle={`Customer: ${customer.name} | ${t('scheduledDate')}: ${formatDisplayDate(dayItem.date)}`}
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Existing Payment Card (If Day Has Payments Recorded) */}
        {dayItem.payments && dayItem.payments.length > 0 && (
          <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-emerald-300 flex items-center gap-1.5 uppercase tracking-wide">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Recorded Payment for Day {dayItem.dayNumber}</span>
              </span>
              <span className="text-xs font-mono font-black text-emerald-400">
                {formatINR(dayItem.paidAmount)} Paid
              </span>
            </div>

            <div className="space-y-2">
              {dayItem.payments.map((p) => (
                <div
                  key={p.id}
                  className="p-3 rounded-xl bg-dark-900/90 border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="text-xs space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-gold-400">{p.receiptNumber}</span>
                      <span className="text-slate-400">•</span>
                      <span className="text-white font-medium">Paid on {formatDisplayDate(p.paymentDate)}</span>
                      <span className="text-slate-400">•</span>
                      <span className="px-1.5 py-0.2 rounded bg-dark-800 text-slate-300 text-[10px] font-bold">
                        {p.paymentMethod}
                      </span>
                    </div>
                    {p.notes && <p className="text-slate-400 italic text-[11px]">{p.notes}</p>}
                  </div>

                  {onDeletePayment && (
                    <button
                      type="button"
                      onClick={() => handleDeleteExistingPayment(p.id, p.receiptNumber, p.amount)}
                      className="px-2.5 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-500/30 text-rose-300 font-bold text-xs flex items-center gap-1.5 transition-all self-end sm:self-auto active:scale-95"
                      title="Undo/Delete this payment"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Undo / Delete Payment</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Day Status Notice */}
          {dayItem.isPast && isLate && (
            <div className="p-3.5 bg-sky-950/70 border border-sky-500/40 rounded-2xl flex items-start gap-2.5 text-xs text-sky-200">
              <History className="w-4 h-4 shrink-0 text-sky-400 mt-0.5" />
              <div>
                <span className="font-bold">{t('dueCleared')}:</span> This payment was due on{' '}
                <strong className="underline text-white font-bold">{formatDisplayDate(dayItem.date)}</strong>. Recording
                it today will mark this schedule day as <span className="font-black text-sky-300">🔵 {t('paidLate')}</span>.
              </div>
            </div>
          )}

        {/* Collection Amount Card */}
        <div className="rounded-2xl bg-dark-850 border border-gold-500/30 p-3.5 sm:p-4 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-gold-300 flex items-center gap-1.5 uppercase tracking-wider">
              <span>{t('amountToCollect')}</span>
            </label>
            <span className="text-xs text-slate-300 font-medium">
              Due: <strong className="text-gold-400 font-mono font-bold">{formatINR(remainingDue)}</strong>
            </span>
          </div>

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
              placeholder="Enter amount"
              className="w-full pl-11 pr-4 py-3 text-2xl font-black font-mono rounded-xl border-2 border-gold-400 focus:border-amber-400 bg-dark-900 text-white outline-none shadow-inner transition-all"
            />
          </div>

          {/* Quick Preset Chips & Increment Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => setAmount(remainingDue)}
              className={`text-xs px-3 py-1.5 rounded-lg font-bold border transition-all active:scale-95 ${
                amount === remainingDue
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-dark-950 border-gold-400 shadow-glow-gold'
                  : 'bg-gold-500/20 text-gold-300 border-gold-500/40 hover:bg-gold-500/30'
              }`}
            >
              Full Due: {formatINR(remainingDue)}
            </button>

            {remainingDue >= 100 && (
              <button
                type="button"
                onClick={() => setAmount(Math.round(remainingDue / 2))}
                className={`text-xs px-3 py-1.5 rounded-lg font-semibold border transition-all active:scale-95 ${
                  amount === Math.round(remainingDue / 2)
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-dark-950 border-gold-400'
                    : 'bg-dark-900 font-semibold border-dark-750 text-slate-300 hover:text-white hover:border-gold-500/40'
                }`}
              >
                Half: {formatINR(Math.round(remainingDue / 2))}
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

          {/* Status calculation feedback */}
          {isPartial && (
            <div className="text-xs flex items-center gap-2 text-amber-300 bg-amber-950/70 p-2.5 rounded-xl border border-amber-500/40">
              <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400" />
              <span>
                {t('partial')}: Remaining <strong className="text-amber-200 font-mono font-bold">{formatINR(remainingDue - amount)}</strong> will stay Due.
              </span>
            </div>
          )}

          {isFull && amount > 0 && (
            <div className="text-xs flex items-center gap-2 text-emerald-300 bg-emerald-950/60 p-2.5 rounded-xl border border-emerald-500/40">
              <Sparkles className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>
                Full Clearance: Scheduled Day {dayItem.dayNumber} will be marked <strong className="text-emerald-200">100% Cleared</strong>.
              </span>
            </div>
          )}
        </div>

        {/* Payment Date & Mode */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-gold-300 mb-1.5">
              {t('activeDate')}
            </label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-mono rounded-xl border border-gold-500/30 bg-dark-850 text-white outline-none focus:border-gold-400 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gold-300 mb-1.5">
              {t('paymentMode')}
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {(['CASH', 'UPI', 'BANK'] as PaymentMethod[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPaymentMethod(mode)}
                  className={`py-2 px-2 sm:px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1 active:scale-95 ${
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
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-bold text-gold-300 mb-1.5">
            {t('notes')}
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Cleared past due amount"
            className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-gold-500/30 bg-dark-850 text-white outline-none focus:border-gold-400 transition-all"
          />
        </div>

        {/* Action Buttons */}
        <div className="pt-3 border-t border-dark-750 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-400 hover:text-white transition-colors"
          >
            {t('cancel')}
          </button>
          <button
            type="submit"
            disabled={amount <= 0}
            className="flex-1 py-3 px-4 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-600 hover:to-yellow-600 active:scale-95 text-dark-950 font-black text-xs sm:text-sm rounded-xl shadow-glow-gold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
            <span>{t('dueCleared')}: {formatINR(amount)}</span>
          </button>
        </div>
      </form>
      </div>
    </Modal>
  );
};

