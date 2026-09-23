import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
import { cloudSync } from '../services/cloudSyncService';
import { useAuth } from '../context/AuthContext';

export function useFinanceData() {
  const { owner } = useAuth();
  const isInitialSyncDone = useRef(false);

  // Start with local storage
  const [customers, setCustomers] = useState<Customer[]>(() => {
    return loadCustomersFromStorage();
  });

  const [payments, setPayments] = useState<PaymentRecord[]>(() => {
    return loadPaymentsFromStorage();
  });

  const [todayDate, setTodayDate] = useState<string>(getTodayISO());

  // Save to localStorage whenever local state changes
  useEffect(() => {
    saveCustomersToStorage(customers);
  }, [customers]);

  useEffect(() => {
    savePaymentsToStorage(payments);
  }, [payments]);

  // Initial pull & merge from Cloud on login/mount
  useEffect(() => {
    if (owner && !isInitialSyncDone.current) {
      cloudSync.pullFromCloud(owner).then((res) => {
        if (res.success && res.data) {
          if (res.data.customers.length > 0 || res.data.payments.length > 0) {
            // Merge cloud data with local
            setCustomers((localCusts) => {
              const map = new Map<string, Customer>();
              // Put local first, then cloud overrides
              localCusts.forEach((c) => map.set(c.id, c));
              res.data!.customers.forEach((c) => map.set(c.id, c));
              return Array.from(map.values());
            });

            setPayments((localPays) => {
              const map = new Map<string, PaymentRecord>();
              localPays.forEach((p) => map.set(p.id, p));
              res.data!.payments.forEach((p) => map.set(p.id, p));
              return Array.from(map.values());
            });
          } else {
            // First time owner has cloud record - push local data to initialize cloud
            cloudSync.pushToCloud(owner, customers, payments);
          }
        }
        isInitialSyncDone.current = true;
      });
    }
  }, [owner]);

  // Auto-sync whenever owner is active and data changes
  const syncToCloud = useCallback(
    (newCusts: Customer[], newPays: PaymentRecord[]) => {
      if (owner) {
        cloudSync.pushToCloud(owner, newCusts, newPays);
      }
    },
    [owner]
  );

  // Background sync listener (for when changes happen on another device / tab)
  useEffect(() => {
    if (!owner) return;

    const handleBackgroundRefresh = async () => {
      const res = await cloudSync.pullFromCloud(owner);
      if (res.success && res.data) {
        setCustomers((prev) => {
          if (JSON.stringify(prev) !== JSON.stringify(res.data!.customers)) {
            return res.data!.customers;
          }
          return prev;
        });
        setPayments((prev) => {
          if (JSON.stringify(prev) !== JSON.stringify(res.data!.payments)) {
            return res.data!.payments;
          }
          return prev;
        });
      }
    };

    cloudSync.startPeriodicSync(handleBackgroundRefresh, 15000);
    return () => cloudSync.stopPeriodicSync();
  }, [owner]);

  // Manual Trigger Sync
  const syncNow = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!owner) {
      return { success: false, error: 'Owner not logged in.' };
    }
    const pullRes = await cloudSync.pullFromCloud(owner);
    if (pullRes.success && pullRes.data) {
      if (pullRes.data.customers.length > 0 || pullRes.data.payments.length > 0) {
        setCustomers(pullRes.data.customers);
        setPayments(pullRes.data.payments);
      }
    }
    const pushRes = await cloudSync.pushToCloud(owner, customers, payments);
    return pushRes;
  }, [owner, customers, payments]);

  // Global summary statistics computed reactively
  const stats: FinanceSummaryStats = useMemo(() => {
    return calculateSummaryStats(customers, payments, todayDate);
  }, [customers, payments, todayDate]);

  /**
   * Add a new customer with auto-calculated 10% upfront profit, 90% disbursed, and 1% daily rate
   */
  const addCustomer = useCallback(
    (input: {
      name: string;
      mobile: string;
      village: string;
      financeAmount: number;
      startDate: string;
      tenureDays?: number;
      notes?: string;
    }): Customer => {
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

      setCustomers((prev) => {
        const next = [newCustomer, ...prev];
        syncToCloud(next, payments);
        return next;
      });

      return newCustomer;
    },
    [payments, syncToCloud]
  );

  /**
   * Update an existing customer
   */
  const updateCustomer = useCallback(
    (id: string, updates: Partial<Customer>) => {
      setCustomers((prev) => {
        const next = prev.map((c) => {
          if (c.id !== id) return c;
          const newFinanceAmount =
            updates.financeAmount !== undefined ? updates.financeAmount : c.financeAmount;
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
        });

        syncToCloud(next, payments);
        return next;
      });
    },
    [payments, syncToCloud]
  );

  /**
   * Delete customer and their associated payments
   */
  const deleteCustomer = useCallback(
    (id: string) => {
      setCustomers((prev) => {
        const next = prev.filter((c) => c.id !== id);
        setPayments((prevPays) => {
          const nextPays = prevPays.filter((p) => p.customerId !== id);
          syncToCloud(next, nextPays);
          return nextPays;
        });
        return next;
      });
    },
    [syncToCloud]
  );

  /**
   * Record a payment with duplicate protection and receipt generation
   */
  const recordPayment = useCallback(
    (params: {
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

      const customer = customers.find((c) => c.id === customerId);
      if (!customer) {
        return { success: false, error: 'Customer not found.' };
      }

      if (!amount || amount <= 0) {
        return { success: false, error: 'Payment amount must be greater than 0.' };
      }

      // Duplicate protection: Check if day already has full payments recorded
      const existingPayments = payments.filter(
        (p) => p.customerId === customerId && p.scheduleDate === scheduleDate
      );
      const existingPaidSum = existingPayments.reduce((sum, p) => sum + p.amount, 0);

      if (existingPaidSum >= customer.dailyRate && !allowDuplicateOverride) {
        return {
          success: false,
          error: `Schedule date ${scheduleDate} (Day ${dayNumber}) is already fully paid (₹${existingPaidSum}).`,
        };
      }

      const receiptNumber = `REC-${Date.now().toString().slice(-6)}-${Math.floor(
        Math.random() * 900 + 100
      )}`;
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

      setPayments((prev) => {
        const next = [newPayment, ...prev];
        syncToCloud(customers, next);
        return next;
      });

      return { success: true, payment: newPayment };
    },
    [customers, payments, todayDate, syncToCloud]
  );

  /**
   * Delete/revert a recorded payment
   */
  const deletePayment = useCallback(
    (paymentId: string) => {
      setPayments((prev) => {
        const next = prev.filter((p) => p.id !== paymentId);
        syncToCloud(customers, next);
        return next;
      });
    },
    [customers, syncToCloud]
  );

  /**
   * Load Demo Data on-demand (when requested in Settings)
   */
  const loadDemo = useCallback(() => {
    const demo = generateRealisticDemoData();
    setCustomers(demo.customers);
    setPayments(demo.payments);
    saveCustomersToStorage(demo.customers);
    savePaymentsToStorage(demo.payments);
    syncToCloud(demo.customers, demo.payments);
  }, [syncToCloud]);

  /**
   * Clear all records
   */
  const clearAll = useCallback(() => {
    setCustomers([]);
    setPayments([]);
    localStorage.removeItem('giri_giri_customers_v1');
    localStorage.removeItem('giri_giri_payments_v1');
    if (owner) {
      cloudSync.pushToCloud(owner, [], []);
    }
  }, [owner]);

  /**
   * Restore from Backup Data
   */
  const restoreFromBackup = useCallback(
    (backup: BackupData): boolean => {
      if (!backup || !Array.isArray(backup.customers) || !Array.isArray(backup.payments)) {
        return false;
      }
      setCustomers(backup.customers);
      setPayments(backup.payments);
      saveCustomersToStorage(backup.customers);
      savePaymentsToStorage(backup.payments);
      syncToCloud(backup.customers, backup.payments);
      return true;
    },
    [syncToCloud]
  );

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
    syncNow,
  };
}

