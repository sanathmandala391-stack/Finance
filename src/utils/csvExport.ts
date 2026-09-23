import { Customer, PaymentRecord } from '../types/finance';
import { getTodayISO } from './dateUtils';
import { computeCustomerFinancialProfile } from './financeCalculations';

function downloadCSVFile(csvContent: string, filename: string) {
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportCustomersToCSV(customers: Customer[], payments: PaymentRecord[]) {
  const today = getTodayISO();
  const headers = [
    'Customer Name',
    'Mobile',
    'Village/Address',
    'Finance Amount (Rs)',
    '10% Upfront Profit (Rs)',
    'Actual Given (Rs)',
    'Daily Rate (Rs)',
    'Start Date',
    'Total Expected Till Today (Rs)',
    'Total Collected (Rs)',
    'Total Due Till Today (Rs)',
    'Remaining Balance (Rs)',
    'Paid Days',
    'Due Days',
    'Progress %',
    'Status',
  ];

  const rows = customers.map(customer => {
    const profile = computeCustomerFinancialProfile(customer, payments, today);
    return [
      `"${customer.name.replace(/"/g, '""')}"`,
      `"${customer.mobile}"`,
      `"${customer.village.replace(/"/g, '""')}"`,
      customer.financeAmount,
      customer.upfrontProfit,
      customer.actualDisbursed,
      customer.dailyRate,
      customer.startDate,
      profile.totalExpectedTillToday,
      profile.totalCollected,
      profile.totalDueTillToday,
      profile.totalRemainingBalance,
      profile.paidDaysCount + profile.paidLateDaysCount,
      profile.dueDaysCount,
      `${profile.progressPercent}%`,
      customer.status,
    ];
  });

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  downloadCSVFile(csvContent, `GiriGiri_Customers_${today}.csv`);
}

export function exportPaymentsToCSV(payments: PaymentRecord[]) {
  const today = getTodayISO();
  const headers = [
    'Receipt No',
    'Payment Date',
    'Customer Name',
    'Schedule Date',
    'Day #',
    'Amount (Rs)',
    'Payment Method',
    'Notes',
    'Created At',
  ];

  const rows = payments.map(p => [
    `"${p.receiptNumber}"`,
    `"${p.paymentDate}"`,
    `"${(p.customerName || '').replace(/"/g, '""')}"`,
    `"${p.scheduleDate}"`,
    p.dayNumber,
    p.amount,
    `"${p.paymentMethod}"`,
    `"${(p.notes || '').replace(/"/g, '""')}"`,
    `"${p.createdAt}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  downloadCSVFile(csvContent, `GiriGiri_Payment_Ledger_${today}.csv`);
}

export function exportTodayCollectionSheetToCSV(customers: Customer[], payments: PaymentRecord[]) {
  const today = getTodayISO();
  const headers = [
    'Village',
    'Customer Name',
    'Mobile',
    'Today Target (Rs)',
    'Today Paid (Rs)',
    'Status Today',
    'Total Past Due (Rs)',
    'Total Balance Remaining (Rs)',
  ];

  const rows = customers.map(customer => {
    const profile = computeCustomerFinancialProfile(customer, payments, today);
    const todayItem = profile.todayStatus;
    const paidToday = todayItem ? todayItem.paidAmount : 0;
    const targetToday = todayItem ? todayItem.targetAmount : 0;
    const statusToday = todayItem ? todayItem.status : 'NO_SCHEDULE';

    return [
      `"${customer.village.replace(/"/g, '""')}"`,
      `"${customer.name.replace(/"/g, '""')}"`,
      `"${customer.mobile}"`,
      targetToday,
      paidToday,
      statusToday,
      profile.totalDueTillToday,
      profile.totalRemainingBalance,
    ];
  });

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  downloadCSVFile(csvContent, `GiriGiri_Daily_Collection_Sheet_${today}.csv`);
}
