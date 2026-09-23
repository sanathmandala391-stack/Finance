import { useState, useEffect, useMemo, useCallback } from 'react';
import { Customer, PaymentRecord, PaymentMethod, BackupData, FinanceSummaryStats } from '../types/finance';
import { getTodayISO } from '../utils/dateUtils';
import { calculateCustomerFinanceDetails, calculateSummaryStats } from '../utils/financeCalculations';
import {
  loadCustomersFromStorage,
  loadPaymentsFromStorage,
  saveCustomersToStorage,
  savePaymentsToStorage,
  generateRealisticDemoData,
} from '../utils/storage';

export function useFinanceData() {
  // Start with clean empty state so there is zero fake/mock data unless user explicitly loads it
  const [customers, setCustomers] = useState<Customer[]>(() => {
    return loadCustomersFromStorage();
  });

  const [payments, setPayments] = useState<PaymentRecord[]>(() => {
    return loadPaymentsFromStorage();
  });

  const [todayDate, setTodayDate] = useState<string>(getTodayISO());

  // Keep localStorage synchronized whenever state changes
  useEffect(() => {
    saveCustomersToStorage(customers);
  }, [customers]);

  useEffect(() => {
    savePaymentsToStorage(payments);
  }, [payments]);

  // Global summary statistics computed reactively
  const stats: FinanceSummaryStats = useMemo(() => {
    return calculateSummaryStats(customers, payments, todayDate);
  }, [customers, payments, todayDate]);

  /**
   * Add a new customer with auto-calculated 10% upfront profit, 90% disbursed, and 1% daily rate
   */
  const addCustomer = useCallback((
    input: {
      name: string;
      mobile: string;
      village: string;
      financeAmount: number;
      startDate: string;
      tenureDays?: number;
      notes?: string;
    }
  ): Customer => {
    const tenureDays = input.tenureDays || 100;
    const { upfrontProfit, actualDisbursed, dailyRate } = calculateCustomerFinanceDetails(
      input.financeAmount,
      10, // 10% upfront profit
      tenureDays
    );

    const newCustomer: Customer = {
      id: `cust-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: input.name.trim(),
      mobile: input.mobile.trim(),
      village: input.village.trim(),
      financeAmount: input.financeAmount,
      upfrontProfitPercent: 10,
      upfrontProfit,
      actualDisbursed,
      dailyRate,
      tenureDays,
      startDate: input.startDate,
      notes: input.notes?.trim(),
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    };

    setCustomers(prev => [newCustomer, ...prev]);
    return newCustomer;
  }, []);

  /**
   * Update an existing customer
   */
  const updateCustomer = useCallback((id: string, updates: Partial<Customer>) => {
    setCustomers(prev =>
      prev.map(c => {
        if (c.id !== id) return c;
        const newFinanceAmount = updates.financeAmount !== undefined ? updates.financeAmount : c.financeAmount;
        const newTenure = updates.tenureDays !== undefined ? updates.tenureDays : c.tenureDays;
        const calc = calculateCustomerFinanceDetails(newFinanceAmount, 10, newTenure);

        return {
          ...c,
          ...updates,
          upfrontProfit: calc.upfrontProfit,
          actualDisbursed: calc.actualDisbursed,
          dailyRate: calc.dailyRate,
          updatedAt: new Date().toISOString(),
        };
      })
    );
  }, []);

  /**
   * Delete customer and their associated payments
   */
  const deleteCustomer = useCallback((id: string) => {
    setCustomers(prev => prev.filter(c => c.id !== id));
    setPayments(prev => prev.filter(p => p.customerId !== id));
  }, []);

  /**
   * Record a payment with duplicate protection and receipt generation
   */
  const recordPayment = useCallback((params: {
    customerId: string;
    scheduleDate: string;
    dayNumber: number;
    paymentDate?: string;
    amount: number;
    paymentMethod?: PaymentMethod;
    notes?: string;
    allowDuplicateOverride?: boolean;
  }): { success: boolean; payment?: PaymentRecord; error?: string } => {
    const {
      customerId,
      scheduleDate,
      dayNumber,
      paymentDate = todayDate,
      amount,
      paymentMethod = 'CASH',
      notes,
      allowDuplicateOverride = false,
    } = params;

    const customer = customers.find(c => c.id === customerId);
    if (!customer) {
      return { success: false, error: 'Customer not found.' };
    }

    if (!amount || amount <= 0) {
      return { success: false, error: 'Payment amount must be greater than 0.' };
    }

    // Duplicate protection: Check if day already has full payments recorded
    const existingPayments = payments.filter(
      p => p.customerId === customerId && p.scheduleDate === scheduleDate
    );
    const existingPaidSum = existingPayments.reduce((sum, p) => sum + p.amount, 0);

    if (existingPaidSum >= customer.dailyRate && !allowDuplicateOverride) {
      return {
        success: false,
        error: `Schedule date ${scheduleDate} (Day ${dayNumber}) is already fully paid (₹${existingPaidSum}).`,
      };
    }

    const receiptNumber = `REC-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;
    const newPayment: PaymentRecord = {
      id: `pay-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      customerId,
      customerName: customer.name,
      scheduleDate,
      dayNumber,
      paymentDate,
      amount: Math.round(amount),
      paymentMethod,
      receiptNumber,
      notes: notes?.trim(),
      createdAt: new Date().toISOString(),
    };

    setPayments(prev => [newPayment, ...prev]);
    return { success: true, payment: newPayment };
  }, [customers, payments, todayDate]);

  /**
   * Delete/revert a recorded payment
   */
  const deletePayment = useCallback((paymentId: string) => {
    setPayments(prev => prev.filter(p => p.id !== paymentId));
  }, []);

  /**
   * Load Demo Data on-demand (when requested in Settings)
   */
  const loadDemo = useCallback(() => {
    const demo = generateRealisticDemoData();
    setCustomers(demo.customers);
    setPayments(demo.payments);
    saveCustomersToStorage(demo.customers);
    savePaymentsToStorage(demo.payments);
  }, []);

  /**
   * Clear all records
   */
  const clearAll = useCallback(() => {
    setCustomers([]);
    setPayments([]);
    localStorage.removeItem('giri_giri_customers_v1');
    localStorage.removeItem('giri_giri_payments_v1');
  }, []);

  /**
   * Restore from Backup Data
   */
  const restoreFromBackup = useCallback((backup: BackupData): boolean => {
    if (!backup || !Array.isArray(backup.customers) || !Array.isArray(backup.payments)) {
      return false;
    }
    setCustomers(backup.customers);
    setPayments(backup.payments);
    saveCustomersToStorage(backup.customers);
    savePaymentsToStorage(backup.payments);
    return true;
  }, []);

  return {
    customers,
    payments,
    todayDate,
    stats,
    setTodayDate,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    recordPayment,
    deletePayment,
    loadDemo,
    clearAll,
    restoreFromBackup,
  };
}
