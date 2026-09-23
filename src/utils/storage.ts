import { BackupData, Customer, PaymentRecord } from '../types/finance';
import { addDaysISO, getTodayISO } from './dateUtils';
import { calculateCustomerFinanceDetails } from './financeCalculations';

const STORAGE_KEYS = {
  CUSTOMERS: 'giri_giri_customers_v2',
  PAYMENTS: 'giri_giri_payments_v2',
  SETTINGS: 'giri_giri_settings_v2',
};

export function loadCustomersFromStorage(): Customer[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (error) {
    console.error('Failed to load customers from storage:', error);
    return [];
  }
}

export function saveCustomersToStorage(customers: Customer[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
  } catch (error) {
    console.error('Failed to save customers to storage:', error);
  }
}

export function loadPaymentsFromStorage(): PaymentRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PAYMENTS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (error) {
    console.error('Failed to load payments from storage:', error);
    return [];
  }
}

export function savePaymentsToStorage(payments: PaymentRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(payments));
  } catch (error) {
    console.error('Failed to save payments to storage:', error);
  }
}

/**
 * Generate full JSON backup object
 */
export function createBackupJSON(customers: Customer[], payments: PaymentRecord[]): string {
  const data: BackupData = {
    version: '1.0.0',
    app: 'Giri-Giri Daily Finance Manager',
    exportDate: new Date().toISOString(),
    customers,
    payments,
  };
  return JSON.stringify(data, null, 2);
}

/**
 * Export backup directly as downloadable JSON file
 */
export function exportBackupToJSON(customers: Customer[], payments: PaymentRecord[]): void {
  const jsonString = createBackupJSON(customers, payments);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Giri-Giri-Finance-Backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Parse and validate JSON backup
 */
export function parseAndValidateBackup(jsonString: string): { success: boolean; data?: BackupData; error?: string } {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed || typeof parsed !== 'object') {
      return { success: false, error: 'Invalid JSON file format.' };
    }
    if (!Array.isArray(parsed.customers) || !Array.isArray(parsed.payments)) {
      return { success: false, error: 'Backup file is missing required customers or payments array.' };
    }
    return { success: true, data: parsed as BackupData };
  } catch (e: unknown) {
    return { success: false, error: (e as Error)?.message || 'Failed to parse JSON backup file.' };
  }
}

/**
 * Parse uploaded backup file
 */
export async function parseBackupFile(file: File): Promise<BackupData> {
  const text = await file.text();
  const res = parseAndValidateBackup(text);
  if (!res.success || !res.data) {
    throw new Error(res.error || 'Failed to parse backup file.');
  }
  return res.data;
}


/**
 * Generate realistic Indian Village sample data for immediate demo & testing
 */
