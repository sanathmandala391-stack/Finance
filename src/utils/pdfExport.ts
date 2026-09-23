import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Customer, PaymentRecord } from '../types/finance';
import { formatDisplayDate, formatTimestamp, getTodayISO } from './dateUtils';
import { formatINR, numberToWordsINR } from './currency';
import { computeCustomerFinancialProfile } from './financeCalculations';

export function generateCustomerPassbookPDF(customer: Customer, payments: PaymentRecord[]) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const profile = computeCustomerFinancialProfile(customer, payments, getTodayISO());

  // Header Banner
  doc.setFillColor(6, 78, 59); // Deep emerald
  doc.rect(0, 0, 210, 32, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('GIRI-GIRI DAILY FINANCE', 14, 15);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Customer Daily Passbook & Schedule Ledger', 14, 23);
  doc.text(`Generated on: ${formatDisplayDate(getTodayISO())}`, 145, 23);

  // Customer & Loan Summary Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 38, 182, 45, 3, 3, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Customer: ${customer.name}`, 20, 48);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Mobile: ${customer.mobile}`, 20, 56);
  doc.text(`Village/Area: ${customer.village}`, 20, 63);
  doc.text(`Loan Start Date: ${formatDisplayDate(customer.startDate)}`, 20, 70);

  // Financial Breakdown Column 2 & 3
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Finance Amount:', 90, 48);
  doc.text(formatINR(customer.financeAmount), 135, 48);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(180, 83, 9); // Amber
  doc.text('10% Upfront Profit (Cut):', 90, 56);
  doc.text(formatINR(customer.upfrontProfit), 135, 56);

  doc.setTextColor(5, 150, 105); // Emerald
  doc.text('Actual Cash Disbursed:', 90, 63);
  doc.text(formatINR(customer.actualDisbursed), 135, 63);

  doc.setTextColor(71, 85, 105);
  doc.text('Daily Collection (1%):', 90, 70);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${formatINR(customer.dailyRate)} / day`, 135, 70);

  doc.text(`Collected: ${formatINR(profile.totalCollected)}`, 90, 77);
  doc.text(`Remaining Balance: ${formatINR(profile.totalRemainingBalance)}`, 135, 77);

  // Table of 100 days
  const tableData = profile.schedule.map(item => {
    let statusText = 'Upcoming';
    if (item.status === 'PAID') statusText = 'Paid (On Time)';
    else if (item.status === 'PAID_LATE') statusText = 'Paid Late';
    else if (item.status === 'DUE') statusText = 'DUE (Missed)';
    else if (item.status === 'PARTIAL') statusText = `Partial (${formatINR(item.paidAmount)})`;
    else if (item.status === 'TODAY_PENDING') statusText = 'Today (Pending)';

    return [
      `Day ${item.dayNumber}`,
      formatDisplayDate(item.date),
      formatINR(item.targetAmount),
      item.paidAmount > 0 ? formatINR(item.paidAmount) : '-',
      item.lastPaidDate ? formatDisplayDate(item.lastPaidDate) : '-',
      statusText,
    ];
  });

  autoTable(doc, {
    startY: 88,
    head: [['Day #', 'Scheduled Date', 'Target', 'Paid Amount', 'Paid Date', 'Status']],
    body: tableData,
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 1.8 },
    headStyles: { fillColor: [6, 78, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 18 },
      1: { cellWidth: 32 },
      2: { cellWidth: 25 },
      3: { cellWidth: 28 },
      4: { cellWidth: 32 },
      5: { cellWidth: 47 },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 5) {
        const val = String(data.cell.raw);
        if (val.includes('Paid (On Time)')) {
          data.cell.styles.textColor = [5, 150, 105]; // Green
          data.cell.styles.fontStyle = 'bold';
        } else if (val.includes('DUE')) {
          data.cell.styles.textColor = [225, 29, 72]; // Red
          data.cell.styles.fontStyle = 'bold';
        } else if (val.includes('Paid Late')) {
          data.cell.styles.textColor = [2, 132, 199]; // Blue
          data.cell.styles.fontStyle = 'bold';
        } else if (val.includes('Partial')) {
          data.cell.styles.textColor = [217, 119, 6]; // Orange
        } else if (val.includes('Today')) {
          data.cell.styles.textColor = [202, 138, 4]; // Yellow/amber
        }
      }
    }
  });

  doc.save(`GiriGiri_Passbook_${customer.name.replace(/\s+/g, '_')}.pdf`);
}

export function generateReceiptPDF(payment: PaymentRecord, customer: Customer) {
  const doc = new jsPDF('p', 'mm', [105, 148]); // A6 size receipt slip

  doc.setFillColor(6, 78, 59);
  doc.rect(0, 0, 105, 20, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('GIRI-GIRI FINANCE', 52.5, 9, { align: 'center' });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Daily Collection Receipt', 52.5, 15, { align: 'center' });

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(8);
  doc.text(`Receipt No: ${payment.receiptNumber}`, 10, 28);
  doc.text(`Date & Time: ${formatTimestamp(payment.createdAt || new Date().toISOString())}`, 10, 33);

  doc.setDrawColor(203, 213, 225);
  doc.line(10, 37, 95, 37);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`Customer: ${customer.name}`, 10, 44);
  doc.setFont('helvetica', 'normal');
  doc.text(`Village: ${customer.village}  |  Mobile: ${customer.mobile}`, 10, 50);
  doc.text(`Loan Amount: ${formatINR(customer.financeAmount)}`, 10, 56);
  doc.text(`Scheduled Installment Day: Day ${payment.dayNumber} (${formatDisplayDate(payment.scheduleDate)})`, 10, 62);

  // Amount Box
  doc.setFillColor(236, 253, 245);
  doc.setDrawColor(16, 185, 129);
  doc.roundedRect(10, 68, 85, 24, 2, 2, 'FD');

  doc.setTextColor(6, 78, 59);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('AMOUNT RECEIVED', 52.5, 75, { align: 'center' });

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(formatINR(payment.amount), 52.5, 84, { align: 'center' });

  doc.setTextColor(71, 85, 105);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'italic');
  doc.text(numberToWordsINR(payment.amount), 52.5, 98, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.text(`Payment Mode: ${payment.paymentMethod}`, 10, 108);
  if (payment.notes) {
    doc.text(`Notes: ${payment.notes}`, 10, 114);
  }

  doc.line(10, 122, 95, 122);
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('Thank you for your daily payment.', 52.5, 129, { align: 'center' });
  doc.text('Keep this slip as proof of payment.', 52.5, 134, { align: 'center' });

  doc.save(`Receipt_${payment.receiptNumber}.pdf`);
}
