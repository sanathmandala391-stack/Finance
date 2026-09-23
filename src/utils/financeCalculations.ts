import { Customer, DayScheduleItem, PaymentRecord, CustomerFinancialProfile, FinanceSummaryStats, ScheduleStatus } from '../types/finance';
import { addDaysISO, compareDates, getTodayISO, isBeforeDay, isSameDay } from './dateUtils';

/**
 * Standard Giri-Giri calculations for loan creation
 * Finance Amount = F (e.g. ₹1,00,000)
 * Upfront Profit = 10% of F (e.g. ₹10,000)
 * Actual Cash Given = 90% of F (e.g. ₹90,000)
 * Daily Collection = 1% of F (e.g. ₹1,000/day for 100 days)
 */
export function calculateCustomerFinanceDetails(
  financeAmount: number,
  upfrontProfitPercent: number = 10,
  tenureDays: number = 100
) {
  const safeAmount = Math.max(0, financeAmount || 0);
  const upfrontProfit = Math.round(safeAmount * (upfrontProfitPercent / 100));
  const actualDisbursed = safeAmount - upfrontProfit;
  const dailyRate = tenureDays > 0 ? Math.round(safeAmount / tenureDays) : 0;

  return {
    upfrontProfit,
    actualDisbursed,
    dailyRate,
  };
}

/**
 * Generate complete 100-day schedule for a customer with computed statuses
 */
export function generateCustomerSchedule(
  customer: Customer,
  allPayments: PaymentRecord[],
  todayDate: string = getTodayISO()
): DayScheduleItem[] {
  const customerPayments = allPayments.filter(p => p.customerId === customer.id);
  const schedule: DayScheduleItem[] = [];
  const tenure = customer.tenureDays || 100;

  for (let i = 1; i <= tenure; i++) {
    const dayDate = addDaysISO(customer.startDate, i - 1);
    const dayPayments = customerPayments.filter(
      p => p.scheduleDate === dayDate || (!p.scheduleDate && p.dayNumber === i)
    );

    const paidAmount = dayPayments.reduce((sum, p) => sum + p.amount, 0);
    const targetAmount = customer.dailyRate;
    const remainingDue = Math.max(0, targetAmount - paidAmount);

    const isToday = isSameDay(dayDate, todayDate);
    const isPast = isBeforeDay(dayDate, todayDate);
    const isFuture = compareDates(dayDate, todayDate) > 0;

    let status: ScheduleStatus;

    if (isFuture) {
      if (paidAmount >= targetAmount) {
        status = 'PAID';
      } else if (paidAmount > 0) {
        status = 'PARTIAL';
      } else {
        status = 'UPCOMING';
      }
    } else if (isToday) {
      if (paidAmount >= targetAmount) {
        status = 'PAID';
      } else if (paidAmount > 0) {
        status = 'PARTIAL';
      } else {
        status = 'TODAY_PENDING';
      }
    } else {
      // Past date (isPast is true)
      if (paidAmount >= targetAmount) {
        // Check if any payment was recorded AFTER the schedule date
        const wasPaidLate = dayPayments.some(p => isBeforeDay(dayDate, p.paymentDate));
        status = wasPaidLate ? 'PAID_LATE' : 'PAID';
      } else if (paidAmount > 0) {
        status = 'PARTIAL';
      } else {
        // 0 paid on a past date -> Automatically DUE
        status = 'DUE';
      }
    }

    const lastPayment = dayPayments.length > 0 
      ? dayPayments[dayPayments.length - 1].paymentDate 
      : undefined;

    schedule.push({
      dayNumber: i,
      date: dayDate,
      targetAmount,
      paidAmount,
      remainingDue,
      status,
      isToday,
      isPast,
      isFuture,
      payments: dayPayments,
      lastPaidDate: lastPayment,
    });
  }

  return schedule;
}

/**
 * Compute comprehensive financial profile and stats for a customer
 */
