import React, { useState, useEffect } from 'react';
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
import { SettingsView } from './components/settings/SettingsView';
import { OwnerLoginModal } from './components/auth/OwnerLoginModal';
import { computeCustomerFinancialProfile } from './utils/financeCalculations';
import { cloudSync } from './services/cloudSyncService';
import { firebaseSync } from './services/firebaseSyncService';

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
    clearAll,
    restoreFromBackup,
    syncNow,
  } = useFinanceData();

  // Auto-detect and import sync payload from QR code scan or share link
  useEffect(() => {
    const handleUrlSync = async () => {
      const hash = window.location.hash;
      if (hash && hash.includes('sync=')) {
        const syncParam = hash.split('sync=')[1];
        if (syncParam) {
          const res = await cloudSync.importCompressedSyncData(decodeURIComponent(syncParam));
          if (res.success && res.data) {
            restoreFromBackup({
              app: 'giri-giri-finance',
              customers: res.data.customers,
              payments: res.data.payments,
              exportDate: res.data.timestamp,
              version: '2.0',
            });
            if (res.data.owner) {
              cloudSync.saveOwnerProfile(res.data.owner);
            }
            if (res.data.firebaseUrl) {
              firebaseSync.setDatabaseUrl(res.data.firebaseUrl);
            }
            alert(`✨ Data successfully synchronized!\n\nImported ${res.data.customers.length} customers and ${res.data.payments.length} transactions from ${res.data.sourceDevice}.`);
            window.history.replaceState(null, '', window.location.pathname);
          }
        }
      }
    };
    handleUrlSync();
  }, [restoreFromBackup]);

  // Navigation State
  const [activeTab, setActiveTab] = useState<string>('today');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Modal States
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [quickPayCustomer, setQuickPayCustomer] = useState<Customer | null>(null);
  const [isOwnerLoginOpen, setIsOwnerLoginOpen] = useState(false);

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
    if (tab === 'backup') {
      setActiveTab('settings');
    } else {
      setActiveTab(tab);
    }
    setSelectedCustomer(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-dark-950 text-white flex flex-col font-sans selection:bg-gold-500 selection:text-dark-950">
      {/* Top Brand Navbar */}
      <Navbar
        todayDate={todayDate}
        onDateChange={setTodayDate}
        onOpenAddCustomer={handleOpenAddCustomer}
        onNavigateToTab={handleNavigateToTab}
        activeTab={activeTab}
        onOpenOwnerLogin={() => setIsOwnerLoginOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* If a customer detail passbook is selected */}
        {selectedCustomer ? (
          <CustomerDetailView
            customer={customers.find((c) => c.id === selectedCustomer.id) || selectedCustomer}
            payments={payments}
            onBack={handleBackToCustomers}
            onEditCustomer={handleEditCustomer}
            onDeleteCustomer={deleteCustomer}
            onRecordPayment={recordPayment}
            onDeletePayment={deletePayment}
            todayDate={todayDate}
          />
        ) : (
          <>
            {activeTab === 'today' && (
              <TodayCollectionView
                customers={customers}
                payments={payments}
                onRecordPayment={recordPayment}
                onSelectCustomer={handleSelectCustomer}
                todayDate={todayDate}
              />
            )}

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

            {activeTab === 'settings' && (
              <SettingsView
                customers={customers}
                payments={payments}
                onRestoreBackup={restoreFromBackup}
                onClearAllData={clearAll}
                onOpenOwnerLogin={() => setIsOwnerLoginOpen(true)}
                onSyncNow={syncNow}
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

      {/* Owner Login & Multi-Device Cloud Sync Modal */}
      <OwnerLoginModal
        isOpen={isOwnerLoginOpen}
        onClose={() => setIsOwnerLoginOpen(false)}
        onSyncNow={syncNow}
      />
    </div>
  );
};

