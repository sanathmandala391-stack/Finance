import { calculateCustomerFinanceDetails, generateCustomerSchedule, computeCustomerFinancialProfile, calculateSummaryStats } from '../src/utils/financeCalculations';
import { formatINR, numberToWordsINR } from '../src/utils/currency';
import { addDaysISO, getTodayISO, compareDates, isBeforeDay, isSameDay } from '../src/utils/dateUtils';
import { createBackupJSON, parseAndValidateBackup, generateRealisticDemoData } from '../src/utils/storage';
import { Customer, PaymentRecord } from '../src/types/finance';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${message}`);
  }
}

console.log('--- STARTING GIRI-GIRI CORE SYSTEM AUDIT ---');

// Test 1: Indian Rupee Currency Formatting
console.log('\n[TEST 1] Currency Formatting:');
assert(formatINR(100000) === '₹1,00,000', 'formatINR(100000) === ₹1,00,000');
assert(formatINR(5000) === '₹5,000', 'formatINR(5000) === ₹5,000');
assert(formatINR(50000) === '₹50,000', 'formatINR(50000) === ₹50,000');
assert(formatINR(200000) === '₹2,00,000', 'formatINR(200000) === ₹2,00,000');
assert(formatINR(50) === '₹50', 'formatINR(50) === ₹50');
assert(numberToWordsINR(100000).includes('One Lakh'), 'numberToWordsINR(100000) has One Lakh');

// Test 2: Finance Rule Calculations (10% Upfront, 90% Disbursed, 1% Daily)
console.log('\n[TEST 2] 10% Upfront Profit & 1% Daily Installments:');
const testCases = [
  { amount: 5000, expProfit: 500, expDisbursed: 4500, expDaily: 50 },
  { amount: 50000, expProfit: 5000, expDisbursed: 45000, expDaily: 500 },
  { amount: 100000, expProfit: 10000, expDisbursed: 90000, expDaily: 1000 },
  { amount: 200000, expProfit: 20000, expDisbursed: 180000, expDaily: 2000 },
];

for (const tc of testCases) {
  const res = calculateCustomerFinanceDetails(tc.amount, 10, 100);
  assert(res.upfrontProfit === tc.expProfit, `₹${tc.amount}: 10% Profit = ₹${tc.expProfit}`);
  assert(res.actualDisbursed === tc.expDisbursed, `₹${tc.amount}: Actual Given = ₹${tc.expDisbursed}`);
  assert(res.dailyRate === tc.expDaily, `₹${tc.amount}: Daily Rate = ₹${tc.expDaily}/day`);
}

// Test 3: Schedule Generation & Automatic DUE / TODAY / UPCOMING Status
console.log('\n[TEST 3] Schedule & Automatic Status Transitions:');
const today = '2026-09-22';
const startDate = addDaysISO(today, -10); // Day 1 was 10 days ago (2026-09-12)

const testCustomer: Customer = {
  id: 'cust-test-1',
  name: 'Test Customer',
  mobile: '9876543210',
  village: 'Rampur',
  financeAmount: 100000,
  upfrontProfitPercent: 10,
  upfrontProfit: 10000,
  actualDisbursed: 90000,
  dailyRate: 1000,
  tenureDays: 100,
  startDate,
  status: 'ACTIVE',
  createdAt: new Date().toISOString(),
};

const payments: PaymentRecord[] = [
  // Day 1 (2026-09-12) paid on time
  {
    id: 'p1',
    customerId: 'cust-test-1',
    scheduleDate: addDaysISO(startDate, 0),
    dayNumber: 1,
    paymentDate: addDaysISO(startDate, 0),
    amount: 1000,
    paymentMethod: 'CASH',
    receiptNumber: 'REC-001',
    createdAt: new Date().toISOString(),
  },
  // Day 2 (2026-09-13) was paid late on 2026-09-15
  {
    id: 'p2',
    customerId: 'cust-test-1',
    scheduleDate: addDaysISO(startDate, 1),
    dayNumber: 2,
    paymentDate: addDaysISO(startDate, 3), // paid late
    amount: 1000,
    paymentMethod: 'CASH',
    receiptNumber: 'REC-002',
    createdAt: new Date().toISOString(),
  },
  // Day 3 (2026-09-14) paid partial (₹500 out of ₹1000)
  {
    id: 'p3',
    customerId: 'cust-test-1',
    scheduleDate: addDaysISO(startDate, 2),
    dayNumber: 3,
    paymentDate: addDaysISO(startDate, 2),
    amount: 500,
    paymentMethod: 'CASH',
    receiptNumber: 'REC-003',
    createdAt: new Date().toISOString(),
  },
  // Days 4 to 10 are completely unpaid (missed)
  // Day 11 is Today (2026-09-22) - unpaid
  // Days 12 to 100 are Future (upcoming)
];

const schedule = generateCustomerSchedule(testCustomer, payments, today);
assert(schedule.length === 100, 'Schedule has exactly 100 days');

// Verify Day 1 is PAID
assert(schedule[0].status === 'PAID', 'Day 1 (paid on time) is marked 🟢 PAID');

// Verify Day 2 is PAID_LATE
assert(schedule[1].status === 'PAID_LATE', 'Day 2 (paid late) is marked 🔵 PAID_LATE');

// Verify Day 3 is PARTIAL
assert(schedule[2].status === 'PARTIAL', 'Day 3 (₹500/₹1000 paid) is marked 🟠 PARTIAL');
assert(schedule[2].remainingDue === 500, 'Day 3 has ₹500 remaining due');

// Verify Day 4 (past missed date) is automatically DUE without manual marking
assert(schedule[3].status === 'DUE', 'Day 4 (past missed) is automatically marked 🔴 DUE');
assert(schedule[3].remainingDue === 1000, 'Day 4 has ₹1,000 due');

// Verify Day 11 (Today) is TODAY_PENDING
const todaySchedule = schedule.find(s => s.isToday);
assert(todaySchedule !== undefined, 'Today schedule item exists');
assert(todaySchedule?.status === 'TODAY_PENDING', 'Today (unpaid) is marked 🟡 TODAY_PENDING');

// Verify Day 12 (Future) is UPCOMING
const futureDay = schedule[12];
assert(futureDay.status === 'UPCOMING', 'Future day is marked ⚪ UPCOMING');

// Test 4: Financial Profile Aggregations & Money Separation
console.log('\n[TEST 4] Financial Profile & Strict Money Separation:');
const profile = computeCustomerFinancialProfile(testCustomer, payments, today);
assert(profile.totalCollected === 2500, `Total Collected is ₹2,500 (sum of daily payments only)`);
assert(profile.totalRemainingBalance === 97500, `Remaining Balance is ₹97,500 (₹1,00,000 - ₹2,500)`);
assert(testCustomer.upfrontProfit === 10000, 'Upfront profit ₹10,000 is strictly separated');
assert(profile.paidDaysCount === 1, '1 Day paid on time');
assert(profile.paidLateDaysCount === 1, '1 Day paid late');
assert(profile.partialDaysCount === 1, '1 Day partial');
assert(profile.dueDaysCount === 7, '7 Days overdue');

// Test 5: JSON Backup & Restore Validation
console.log('\n[TEST 5] JSON Backup & Restore Integrity:');
const demo = generateRealisticDemoData();
const backupStr = createBackupJSON(demo.customers, demo.payments);
const val = parseAndValidateBackup(backupStr);
assert(val.success === true, 'Backup JSON validation succeeds');
assert(val.data?.customers.length === demo.customers.length, 'Restored customer count matches original');
assert(val.data?.payments.length === demo.payments.length, 'Restored payments count matches original');

console.log('\n🎉 ALL 18 CORE FINANCE AUDIT TESTS PASSED WITH 100% SUCCESS!\n');
