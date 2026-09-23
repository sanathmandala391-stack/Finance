import React, { useState, useEffect } from 'react';
import { Customer } from '../../types/finance';
import { Modal } from '../common/Modal';
import { calculateCustomerFinanceDetails } from '../../utils/financeCalculations';
import { formatINR } from '../../utils/currency';
import { addDaysISO, formatDisplayDate, getTodayISO } from '../../utils/dateUtils';
import { useLanguage } from '../../hooks/useLanguage';
import {
  IndianRupee,
  User,
  Phone,
  MapPin,
  Calendar,
  CheckCircle2,
} from 'lucide-react';

interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    mobile: string;
    village: string;
    financeAmount: number;
    startDate: string;
    tenureDays?: number;
    notes?: string;
  }) => void;
  initialCustomer?: Customer | null;
  defaultTodayDate?: string;
}

export const CustomerFormModal: React.FC<CustomerFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialCustomer,
  defaultTodayDate = getTodayISO(),
}) => {
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [village, setVillage] = useState('');
  const [financeAmount, setFinanceAmount] = useState<number>(100000);
  const [startDate, setStartDate] = useState<string>(defaultTodayDate);
  const [tenureDays, setTenureDays] = useState<number>(100);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (initialCustomer) {
      setName(initialCustomer.name);
      setMobile(initialCustomer.mobile);
      setVillage(initialCustomer.village);
      setFinanceAmount(initialCustomer.financeAmount);
      setStartDate(initialCustomer.startDate);
      setTenureDays(initialCustomer.tenureDays || 100);
      setNotes(initialCustomer.notes || '');
    } else {
      setName('');
      setMobile('');
      setVillage('');
      setFinanceAmount(100000);
      setStartDate(defaultTodayDate);
      setTenureDays(100);
      setNotes('');
    }
    setErrors({});
  }, [initialCustomer, isOpen, defaultTodayDate]);

  // Live calculation of 10% upfront profit, 90% disbursed, and 1% daily collection
  const calculated = calculateCustomerFinanceDetails(financeAmount, 10, tenureDays);
  const endDate = startDate ? addDaysISO(startDate, tenureDays - 1) : '';

  const quickAmounts = [5000, 25000, 50000, 100000, 200000];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { [key: string]: string } = {};

    if (!name.trim()) newErrors.name = 'Customer Name is required';
    if (!mobile.trim()) newErrors.mobile = 'Mobile number is required';
    if (!village.trim()) newErrors.village = 'Village / Address is required';
    if (!financeAmount || financeAmount <= 0) newErrors.financeAmount = 'Enter a valid finance amount';
    if (!startDate) newErrors.startDate = 'Start date is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit({
      name: name.trim(),
      mobile: mobile.trim(),
      village: village.trim(),
      financeAmount,
      startDate,
      tenureDays,
      notes: notes.trim(),
    });

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialCustomer ? t('edit') : t('newLoan')}
      subtitle={t('autoCalculation')}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Customer Basic Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-bold text-gold-300 mb-1">
              {t('customerName')} *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gold-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ramesh Patel"
                className={`w-full pl-9 pr-3 py-2 text-sm rounded-xl border ${
                  errors.name
                    ? 'border-rose-500 focus:ring-rose-500'
                    : 'border-gold-500/30 focus:border-gold-400'
                } bg-dark-850 text-white outline-none transition-all`}
              />
            </div>
            {errors.name && (
              <p className="text-[11px] text-rose-400 mt-1 font-medium">{errors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-gold-300 mb-1">
              {t('mobileNumber')} *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gold-400">
                <Phone className="w-4 h-4" />
              </div>
              <input
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="e.g. 9876543210"
                className={`w-full pl-9 pr-3 py-2 text-sm rounded-xl border ${
                  errors.mobile
                    ? 'border-rose-500 focus:ring-rose-500'
                    : 'border-gold-500/30 focus:border-gold-400'
                } bg-dark-850 text-white outline-none transition-all`}
              />
            </div>
            {errors.mobile && (
              <p className="text-[11px] text-rose-400 mt-1 font-medium">{errors.mobile}</p>
            )}
          </div>
        </div>

        {/* Village / Address */}
        <div>
          <label className="block text-xs font-bold text-gold-300 mb-1">
            {t('villageAddress')} *
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gold-400">
              <MapPin className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={village}
              onChange={(e) => setVillage(e.target.value)}
              placeholder="e.g. Rampur (Main Market near Temple)"
              className={`w-full pl-9 pr-3 py-2 text-sm rounded-xl border ${
                errors.village
                  ? 'border-rose-500 focus:ring-rose-500'
                  : 'border-gold-500/30 focus:border-gold-400'
              } bg-dark-850 text-white outline-none transition-all`}
            />
          </div>
          {errors.village && (
            <p className="text-[11px] text-rose-400 mt-1 font-medium">{errors.village}</p>
          )}
        </div>

        {/* Finance Amount & Quick Presets */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-bold text-gold-300">
              {t('financeAmount')} *
            </label>
            <span className="text-xs font-black text-gold-400">
              {formatINR(financeAmount)}
            </span>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-amber-400">
              <IndianRupee className="w-4 h-4 font-bold" />
            </div>
            <input
              type="number"
              step="any"
              min="1"
              inputMode="decimal"
              value={financeAmount || ''}
              onChange={(e) => setFinanceAmount(Number(e.target.value))}
              placeholder="100000"
              className="w-full pl-9 pr-3 py-2.5 text-sm font-mono font-black rounded-xl border border-gold-500/40 bg-dark-850 text-white outline-none focus:border-gold-400 transition-all"
            />
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {quickAmounts.map((amt) => (
              <button
                type="button"
                key={amt}
                onClick={() => setFinanceAmount(amt)}
                className={`text-xs px-2.5 py-1 rounded-lg border font-bold transition-all ${
                  financeAmount === amt
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-dark-950 border-gold-400 shadow-glow-gold'
                    : 'bg-dark-850 text-gold-300 border-gold-500/20 hover:border-gold-500/50'
                }`}
              >
                {formatINR(amt)}
              </button>
            ))}
          </div>
        </div>

        {/* Start Date & Tenure */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-bold text-gold-300 mb-1">
              {t('startDate')} *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gold-400">
                <Calendar className="w-4 h-4" />
              </div>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm font-mono rounded-xl border border-gold-500/30 bg-dark-850 text-white outline-none focus:border-gold-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gold-300 mb-1">
              {t('tenureDays')}
            </label>
            <input
              type="number"
              value={tenureDays}
              onChange={(e) => setTenureDays(Math.max(1, Number(e.target.value)))}
              className="w-full px-3 py-2 text-sm font-mono rounded-xl border border-gold-500/30 bg-dark-850 text-white outline-none focus:border-gold-400"
            />
          </div>
        </div>

        {/* LIVE AUTOMATIC CALCULATION CARD */}
        <div className="rounded-2xl bg-dark-850 border border-gold-500/30 p-4 space-y-2.5 shadow-lg">
          <div className="flex items-center justify-between border-b border-dark-750 pb-2">
            <div className="flex items-center gap-1.5 text-xs font-black text-gold-400 uppercase tracking-wide">
              <CheckCircle2 className="w-4 h-4 text-amber-400" />
              <span>{t('autoCalculation')}</span>
            </div>
            <span className="text-[11px] font-bold text-slate-400">
              {tenureDays} {t('day')}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs pt-1">
            <div className="bg-dark-900 p-2.5 rounded-xl border border-gold-500/20 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-0.5">
                <span>{t('profit10Percent')}</span>
                <span className="text-[10px] text-amber-400 font-bold">Cut</span>
              </div>
              <div className="text-base font-black text-amber-400 font-mono">
                {formatINR(calculated.upfrontProfit)}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">{t('profitPocketed')}</div>
            </div>

            <div className="bg-dark-900 p-2.5 rounded-xl border border-gold-500/20 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-0.5">
                <span>{t('cashGiven90Percent')}</span>
                <span className="text-[10px] text-emerald-400 font-bold">90%</span>
              </div>
              <div className="text-base font-black text-emerald-400 font-mono">
                {formatINR(calculated.actualDisbursed)}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">{t('cashToBorrower')}</div>
            </div>

            <div className="bg-dark-900 p-2.5 rounded-xl border border-gold-500/30 shadow-sm col-span-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-slate-400">{t('dailyCollection1Percent')}</span>
                  <div className="text-lg font-black text-gold-400 font-mono">
                    {formatINR(calculated.dailyRate)} <span className="text-xs font-normal text-slate-400">/ day</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-slate-400">{t('endDate')}</span>
                  <div className="text-xs font-bold text-white font-mono">
                    {endDate ? formatDisplayDate(endDate) : '-'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Optional Notes */}
        <div>
          <label className="block text-xs font-bold text-gold-300 mb-1">
            {t('notes')}
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Recommended by local trader"
            className="w-full px-3 py-2 text-sm rounded-xl border border-gold-500/30 bg-dark-850 text-white outline-none focus:border-gold-400"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-dark-750">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-bold text-slate-400 hover:text-white"
          >
            {t('cancel')}
          </button>
          <button
            type="submit"
            className="px-6 py-2 text-sm font-black rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 active:scale-95 text-dark-950 shadow-glow-gold transition-all"
          >
            {initialCustomer ? t('save') : `${t('save')} & ${t('passbook')}`}
          </button>
        </div>
      </form>
    </Modal>
  );
};
