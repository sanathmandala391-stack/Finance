import React, { useState } from 'react';
import { Customer, DayScheduleItem, PaymentRecord } from '../../types/finance';
import { computeCustomerFinancialProfile } from '../../utils/financeCalculations';
import { formatINR } from '../../utils/currency';
import { formatDisplayDate, getTodayISO } from '../../utils/dateUtils';
import { generateCustomerPassbookPDF } from '../../utils/pdfExport';
import { ScheduleGridView } from '../schedule/ScheduleGridView';
import { PayDueModal } from '../schedule/PayDueModal';
import { QuickPaymentModal } from '../today/QuickPaymentModal';
import { ReceiptModal } from '../history/ReceiptModal';
import { useLanguage } from '../../hooks/useLanguage';
import {
  ArrowLeft,
  Calendar,
  Phone,
  MessageCircle,
  MapPin,
  Download,
  PlusCircle,
  Edit2,
  Trash2,
  FileText,
} from 'lucide-react';

interface CustomerDetailViewProps {
  customer: Customer;
  payments: PaymentRecord[];
  onBack: () => void;
  onEditCustomer: (customer: Customer) => void;
  onDeleteCustomer: (id: string) => void;
  onRecordPayment: (params: any) => void;
  todayDate?: string;
}

export const CustomerDetailView: React.FC<CustomerDetailViewProps> = ({
  customer,
  payments,
  onBack,
  onEditCustomer,
  onDeleteCustomer,
  onRecordPayment,
  todayDate = getTodayISO(),
}) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'schedule' | 'transactions'>('schedule');
  const [selectedDay, setSelectedDay] = useState<DayScheduleItem | null>(null);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isQuickTodayModalOpen, setIsQuickTodayModalOpen] = useState(false);
  const [selectedPaymentForReceipt, setSelectedPaymentForReceipt] = useState<PaymentRecord | null>(null);

  const profile = computeCustomerFinancialProfile(customer, payments, todayDate);
  const customerPayments = payments.filter((p) => p.customerId === customer.id);

  const handleCall = () => {
    window.location.href = `tel:${customer.mobile}`;
  };

  const handleWhatsApp = () => {
    const phone = customer.mobile.replace(/\D/g, '');
    const cleanPhone = phone.length === 10 ? `91${phone}` : phone;
    const msg = encodeURIComponent(
      `Namaste ${customer.name} ji,\nThis is a reminder regarding your Giri-Giri daily collection.\nDaily installment: ${formatINR(
        customer.dailyRate
      )}\nTotal outstanding balance: ${formatINR(profile.totalRemainingBalance)}.\nThank you!`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank');
  };

  const handleSelectDay = (dayItem: DayScheduleItem) => {
    setSelectedDay(dayItem);
    setIsPayModalOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (window.confirm(`Are you sure you want to delete customer "${customer.name}" and all their records? This cannot be undone.`)) {
      onDeleteCustomer(customer.id);
      onBack();
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Bar with Back Button & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-dark-900 border border-gold-500/30 text-gold-400 font-bold text-xs hover:border-gold-400 shadow-sm transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('customers')}</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => generateCustomerPassbookPDF(customer, payments)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-dark-850 hover:bg-dark-800 border border-gold-500/30 text-gold-400 font-bold text-xs rounded-xl transition-all"
            title="Download printable Passbook PDF"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">{t('downloadPassbookPDF')}</span>
          </button>

          <button
            onClick={() => onEditCustomer(customer)}
            className="p-1.5 rounded-xl bg-dark-850 hover:bg-dark-800 border border-gold-500/30 text-gold-400 transition-all"
            title="Edit Customer"
          >
            <Edit2 className="w-4 h-4" />
          </button>

          <button
            onClick={handleDeleteConfirm}
            className="p-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/60 border border-rose-500/30 text-rose-400 transition-all"
            title="Delete Loan"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Customer Header Card */}
      <div className="bg-dark-900 border border-gold-500/30 rounded-3xl p-5 sm:p-6 shadow-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-dark-750">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 via-yellow-500 to-amber-300 flex items-center justify-center text-dark-950 text-xl font-black shadow-glow-gold">
              {customer.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  {customer.name}
                </h2>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                    profile.isFullyPaid
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                      : 'bg-gold-500/20 text-gold-400 border-gold-500/40'
                  }`}
                >
                  {profile.isFullyPaid ? t('completed') : t('active')}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1 font-medium">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-gold-400" />
                  {customer.village}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-gold-400" />
                  {t('startDate')}: {formatDisplayDate(customer.startDate)}
                </span>
                {customer.notes && (
                  <>
                    <span>•</span>
                    <span className="italic truncate max-w-xs">{customer.notes}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Quick Contact & Quick Pay CTA */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleCall}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-dark-850 hover:bg-dark-800 border border-dark-750 text-slate-200 text-xs font-bold transition-all"
            >
              <Phone className="w-4 h-4 text-gold-400" />
              <span>{customer.mobile}</span>
            </button>

            <button
              onClick={handleWhatsApp}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-500/30 text-emerald-400 text-xs font-bold transition-all"
            >
              <MessageCircle className="w-4 h-4" />
              <span>{t('whatsapp')}</span>
            </button>

            {profile.todayStatus && (
              <button
                onClick={() => {
                  setSelectedDay(profile.todayStatus);
                  setIsQuickTodayModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-600 hover:to-yellow-600 active:scale-95 text-dark-950 text-xs font-black shadow-glow-gold transition-all"
              >
                <PlusCircle className="w-4 h-4 stroke-[2.5]" />
                <span>{t('markPaid')} ({formatINR(customer.dailyRate)})</span>
              </button>
            )}
          </div>
        </div>

        {/* 8-Point Giri-Giri Financial Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 pt-5">
          <div className="p-3 rounded-2xl bg-dark-850 border border-dark-750">
            <span className="text-[10px] font-bold text-slate-400 uppercase">{t('financeAmount')}</span>
            <div className="text-base font-black text-white font-mono mt-0.5">
              {formatINR(customer.financeAmount)}
            </div>
            <div className="text-[10px] text-slate-400">Total Book</div>
          </div>

          <div className="p-3 rounded-2xl bg-dark-850 border border-amber-500/30">
            <span className="text-[10px] font-bold text-amber-400 uppercase">
              {t('profit10Percent')}
            </span>
            <div className="text-base font-black text-amber-400 font-mono mt-0.5">
              {formatINR(customer.upfrontProfit)}
            </div>
            <div className="text-[10px] text-amber-500 font-medium">{t('profitPocketed')}</div>
          </div>

          <div className="p-3 rounded-2xl bg-dark-850 border border-emerald-500/30">
            <span className="text-[10px] font-bold text-emerald-400 uppercase">
              {t('cashGiven90Percent')}
            </span>
            <div className="text-base font-black text-emerald-400 font-mono mt-0.5">
              {formatINR(customer.actualDisbursed)}
            </div>
            <div className="text-[10px] text-emerald-500">{t('cashToBorrower')}</div>
          </div>

          <div className="p-3 rounded-2xl bg-dark-850 border border-gold-500/30">
            <span className="text-[10px] font-bold text-gold-400 uppercase">
              {t('dailyCollection1Percent')}
            </span>
            <div className="text-base font-black text-gold-400 font-mono mt-0.5">
              {formatINR(customer.dailyRate)}
            </div>
            <div className="text-[10px] text-gold-500">{t('perDay100Days')}</div>
          </div>

          <div className="p-3 rounded-2xl bg-dark-850 border border-dark-750">
            <span className="text-[10px] font-bold text-slate-400 uppercase">{t('totalExpected')}</span>
            <div className="text-base font-black text-slate-200 font-mono mt-0.5">
              {formatINR(profile.totalExpectedTillToday)}
            </div>
            <div className="text-[10px] text-slate-400">Target</div>
          </div>

          <div className="p-3 rounded-2xl bg-dark-850 border border-emerald-500/30">
            <span className="text-[10px] font-bold text-emerald-400 uppercase">
              {t('totalCollectedCust')}
            </span>
            <div className="text-base font-black text-emerald-400 font-mono mt-0.5">
              {formatINR(profile.totalCollected)}
            </div>
            <div className="text-[10px] text-emerald-500 font-medium">
              {profile.paidDaysCount + profile.paidLateDaysCount} {t('day')}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-dark-850 border border-rose-500/30">
            <span className="text-[10px] font-bold text-rose-400 uppercase">
              {t('totalOutstandingDue')}
            </span>
            <div className="text-base font-black text-rose-400 font-mono mt-0.5">
              {formatINR(profile.totalDueTillToday)}
            </div>
            <div className="text-[10px] text-rose-500 font-medium">
              {profile.dueDaysCount} {t('due')}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-black text-white border border-gold-500/40">
            <span className="text-[10px] font-bold text-gold-400 uppercase">{t('balanceDue')}</span>
            <div className="text-base font-black text-white font-mono mt-0.5">
              {formatINR(profile.totalRemainingBalance)}
            </div>
            <div className="text-[10px] text-gold-400 font-semibold">{profile.progressPercent}% Repaid</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4 pt-3 border-t border-dark-750">
          <div className="flex items-center justify-between text-xs font-semibold mb-1">
            <span className="text-slate-400">
              {t('repaymentProgress')}: <strong className="text-white">{formatINR(profile.totalCollected)}</strong> / {formatINR(customer.financeAmount)}
            </span>
            <span className="text-gold-400 font-bold">
              {profile.progressPercent}%
            </span>
          </div>
          <div className="w-full bg-dark-950 rounded-full h-3 overflow-hidden p-0.5 border border-gold-500/20">
            <div
              className="bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300 h-full rounded-full transition-all duration-500 shadow-glow-gold"
              style={{ width: `${profile.progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-3 border-b border-dark-750 pb-2">
        <button
          onClick={() => setActiveTab('schedule')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all ${
            activeTab === 'schedule'
              ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-dark-950 shadow-glow-gold'
              : 'bg-dark-900 text-slate-400 hover:text-white'
          }`}
        >
          📅 {t('scheduleMatrix')}
        </button>
        <button
          onClick={() => setActiveTab('transactions')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-1.5 ${
            activeTab === 'transactions'
              ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-dark-950 shadow-glow-gold'
              : 'bg-dark-900 text-slate-400 hover:text-white'
          }`}
        >
          <span>📜 {t('paymentHistory')}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-dark-800 font-bold text-gold-400 border border-gold-500/20">
            {customerPayments.length}
          </span>
        </button>
      </div>

      {/* Tab 1: 100-Day Schedule Matrix */}
      {activeTab === 'schedule' && (
        <ScheduleGridView
          customer={customer}
          schedule={profile.schedule}
          onSelectDay={handleSelectDay}
        />
      )}

      {/* Tab 2: Transaction History & Receipts */}
      {activeTab === 'transactions' && (
        <div className="bg-dark-900 rounded-2xl border border-gold-500/20 overflow-hidden shadow-card">
          {customerPayments.length === 0 ? (
            <div className="p-10 text-center text-slate-400">
              <FileText className="w-10 h-10 mx-auto mb-2 opacity-50 text-gold-400" />
              <p className="font-semibold text-sm text-white">{t('noRecent')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-dark-850 border-b border-dark-750 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="p-3">Receipt No</th>
                    <th className="p-3">Payment Date</th>
                    <th className="p-3">Installment Day</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Payment Mode</th>
                    <th className="p-3">Notes</th>
                    <th className="p-3 text-right">{t('receiptSlip')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-750">
                  {customerPayments.map((payment) => (
                    <tr
                      key={payment.id}
                      className="hover:bg-dark-850 transition-colors"
                    >
                      <td className="p-3 font-mono font-bold text-gold-400">
                        {payment.receiptNumber}
                      </td>
                      <td className="p-3 font-medium text-white">
                        {formatDisplayDate(payment.paymentDate)}
                      </td>
                      <td className="p-3 font-mono text-slate-300">
                        Day {payment.dayNumber} ({formatDisplayDate(payment.scheduleDate, false)})
                      </td>
                      <td className="p-3 font-mono font-bold text-emerald-400 text-sm">
                        {formatINR(payment.amount)}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-md bg-dark-800 text-slate-300 font-semibold text-[11px] border border-dark-750">
                          {payment.paymentMethod}
                        </span>
                      </td>
                      <td className="p-3 text-slate-400 max-w-xs truncate">
                        {payment.notes || '-'}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedPaymentForReceipt(payment)}
                          className="px-3 py-1 rounded-lg bg-dark-800 hover:bg-dark-750 border border-gold-500/20 text-gold-400 font-bold text-xs transition-all"
                        >
                          View Slip
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Pay Due / Settle Modal */}
      {selectedDay && (
        <PayDueModal
          isOpen={isPayModalOpen}
          onClose={() => setIsPayModalOpen(false)}
          customer={customer}
          dayItem={selectedDay}
          onConfirmPayment={onRecordPayment}
          todayDate={todayDate}
        />
      )}

      {/* Quick Today Modal */}
      {profile.todayStatus && (
        <QuickPaymentModal
          isOpen={isQuickTodayModalOpen}
          onClose={() => setIsQuickTodayModalOpen(false)}
          customer={customer}
          dayScheduleItem={profile.todayStatus}
          onConfirmPayment={onRecordPayment}
          todayDate={todayDate}
        />
      )}

      {/* Receipt Modal */}
      {selectedPaymentForReceipt && (
        <ReceiptModal
          isOpen={!!selectedPaymentForReceipt}
          onClose={() => setSelectedPaymentForReceipt(null)}
          payment={selectedPaymentForReceipt}
          customer={customer}
        />
      )}
    </div>
  );
};