export function computeCustomerFinancialProfile(
  customer: Customer,
  allPayments: PaymentRecord[],
  todayDate: string = getTodayISO()
): CustomerFinancialProfile {
  const schedule = generateCustomerSchedule(customer, allPayments, todayDate);
  const customerPayments = allPayments.filter(p => p.customerId === customer.id);
  const totalCollected = customerPayments.reduce((sum, p) => sum + p.amount, 0);

  let totalExpectedTillToday = 0;
  let totalDueTillToday = 0;
  let paidDaysCount = 0;
  let dueDaysCount = 0;
  let partialDaysCount = 0;
  let paidLateDaysCount = 0;
  let upcomingDaysCount = 0;

  for (const day of schedule) {
    if (day.isPast || day.isToday) {
      totalExpectedTillToday += day.targetAmount;
      totalDueTillToday += day.remainingDue;
    }

    switch (day.status) {
      case 'PAID':
        paidDaysCount++;
        break;
      case 'PAID_LATE':
        paidLateDaysCount++;
        break;
      case 'DUE':
        dueDaysCount++;
        break;
      case 'PARTIAL':
        partialDaysCount++;
        break;
      case 'UPCOMING':
        upcomingDaysCount++;
        break;
      case 'TODAY_PENDING':
        // Counted as pending for today
        break;
    }
  }

  const totalRemainingBalance = Math.max(0, customer.financeAmount - totalCollected);
  const progressPercent = customer.financeAmount > 0 
    ? Math.min(100, Math.round((totalCollected / customer.financeAmount) * 100))
    : 0;

  const isFullyPaid = totalCollected >= customer.financeAmount;
  const todayStatus = schedule.find(s => s.isToday) || null;

  return {
    customer,
    schedule,
    totalExpectedTillToday,
    totalCollected,
    totalDueTillToday,
    totalRemainingBalance,
    paidDaysCount,
    dueDaysCount,
    partialDaysCount,
    paidLateDaysCount,
    upcomingDaysCount,
    progressPercent,
    isFullyPaid,
    todayStatus,
  };
}

/**
 * Compute global business dashboard financial summary
 */
export function calculateSummaryStats(
  customers: Customer[],
  payments: PaymentRecord[],
  todayDate: string = getTodayISO()
): FinanceSummaryStats {
  let totalFinanceAmount = 0;
  let totalUpfrontProfit = 0;
  let totalActualDisbursed = 0;
  let todayExpectedCollection = 0;
  let todayCollected = 0;
  let todayPending = 0;
  let totalOutstandingDue = 0;
  let totalRepaymentBalance = 0;
  let totalExpectedAllTillToday = 0;

  let activeCount = 0;
  let completedCount = 0;

  // Payments made today
  const todayPayments = payments.filter(p => p.paymentDate === todayDate);
  todayCollected = todayPayments.reduce((sum, p) => sum + p.amount, 0);

  // Total collections of all time
  const totalCustomerCollections = payments.reduce((sum, p) => sum + p.amount, 0);

  for (const customer of customers) {
    totalFinanceAmount += customer.financeAmount;
    totalUpfrontProfit += customer.upfrontProfit;
    totalActualDisbursed += customer.actualDisbursed;

    const profile = computeCustomerFinancialProfile(customer, payments, todayDate);

    if (profile.isFullyPaid || customer.status === 'COMPLETED') {
      completedCount++;
    } else {
      activeCount++;
      totalRepaymentBalance += profile.totalRemainingBalance;
    }

    totalOutstandingDue += profile.totalDueTillToday;
    totalExpectedAllTillToday += profile.totalExpectedTillToday;

    // Today's target and pending
    if (profile.todayStatus) {
      todayExpectedCollection += profile.todayStatus.targetAmount;
      todayPending += profile.todayStatus.remainingDue;
    }
  }

  const collectionEfficiency = totalExpectedAllTillToday > 0
    ? Math.min(100, Math.round((totalCustomerCollections / totalExpectedAllTillToday) * 100))
    : 100;

  return {
    totalCustomers: customers.length,
    activeCustomers: activeCount,
    completedCustomers: completedCount,
    totalFinanceAmount,
    totalUpfrontProfit,
    totalActualDisbursed,
    todayExpectedCollection,
    todayCollected,
    todayPending,
    totalCustomerCollections,
    totalOutstandingDue,
    totalRepaymentBalance,
    collectionEfficiency,
  };
}