export function generateRealisticDemoData(): { customers: Customer[]; payments: PaymentRecord[] } {
  const today = getTodayISO();
  
  // Base start dates relative to today
  // Customer 1: Started 20 days ago (₹1,00,000 -> ₹1,000/day, paid most, has 1 late, 1 due)
  const startC1 = addDaysISO(today, -20);
  const detailsC1 = calculateCustomerFinanceDetails(100000);
  const c1: Customer = {
    id: 'cust-demo-1',
    name: 'Ramesh Patel',
    mobile: '9876543210',
    village: 'Rampur',
    financeAmount: 100000,
    upfrontProfitPercent: 10,
    upfrontProfit: detailsC1.upfrontProfit, // 10,000
    actualDisbursed: detailsC1.actualDisbursed, // 90,000
    dailyRate: detailsC1.dailyRate, // 1,000
    tenureDays: 100,
    startDate: startC1,
    notes: 'Grocery shop owner at main chowk',
    status: 'ACTIVE',
    createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
  };

  // Customer 2: Started 10 days ago (₹50,000 -> ₹500/day, 100% on-time payer)
  const startC2 = addDaysISO(today, -10);
  const detailsC2 = calculateCustomerFinanceDetails(50000);
  const c2: Customer = {
    id: 'cust-demo-2',
    name: 'Suresh Kumar',
    mobile: '9812345678',
    village: 'Shivpur',
    financeAmount: 50000,
    upfrontProfitPercent: 10,
    upfrontProfit: detailsC2.upfrontProfit, // 5,000
    actualDisbursed: detailsC2.actualDisbursed, // 45,000
    dailyRate: detailsC2.dailyRate, // 500
    tenureDays: 100,
    startDate: startC2,
    notes: 'Dairy milk center',
    status: 'ACTIVE',
    createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
  };

  // Customer 3: Started 15 days ago (₹2,00,000 -> ₹2,000/day, has multiple dues)
  const startC3 = addDaysISO(today, -15);
  const detailsC3 = calculateCustomerFinanceDetails(200000);
  const c3: Customer = {
    id: 'cust-demo-3',
    name: 'Mahesh Sharma',
    mobile: '9765432109',
    village: 'Kisan Nagar',
    financeAmount: 200000,
    upfrontProfitPercent: 10,
    upfrontProfit: detailsC3.upfrontProfit, // 20,000
    actualDisbursed: detailsC3.actualDisbursed, // 1,80,000
    dailyRate: detailsC3.dailyRate, // 2,000
    tenureDays: 100,
    startDate: startC3,
    notes: 'Fertilizer & seeds trader',
    status: 'ACTIVE',
    createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
  };

  // Customer 4: Started 5 days ago (₹5,000 -> ₹50/day, small vegetable cart)
  const startC4 = addDaysISO(today, -5);
  const detailsC4 = calculateCustomerFinanceDetails(5000);
  const c4: Customer = {
    id: 'cust-demo-4',
    name: 'Gita Devi',
    mobile: '9654321098',
    village: 'Mandi Chowk',
    financeAmount: 5000,
    upfrontProfitPercent: 10,
    upfrontProfit: detailsC4.upfrontProfit, // 500
    actualDisbursed: detailsC4.actualDisbursed, // 4,500
    dailyRate: detailsC4.dailyRate, // 50
    tenureDays: 100,
    startDate: startC4,
    notes: 'Vegetable vendor stall #4',
    status: 'ACTIVE',
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
  };

  // Customer 5: Started 3 days ago (₹1,00,000 -> ₹1,000/day, newly started)
  const startC5 = addDaysISO(today, -2);
  const detailsC5 = calculateCustomerFinanceDetails(100000);
  const c5: Customer = {
    id: 'cust-demo-5',
    name: 'Anil Verma',
    mobile: '9543210987',
    village: 'Rampur',
    financeAmount: 100000,
    upfrontProfitPercent: 10,
    upfrontProfit: detailsC5.upfrontProfit, // 10,000
    actualDisbursed: detailsC5.actualDisbursed, // 90,000
    dailyRate: detailsC5.dailyRate, // 1,000
    tenureDays: 100,
    startDate: startC5,
    notes: 'Hardware & electrical store',
    status: 'ACTIVE',
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  };

  const customers = [c1, c2, c3, c4, c5];
  const payments: PaymentRecord[] = [];
  let receiptCounter = 1001;

  // Generate payments for Customer 1 (20 days active: paid days 1-17 on time, day 18 paid late on day 19, day 19 due, day 20 paid today)
  for (let i = 1; i <= 20; i++) {
    const sDate = addDaysISO(c1.startDate, i - 1);
    if (i === 18) {
      // Paid late on day 19
      const pDate = addDaysISO(c1.startDate, 18);
      payments.push({
        id: `pay-${receiptCounter}`,
        customerId: c1.id,
        customerName: c1.name,
        scheduleDate: sDate,
        dayNumber: i,
        paymentDate: pDate,
        amount: 1000,
        paymentMethod: 'CASH',
        receiptNumber: `REC-${receiptCounter++}`,
        notes: 'Paid on next day evening',
        createdAt: new Date(sDate + 'T18:30:00Z').toISOString(),
      });
    } else if (i === 19) {
      // Due! Skip payment
    } else if (i === 20) {
      // Today! Paid today
      payments.push({
        id: `pay-${receiptCounter}`,
        customerId: c1.id,
        customerName: c1.name,
        scheduleDate: sDate,
        dayNumber: i,
        paymentDate: today,
        amount: 1000,
        paymentMethod: 'UPI',
        receiptNumber: `REC-${receiptCounter++}`,
        notes: 'Paid via PhonePe QR',
        createdAt: new Date().toISOString(),
      });
    } else {
      // Paid on time
      payments.push({
        id: `pay-${receiptCounter}`,
        customerId: c1.id,
        customerName: c1.name,
        scheduleDate: sDate,
        dayNumber: i,
        paymentDate: sDate,
        amount: 1000,
        paymentMethod: 'CASH',
        receiptNumber: `REC-${receiptCounter++}`,
        createdAt: new Date(sDate + 'T17:00:00Z').toISOString(),
      });
    }
  }

  // Generate payments for Customer 2 (10 days: paid all 10 days on time)
  for (let i = 1; i <= 10; i++) {
    const sDate = addDaysISO(c2.startDate, i - 1);
    payments.push({
      id: `pay-${receiptCounter}`,
      customerId: c2.id,
      customerName: c2.name,
      scheduleDate: sDate,
      dayNumber: i,
      paymentDate: sDate,
      amount: 500,
      paymentMethod: 'CASH',
      receiptNumber: `REC-${receiptCounter++}`,
      createdAt: new Date(sDate + 'T16:00:00Z').toISOString(),
    });
  }

  // Generate payments for Customer 3 (15 days: paid 8 days, missed 6 days, 1 partial)
  for (let i = 1; i <= 15; i++) {
    const sDate = addDaysISO(c3.startDate, i - 1);
    if (i <= 7) {
      payments.push({
        id: `pay-${receiptCounter}`,
        customerId: c3.id,
        customerName: c3.name,
        scheduleDate: sDate,
        dayNumber: i,
        paymentDate: sDate,
        amount: 2000,
        paymentMethod: 'CASH',
        receiptNumber: `REC-${receiptCounter++}`,
        createdAt: new Date(sDate + 'T18:00:00Z').toISOString(),
      });
    } else if (i === 8) {
      // Partial payment (₹1000 out of ₹2000)
      payments.push({
        id: `pay-${receiptCounter}`,
        customerId: c3.id,
        customerName: c3.name,
        scheduleDate: sDate,
        dayNumber: i,
        paymentDate: sDate,
        amount: 1000,
        paymentMethod: 'CASH',
        receiptNumber: `REC-${receiptCounter++}`,
        notes: 'Partial - promised rest next week',
        createdAt: new Date(sDate + 'T19:00:00Z').toISOString(),
      });
    }
    // Days 9 to 15 are DUE (unpaid)
  }

  // Customer 4 (5 days: paid 4 days on time, today pending)
  for (let i = 1; i <= 4; i++) {
    const sDate = addDaysISO(c4.startDate, i - 1);
    payments.push({
      id: `pay-${receiptCounter}`,
      customerId: c4.id,
      customerName: c4.name,
      scheduleDate: sDate,
      dayNumber: i,
      paymentDate: sDate,
      amount: 50,
      paymentMethod: 'CASH',
      receiptNumber: `REC-${receiptCounter++}`,
      createdAt: new Date(sDate + 'T11:00:00Z').toISOString(),
    });
  }

  // Customer 5 (2 days: Day 1 paid, Day 2 today pending)
  const sDateC5D1 = addDaysISO(c5.startDate, 0);
  payments.push({
    id: `pay-${receiptCounter}`,
    customerId: c5.id,
    customerName: c5.name,
    scheduleDate: sDateC5D1,
    dayNumber: 1,
    paymentDate: sDateC5D1,
    amount: 1000,
    paymentMethod: 'CASH',
    receiptNumber: `REC-${receiptCounter++}`,
    createdAt: new Date(sDateC5D1 + 'T17:30:00Z').toISOString(),
  });

  return { customers, payments };
}
