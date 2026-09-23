import React from 'react';
import { Customer, PaymentRecord } from '../../types/finance';
import { Modal } from '../common/Modal';
import { formatINR, numberToWordsINR } from '../../utils/currency';
import { formatDisplayDate, formatTimestamp } from '../../utils/dateUtils';
import { generateReceiptPDF } from '../../utils/pdfExport';
import { useLanguage } from '../../hooks/useLanguage';
import { Download, Printer, MessageCircle, CheckCircle } from 'lucide-react';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: PaymentRecord | null;
  customer: Customer | null;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  payment,
  customer,
}) => {
  const { t } = useLanguage();
  if (!payment || !customer) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    generateReceiptPDF(payment, customer);
  };

  const handleWhatsAppShare = () => {
    const text = `*GIRI-GIRI DAILY FINANCE RECEIPT*\n` +
      `--------------------------------\n` +
      `*Receipt No:* ${payment.receiptNumber}\n` +
      `*Customer:* ${customer.name} (${customer.village})\n` +
      `*Amount Paid:* ${formatINR(payment.amount)}\n` +
      `*For Date:* Day ${payment.dayNumber} (${formatDisplayDate(payment.scheduleDate)})\n` +
      `*Payment Date:* ${formatDisplayDate(payment.paymentDate)}\n` +
      `*Mode:* ${payment.paymentMethod}\n` +
      `--------------------------------\n` +
      `Thank you for your daily payment! 🙏`;

    const encodedText = encodeURIComponent(text);
    const phone = customer.mobile.replace(/\D/g, '');
    const cleanPhone = phone.length === 10 ? `91${phone}` : phone;
    window.open(`https://wa.me/${cleanPhone}?text=${encodedText}`, '_blank');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('receiptSlip')}
      subtitle={`#${payment.receiptNumber}`}
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Physical slip visual presentation */}
        <div
          id="printable-receipt"
          className="bg-dark-850 border-2 border-dashed border-gold-500/40 rounded-2xl p-5 shadow-2xl space-y-4 text-white"
        >
          {/* Header */}
          <div className="text-center pb-3 border-b border-dark-750">
            <div className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-gold-500/20 text-gold-400 border border-gold-500/40 mb-1">
              <CheckCircle className="w-5 h-5" />
            </div>
            <h4 className="text-base font-black tracking-tight uppercase text-gold-400">
              Giri-Giri Daily Finance
            </h4>
            <p className="text-[11px] text-slate-400 font-medium">{t('receiptSlip')}</p>
          </div>

          {/* Receipt Info */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-slate-400">Receipt No:</span>
              <p className="font-mono font-bold text-gold-400">{payment.receiptNumber}</p>
            </div>
            <div className="text-right">
              <span className="text-slate-400">Date & Time:</span>
              <p className="font-medium text-slate-200">
                {formatTimestamp(payment.createdAt || new Date().toISOString())}
              </p>
            </div>
          </div>

          {/* Customer & Installment Info */}
          <div className="bg-dark-900 p-3 rounded-xl space-y-1.5 text-xs border border-dark-750">
            <div className="flex justify-between">
              <span className="text-slate-400">{t('customerName')}:</span>
              <span className="font-bold text-white">{customer.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">{t('villageAddress')}:</span>
              <span className="font-medium text-slate-300">{customer.village}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">{t('mobileNumber')}:</span>
              <span className="font-mono text-slate-300">{customer.mobile}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-dark-750">
              <span className="text-slate-400">{t('scheduledDate')}:</span>
              <span className="font-bold text-gold-400">
                Day {payment.dayNumber} ({formatDisplayDate(payment.scheduleDate)})
              </span>
            </div>
          </div>

          {/* Big Amount Badge */}
          <div className="text-center p-3.5 rounded-xl bg-dark-950 border border-gold-500/40 shadow-glow-gold">
            <span className="text-[10px] font-bold text-gold-400 uppercase tracking-wider">
              {t('amountToCollect')}
            </span>
            <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono my-0.5">
              {formatINR(payment.amount)}
            </div>
            <p className="text-[11px] text-slate-400 italic">
              {numberToWordsINR(payment.amount)}
            </p>
          </div>

          {/* Payment Method & Notes */}
          <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
            <span>
              Mode: <strong className="text-white">{payment.paymentMethod}</strong>
            </span>
            {payment.notes && (
              <span className="truncate max-w-[180px] italic text-slate-300">
                Note: {payment.notes}
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-2 pt-2">
          <button
            type="button"
            onClick={handleWhatsAppShare}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
          >
            <MessageCircle className="w-4 h-4" />
            <span>{t('whatsapp')}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPDF}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-gradient-to-r from-amber-500 to-yellow-500 text-dark-950 font-black text-xs rounded-xl shadow-glow-gold transition-all"
          >
            <Download className="w-4 h-4 stroke-[2.5]" />
            <span>PDF Slip</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-dark-800 hover:bg-dark-750 text-slate-200 font-bold text-xs rounded-xl border border-dark-750 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Print</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
