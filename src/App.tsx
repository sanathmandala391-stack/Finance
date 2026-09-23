import React, { useState } from 'react';
import { useFinanceData } from './hooks/useFinanceData';
import { Customer } from './types/finance';
import { Navbar } from './components/common/Navbar';
import { BottomNav } from './components/common/BottomNav';
import { DashboardView } from './components/dashboard/DashboardView';
import { TodayCollectionView } from './components/today/TodayCollectionView';
import { CustomerListView } from './components/customers/CustomerListView';
import { CustomerDetailView } from './components/customers/CustomerDetailView';
import { CustomerFormModal } from './components/customers/CustomerFormModal';
import { QuickPaymentModal } from './components/today/QuickPaymentModal';
import { TransactionHistoryView } from './components/history/TransactionHistoryView';
import { ReportsView } from './components/reports/ReportsView';
import { BackupRestoreView } from './components/settings/BackupRestoreView';
import { computeCustomerFinancialProfile } from './utils/financeCalculations';

export const App: React.FC = () => {
  const {
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
  } = useFinanceData();

  // Navigation State
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Modal States
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [quickPayCustomer, setQuickPayCustomer] = useState<Customer | null>(null);

  // Calculate pending count for today badge on mobile bottom nav
  const todayPendingCount = customers.reduce((count, c) => {
    const profile = computeCustomerFinancialProfile(c, payments, todayDate);
    return profile.todayStatus && profile.todayStatus.remainingDue > 0 ? count + 1 : count;
  }, 0);

  const handleOpenAddCustomer = () => {
    setEditingCustomer(null);
    setIsAddCustomerOpen(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsAddCustomerOpen(true);
  };

  const handleCustomerFormSubmit = (data: any) => {
    if (editingCustomer) {
      updateCustomer(editingCustomer.id, data);
      // Refresh selected customer state if open
      if (selectedCustomer?.id === editingCustomer.id) {
        setSelectedCustomer({ ...selectedCustomer, ...data });
      }
    } else {
      const created = addCustomer(data);
      // Automatically open the new customer's passbook
      setSelectedCustomer(created);
    }
  };

  const handleSelectCustomer = (customer: Customer) => {
    // Refresh latest reference
    const latest = customers.find((c) => c.id === customer.id) || customer;
    setSelectedCustomer(latest);
  };

  const handleBackToCustomers = () => {
    setSelectedCustomer(null);
  };

  const handleQuickPayToday = (customer: Customer) => {
    setQuickPayCustomer(customer);
  };

  const handleNavigateToTab = (tab: string) => {
    setActiveTab(tab);
    setSelectedCustomer(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-brand-500 selection:text-white">
      {/* Top Brand Navbar */}
      <Navbar
        todayDate={todayDate}
        onDateChange={setTodayDate}
        onOpenAddCustomer={handleOpenAddCustomer}
        onNavigateToTab={handleNavigateToTab}
        activeTab={activeTab}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5">
        {/* If a customer detail passbook is selected */}
        {selectedCustomer ? (
          <CustomerDetailView
            customer={customers.find((c) => c.id === selectedCustomer.id) || selectedCustomer}
            payments={payments}
            onBack={handleBackToCustomers}
            onEditCustomer={handleEditCustomer}
            onDeleteCustomer={deleteCustomer}
            onRecordPayment={recordPayment}
            todayDate={todayDate}
          />
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <DashboardView
                stats={stats}
                customers={customers}
                payments={payments}
                onNavigateToTab={handleNavigateToTab}
                onSelectCustomer={handleSelectCustomer}
                onOpenAddCustomer={handleOpenAddCustomer}
                todayDate={todayDate}
              />
            )}

            {activeTab === 'today' && (
              <TodayCollectionView
                customers={customers}
                payments={payments}
                onRecordPayment={recordPayment}
                onSelectCustomer={handleSelectCustomer}
                todayDate={todayDate}
              />
            )}

            {activeTab === 'customers' && (
              <CustomerListView
                customers={customers}
                payments={payments}
                onSelectCustomer={handleSelectCustomer}
                onOpenAddCustomer={handleOpenAddCustomer}
                onQuickPayToday={handleQuickPayToday}
                todayDate={todayDate}
              />
            )}

            {activeTab === 'history' && (
              <TransactionHistoryView
                payments={payments}
                customers={customers}
                onDeletePayment={deletePayment}
              />
            )}

            {activeTab === 'reports' && (
              <ReportsView
                stats={stats}
                customers={customers}
                payments={payments}
                onSelectCustomer={handleSelectCustomer}
                todayDate={todayDate}
              />
            )}

            {activeTab === 'backup' && (
              <BackupRestoreView
                customers={customers}
                payments={payments}
                onRestoreBackup={restoreFromBackup}
                onLoadDemoData={loadDemo}
                onClearAllData={clearAll}
              />
            )}
          </>
        )}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav
        activeTab={activeTab}
        onNavigate={handleNavigateToTab}
        pendingCount={todayPendingCount}
      />

      {/* Global Add / Edit Customer Modal */}
      <CustomerFormModal
        isOpen={isAddCustomerOpen}
        onClose={() => setIsAddCustomerOpen(false)}
        onSubmit={handleCustomerFormSubmit}
        initialCustomer={editingCustomer}
        defaultTodayDate={todayDate}
      />

      {/* Global Quick Pay Modal for Today's collection from Customer list */}
      {quickPayCustomer && (
        <QuickPaymentModal
          isOpen={!!quickPayCustomer}
          onClose={() => setQuickPayCustomer(null)}
          customer={quickPayCustomer}
          dayScheduleItem={
            computeCustomerFinancialProfile(quickPayCustomer, payments, todayDate).todayStatus
          }
          onConfirmPayment={recordPayment}
          todayDate={todayDate}
        />
      )}
    </div>
  );
};
