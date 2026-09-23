export type CustomerStatus = 'ACTIVE' | 'COMPLETED' | 'CLOSED';

export type ScheduleStatus = 
  | 'PAID'          // 🟢 Paid on time (paymentDate <= scheduleDate)
  | 'DUE'           // 🔴 Past date with 0 paid
  | 'TODAY_PENDING' // 🟡 Today, not yet collected
  | 'PARTIAL'       // 🟠 Partial payment received (< target)
  | 'PAID_LATE'     // 🔵 Past due date paid on a later date
  | 'UPCOMING';     // ⚪ Future date

export type PaymentMethod = 'CASH' | 'UPI' | 'BANK' | 'OTHER';

export interface PaymentRecord {
  id: string;
  customerId: string;
  customerName?: string;
  scheduleDate: string; // YYYY-MM-DD that this payment was for
  dayNumber: number;    // 1-100
  paymentDate: string;  // YYYY-MM-DD when money was actually received
  amount: number;       // Amount paid (e.g., 1000 or 500)
  paymentMethod: PaymentMethod;
  receiptNumber: string;
  notes?: string;
  createdAt: string;    // ISO timestamp
}

export interface Customer {
  id: string;
  name: string;
  mobile: string;
  village: string;
  financeAmount: number;        // Principal e.g. ₹1,00,000
  upfrontProfitPercent: number; // default 10%
  upfrontProfit: number;        // ₹10,000 (Cut immediately)
  actualDisbursed: number;      // ₹90,000 (Actually given in cash)
  dailyRate: number;            // ₹1,000 (1% of financeAmount)
  tenureDays: number;           // Default 100 days
  startDate: string;            // YYYY-MM-DD
  notes?: string;
  status: CustomerStatus;
  createdAt: string;            // ISO timestamp
  updatedAt?: string;
}

export interface DayScheduleItem {
  dayNumber: number;          // 1 .. 100
  date: string;               // YYYY-MM-DD
  targetAmount: number;       // e.g. 1000
  paidAmount: number;         // sum of payments allocated to this day
  remainingDue: number;       // targetAmount - paidAmount
  status: ScheduleStatus;
  isToday: boolean;
  isPast: boolean;
  isFuture: boolean;
  payments: PaymentRecord[];
  lastPaidDate?: string;
}

export interface CustomerFinancialProfile {
  customer: Customer;
  schedule: DayScheduleItem[];
  totalExpectedTillToday: number;
  totalCollected: number;
  totalDueTillToday: number;
  totalRemainingBalance: number;
  paidDaysCount: number;
  dueDaysCount: number;
  partialDaysCount: number;
  paidLateDaysCount: number;
  upcomingDaysCount: number;
  progressPercent: number;
  isFullyPaid: boolean;
  todayStatus: DayScheduleItem | null;
}

export interface FinanceSummaryStats {
  totalCustomers: number;
  activeCustomers: number;
  completedCustomers: number;
  totalFinanceAmount: number;       // Sum of all Principal Amounts (e.g., ₹5,00,000)
  totalUpfrontProfit: number;       // Sum of 10% upfront cuts (e.g., ₹50,000)
  totalActualDisbursed: number;     // Sum of 90% actual cash given (e.g., ₹4,50,000)
  todayExpectedCollection: number;  // Today's total target across active customers
  todayCollected: number;           // Total money collected today
  todayPending: number;             // Remaining to collect today
  totalCustomerCollections: number; // Total daily collections collected across all time
  totalOutstandingDue: number;      // Total past overdue + today's pending
  totalRepaymentBalance: number;    // Total remaining principal across all active loans
  collectionEfficiency: number;     // Percentage collected vs expected till today
}

export interface VillageSummary {
  village: string;
  customerCount: number;
  totalFinance: number;
  todayTarget: number;
  todayCollected: number;
  totalDue: number;
}

export interface BackupData {
  version: string;
  exportDate: string;
  app: string;
  customers: Customer[];
  payments: PaymentRecord[];
}

export type CloudSyncStatus = 'IDLE' | 'SYNCING' | 'SYNCED' | 'OFFLINE' | 'ERROR';

export interface OwnerProfile {
  id: string;              // Unique Owner Account ID (e.g. "OWN-749210")
  businessName: string;    // e.g. "Sri Lakshmi Daily Finance"
  ownerName: string;       // e.g. "B. Gopi"
  mobile: string;          // e.g. "9876543210"
  pin: string;             // 4 or 6-digit quick access PIN
  email?: string;
  createdAt: string;
  lastLoginAt: string;
  activeDeviceId?: string;
}

export interface SyncMetadata {
  lastSyncedAt: string | null;
  syncStatus: CloudSyncStatus;
  pendingChangesCount: number;
  syncError?: string | null;
  serverVersion?: number;
}

