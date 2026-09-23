import React, { useState, useMemo } from 'react';
import { Customer, PaymentRecord } from '../../types/finance';
import { formatINR } from '../../utils/currency';
import { formatDisplayDate } from '../../utils/dateUtils';
import { ReceiptModal } from './ReceiptModal';
import { exportPaymentsToCSV } from '../../utils/csvExport';
import { useLanguage } from '../../hooks/useLanguage';
import {
  Receipt,
  Search,
  Trash2,
  FileSpreadsheet,
  Eye,
} from 'lucide-react';

interface TransactionHistoryViewProps {
  payments: PaymentRecord[];
  customers: Customer[];
  onDeletePayment: (paymentId: string) => void;
}

export const TransactionHistoryView: React.FC<TransactionHistoryViewProps> = ({
  payments,
  customers,
  onDeletePayment,
}) => {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<string>('ALL');
  const [selectedPaymentForReceipt, setSelectedPaymentForReceipt] = useState<PaymentRecord | null>(null);
  const [activeCustomerForReceipt, setActiveCustomerForReceipt] = useState<Customer | null>(null);

  // Filtered payments
  const filteredPayments = useMemo(() => {
    return payments
      .filter((p) => {
        const query = searchQuery.toLowerCase().trim();
        const matchesQuery =
          !query ||
          (p.customerName || '').toLowerCase().includes(query) ||
          p.receiptNumber.toLowerCase().includes(query) ||
          (p.notes || '').toLowerCase().includes(query);

        const matchesMethod = selectedMethod === 'ALL' || p.paymentMethod === selectedMethod;

        return matchesQuery && matchesMethod;
      })
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }, [payments, searchQuery, selectedMethod]);

  const totalAmount = useMemo(() => {
    return filteredPayments.reduce((sum, p) => sum + p.amount, 0);
  }, [filteredPayments]);

  const handleOpenReceipt = (payment: PaymentRecord) => {
    const cust = customers.find((c) => c.id === payment.customerId);
    if (cust) {
      setActiveCustomerForReceipt(cust);
      setSelectedPaymentForReceipt(payment);
    }
  };

  const handleDelete = (payment: PaymentRecord) => {
    if (
      window.confirm(
        `Are you sure you want to revert/delete receipt ${payment.receiptNumber} for ${payment.customerName} (${formatINR(
          payment.amount
        )})? This will restore the due amount for that day.`
      )
    ) {
      onDeletePayment(payment.id);
    }
  };

  return (
    <div className="space-y-5 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Receipt className="w-6 h-6 text-gold-400" />
            <span>{t('ledger')}</span>
          </h2>
          <p className="text-xs sm:text-sm text-gold-200/70 font-medium">
            {t('paymentHistory')}
          </p>
        </div>

        <button
          onClick={() => exportPaymentsToCSV(payments)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-dark-900 hover:bg-dark-850 border border-gold-500/30 text-gold-400 rounded-xl text-xs font-bold transition-all shadow-sm"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          <span>{t('exportCSV')}</span>
        </button>
      </div>

      {/* Quick Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-dark-900 border border-gold-500/20 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase">{t('todaysCollected')}</span>
          <div className="text-2xl font-black text-gold-400 font-mono mt-0.5">
            {formatINR(totalAmount)}
          </div>
          <span className="text-[10px] text-slate-400">{filteredPayments.length} receipts</span>
        </div>

        <div className="p-4 rounded-2xl bg-dark-900 border border-gold-500/20 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase">{t('totalCollectedAllTime')}</span>
          <div className="text-2xl font-black text-emerald-400 font-mono mt-0.5">
            {payments.length}
          </div>
          <span className="text-[10px] text-slate-400">Total Entries</span>
        </div>

        <div className="p-4 rounded-2xl bg-dark-900 border border-gold-500/20 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Average Daily Payment</span>
          <div className="text-2xl font-black text-white font-mono mt-0.5">
            {payments.length > 0 ? formatINR(Math.round(totalAmount / (filteredPayments.length || 1))) : '₹0'}
          </div>
          <span className="text-[10px] text-slate-400">Per receipt</span>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-dark-900 p-3.5 rounded-2xl border border-gold-500/20 shadow-sm">
        <div className="relative flex-1">
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

        <div className="w-full sm:w-48">
          <select
            value={selectedMethod}
            onChange={(e) => setSelectedMethod(e.target.value)}
            className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-gold-500/20 bg-dark-850 text-white outline-none focus:border-gold-400"
          >
            <option value="ALL">All Payment Modes</option>
            <option value="CASH">{t('cash')}</option>
            <option value="UPI">{t('upi')}</option>
            <option value="BANK">{t('bank')}</option>
          </select>
        </div>
      </div>

      {/* Table of Transactions */}
      <div className="bg-dark-900 rounded-2xl border border-gold-500/20 overflow-hidden shadow-card">
        {filteredPayments.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Receipt className="w-12 h-12 mx-auto mb-2 opacity-50 text-gold-400" />
            <p className="font-bold text-base text-white">{t('noRecent')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-dark-850 border-b border-dark-750 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="p-3">Receipt No</th>
                  <th className="p-3">{t('customerName')}</th>
                  <th className="p-3">Payment Date</th>
                  <th className="p-3">Schedule Day</th>
                  <th className="p-3">{t('amountToCollect')}</th>
                  <th className="p-3">{t('paymentMode')}</th>
                  <th className="p-3">{t('notes')}</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-750">
                {filteredPayments.map((payment) => (
                  <tr
                    key={payment.id}
                    className="hover:bg-dark-850 transition-colors"
                  >
                    <td className="p-3 font-mono font-bold text-gold-400">
                      {payment.receiptNumber}
                    </td>
                    <td className="p-3 font-bold text-white">
                      {payment.customerName || 'Customer'}
                    </td>
                    <td className="p-3 text-slate-200 font-medium">
                      {formatDisplayDate(payment.paymentDate)}
                    </td>
                    <td className="p-3 font-mono text-slate-400">
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
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenReceipt(payment)}
                          className="px-2.5 py-1 rounded-lg bg-dark-800 hover:bg-dark-750 border border-gold-500/20 text-gold-400 font-bold text-xs flex items-center gap-1 transition-all"
                          title="View Slip"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Slip</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(payment)}
                          className="p-1 rounded-lg text-rose-400 hover:bg-rose-950/60 transition-all"
                          title="Delete Payment"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Receipt Modal */}
      {selectedPaymentForReceipt && activeCustomerForReceipt && (
        <ReceiptModal
          isOpen={!!selectedPaymentForReceipt}
          onClose={() => {
            setSelectedPaymentForReceipt(null);
            setActiveCustomerForReceipt(null);
          }}
          payment={selectedPaymentForReceipt}
          customer={activeCustomerForReceipt}
        />
      )}
    </div>
  );
};
