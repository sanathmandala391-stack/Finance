import React, { useState } from 'react';
import { Customer, PaymentRecord, BackupData } from '../../types/finance';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../hooks/useLanguage';
import {
  Cloud,
  RefreshCw,
  Download,
  Upload,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Smartphone,
  Globe,
  Lock,
  UserCheck,
  Check,
  Volume2,
  Play,
  Flame,
} from 'lucide-react';
import { exportBackupToJSON, parseBackupFile } from '../../utils/storage';
import { useSoundEffects } from '../../hooks/useSoundEffects';

interface SettingsViewProps {
  customers: Customer[];
  payments: PaymentRecord[];
  onRestoreBackup: (backup: BackupData) => boolean;
  onClearAllData: () => void;
  onOpenOwnerLogin: () => void;
  onSyncNow: () => Promise<any>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  customers,
  payments,
  onRestoreBackup,
  onClearAllData,
  onOpenOwnerLogin,
  onSyncNow,
}) => {
  const { lang, setLang, t } = useLanguage();
  const { playPaymentSuccessSound } = useSoundEffects();
  const {
    owner,
    isLoggedIn,
    lastSyncedAt,
    activeDeviceId,
  } = useAuth();

  const [isSyncing, setIsSyncing] = useState(false);
  const [isPlayingSound, setIsPlayingSound] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const handleTestSound = () => {
    setIsPlayingSound(true);
    playPaymentSuccessSound();
    setTimeout(() => setIsPlayingSound(false), 800);
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleManualSync = async () => {
    if (!isLoggedIn) {
      onOpenOwnerLogin();
      return;
    }
    setIsSyncing(true);
    try {
      const res = await onSyncNow();
      if (res.success) {
        showNotification('success', 'All customer & collection data successfully synced with Firebase!');
      } else {
        showNotification('error', res.error || 'Failed to sync with cloud.');
      }
    } catch {
      showNotification('error', 'Cloud sync encountered an issue.');
    } finally {
      setTimeout(() => setIsSyncing(false), 500);
    }
  };

  const handleExportJSON = () => {
    try {
      exportBackupToJSON(customers, payments);
      showNotification('success', 'Backup JSON file downloaded successfully.');
    } catch {
      showNotification('error', 'Failed to export backup JSON.');
    }
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const backup = await parseBackupFile(file);
      const ok = onRestoreBackup(backup);
      if (ok) {
        showNotification(
          'success',
          `Restored ${backup.customers.length} customers and ${backup.payments.length} transactions!`
        );
      } else {
        showNotification('error', 'Invalid backup file structure.');
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Error parsing backup file.');
    } finally {
      e.target.value = '';
    }
  };

  const handleClearAllWithConfirm = () => {
    if (
      window.confirm(
        '⚠️ ARE YOU SURE? This will delete all customers and payments from this device.\n\nMake sure you have downloaded a JSON backup or synced to the Cloud!'
      )
    ) {
      onClearAllData();
      showNotification('success', 'All local data cleared.');
    }
  };

  return (
    <div className="space-y-6 pb-24 max-w-4xl mx-auto">
      {/* Page Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
          <span>{t('settingsTitle') || 'Settings & Cloud Sync'}</span>
        </h2>
        <p className="text-xs sm:text-sm text-gold-300/70 font-medium mt-0.5">
          Mandala Sunitha • Sri Lakshmi Narasimha Finance
        </p>
      </div>

      {/* Notifications */}
      {notification && (
        <div
          className={`p-4 rounded-2xl flex items-start gap-3 text-xs sm:text-sm font-semibold animate-slide-up border ${
            notification.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
              : 'bg-rose-950/80 border-rose-500/50 text-rose-200'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* 1. OWNER & FIREBASE CLOUD SYNC CARD */}
      <div className="rounded-3xl bg-gradient-to-br from-dark-850 via-dark-900 to-black p-5 sm:p-6 border border-gold-500/30 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-dark-750">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-600 via-yellow-500 to-amber-300 text-dark-950 font-black flex items-center justify-center text-xl shadow-glow-gold">
              <Cloud className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <span>{owner?.businessName || 'Sri Lakshmi Narasimha Finance'}</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold">
                  🟢 Live Firebase Connected
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Owner: <strong className="text-white">{owner?.ownerName || 'Mandala Sunitha'}</strong> (📱 {owner?.mobile || '8466985944'})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenOwnerLogin}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-dark-950 font-black text-xs shadow-glow-gold hover:from-amber-600 hover:to-yellow-600 transition-all active:scale-95 flex items-center gap-1.5"
            >
              <UserCheck className="w-4 h-4" />
              <span>{isLoggedIn ? 'Account Profile' : 'Owner Login'}</span>
            </button>
          </div>
        </div>

        {/* Sync Status Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-dark-800 border border-dark-750 space-y-1">
            <span className="text-[11px] text-slate-400">Database:</span>
            <div className="flex items-center gap-2 font-bold text-emerald-400 font-mono">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>Firebase Realtime DB</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-dark-800 border border-dark-750 space-y-1">
            <span className="text-[11px] text-slate-400">Current Device:</span>
            <div className="font-bold text-white font-mono flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-gold-400" />
              <span>{activeDeviceId}</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-dark-800 border border-dark-750 space-y-1">
            <span className="text-[11px] text-slate-400">Last Synced:</span>
            <div className="font-bold text-slate-200 font-mono">
              {lastSyncedAt
                ? new Date(lastSyncedAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })
                : 'Just now'}
            </div>
          </div>
        </div>

        {/* Cloud Actions */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-gold-400" />
            <span>Automatic real-time sync across Laptop & Mobile</span>
          </div>

          <button
            type="button"
            onClick={handleManualSync}
            disabled={isSyncing}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-dark-800 hover:bg-dark-750 border border-gold-500/30 text-gold-400 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <RefreshCw
              className={`w-4 h-4 ${isSyncing ? 'animate-spin text-amber-400' : ''}`}
            />
            <span>{isSyncing ? 'Syncing...' : 'Sync Cloud Now'}</span>
          </button>
        </div>
      </div>

      {/* 2. LANGUAGE PREFERENCE */}
      <div className="rounded-3xl bg-dark-900 border border-gold-500/20 p-5 sm:p-6 shadow-xl space-y-3">
        <div className="flex items-center gap-2 text-gold-400 font-extrabold text-sm">
          <Globe className="w-4 h-4" />
          <span>Language Preference / భాష ఎంపిక</span>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            onClick={() => setLang('en')}
            className={`p-3.5 rounded-2xl border text-xs sm:text-sm font-bold flex items-center justify-between transition-all active:scale-95 ${
              lang === 'en'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-dark-950 border-gold-400 font-black shadow-glow-gold'
                : 'bg-dark-850 text-slate-300 border-dark-750 hover:bg-dark-800'
            }`}
          >
            <span>English (Default)</span>
            {lang === 'en' && <Check className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => setLang('te')}
            className={`p-3.5 rounded-2xl border text-xs sm:text-sm font-bold flex items-center justify-between transition-all active:scale-95 ${
              lang === 'te'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-dark-950 border-gold-400 font-black shadow-glow-gold'
                : 'bg-dark-850 text-slate-300 border-dark-750 hover:bg-dark-800'
            }`}
          >
            <span>తెలుగు (Telugu)</span>
            {lang === 'te' && <Check className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 3. PAYMENT AUDIO & SOUND EFFECTS */}
      <div className="rounded-3xl bg-dark-900 border border-gold-500/20 p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-gold-400 font-extrabold text-sm">
              <Volume2 className="w-4 h-4" />
              <span>Payment Confirmation Audio (FamPay Chime)</span>
            </div>
            <p className="text-xs text-slate-400">
              Plays instant zero-latency FamPay UPI confirmation sound on every marked collection and settled due.
            </p>
          </div>

          <button
            type="button"
            onClick={handleTestSound}
            className={`px-4 py-2.5 rounded-2xl border font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-95 shrink-0 ${
              isPlayingSound
                ? 'bg-gold-400 text-dark-950 border-gold-300 shadow-glow-gold scale-105'
                : 'bg-dark-800 hover:bg-dark-750 text-gold-400 border-gold-500/30'
            }`}
          >
            <Play className={`w-4 h-4 ${isPlayingSound ? 'animate-bounce' : ''}`} />
            <span>{isPlayingSound ? 'Playing Sound...' : 'Test FamPay Sound 🔊'}</span>
          </button>
        </div>
      </div>

      {/* 4. DATA BACKUP & RESTORE */}
      <div className="rounded-3xl bg-dark-900 border border-gold-500/20 p-5 sm:p-6 shadow-xl space-y-4">
        <div>
          <h3 className="text-base font-extrabold text-white">
            Local Backup & Safety Export
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Download an offline JSON copy of all {customers.length} customers and {payments.length} payments.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleExportJSON}
            className="p-4 rounded-2xl bg-dark-850 hover:bg-dark-800 border border-gold-500/30 text-white flex items-center gap-3 transition-all active:scale-95"
          >
            <div className="w-10 h-10 rounded-xl bg-gold-500/20 text-gold-400 flex items-center justify-center shrink-0">
              <Download className="w-5 h-5" />
            </div>
            <div className="text-left">
              <div className="font-bold text-xs sm:text-sm">Download Backup File</div>
              <div className="text-[11px] text-slate-400">Save offline copy (.json)</div>
            </div>
          </button>

          <label className="p-4 rounded-2xl bg-dark-850 hover:bg-dark-800 border border-gold-500/30 text-white flex items-center gap-3 transition-all active:scale-95 cursor-pointer">
            <input
              type="file"
              accept=".json"
              onChange={handleFileImport}
              className="hidden"
            />
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Upload className="w-5 h-5" />
            </div>
            <div className="text-left">
              <div className="font-bold text-xs sm:text-sm">Restore from Backup</div>
              <div className="text-[11px] text-slate-400">Upload .json file</div>
            </div>
          </label>
        </div>
      </div>

      {/* 5. DANGER ZONE */}
      <div className="rounded-3xl bg-dark-900 border border-rose-500/20 p-5 sm:p-6 shadow-xl space-y-3">
        <div className="flex items-center gap-2 text-rose-400 font-extrabold text-sm">
          <Trash2 className="w-4 h-4" />
          <span>Reset & Clear Local Storage</span>
        </div>
        <p className="text-xs text-slate-400">
          Clears local browser cache for this device. Your data remains safely backed up in Firebase.
        </p>

        <button
          type="button"
          onClick={handleClearAllWithConfirm}
          className="px-4 py-2.5 rounded-xl border border-rose-500/40 text-rose-300 hover:bg-rose-950/50 font-bold text-xs flex items-center gap-2 transition-all active:scale-95"
        >
          <Trash2 className="w-4 h-4 text-rose-400" />
          <span>Clear Local Data</span>
        </button>
      </div>
    </div>
  );
};
