import { BackupData, Customer, PaymentRecord } from '../types/finance';

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
 * Initial real default data for Mandala Sunitha - Sri Lakshmi Narasimha Finance
 */
export function generateRealisticDemoData(): { customers: Customer[]; payments: PaymentRecord[] } {
  const customer: Customer = {
    id: 'cust-giri-giri-1',
    name: 'Giri Giri',
    mobile: '8466985944',
    village: 'Khammam',
    financeAmount: 100000,
    upfrontProfitPercent: 10,
    upfrontProfit: 10000,
    actualDisbursed: 90000,
    dailyRate: 1000,
    tenureDays: 100,
    startDate: '2026-09-04',
    notes: 'Daily collection Rs.1,000 (100 days)',
    status: 'ACTIVE',
    createdAt: '2026-09-04T08:00:00.000Z',
  };

  const dates = [
    '2026-09-04', '2026-09-05', '2026-09-06', '2026-09-07', '2026-09-08',
    '2026-09-09', '2026-09-10', '2026-09-11', '2026-09-12', '2026-09-13',
    '2026-09-14', '2026-09-15', '2026-09-16', '2026-09-17', '2026-09-18',
    '2026-09-19', '2026-09-20'
  ];

  const payments: PaymentRecord[] = dates.map((date, idx) => ({
    id: `pay-giri-${idx + 1}`,
    customerId: customer.id,
    customerName: customer.name,
    scheduleDate: date,
    dayNumber: idx + 1,
    paymentDate: date,
    amount: 1000,
    paymentMethod: 'CASH' as const,
    receiptNumber: `REC-${1001 + idx}`,
    notes: `Day ${idx + 1} Collection (Rs.1000)`,
    createdAt: new Date(date + 'T10:00:00.000Z').toISOString(),
  }));

  return { customers: [customer], payments };
}
