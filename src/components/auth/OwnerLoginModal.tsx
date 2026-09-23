import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context/AuthContext';
import {
  ShieldCheck,
  Cloud,
  Smartphone,
  Lock,
  Building,
  User,
  Phone,
  RefreshCw,
  LogOut,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Mail,
} from 'lucide-react';

interface OwnerLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncNow?: () => Promise<any>;
}

export const OwnerLoginModal: React.FC<OwnerLoginModalProps> = ({
  isOpen,
  onClose,
  onSyncNow,
}) => {
  const {
    owner,
    isLoggedIn,
    login,
    register,
    logout,
    syncStatus,
    lastSyncedAt,
    activeDeviceId,
  } = useAuth();

  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [mobileOrId, setMobileOrId] = useState('');
  const [pin, setPin] = useState('');

  // Registration state
  const [ownerName, setOwnerName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [regMobile, setRegMobile] = useState('');
  const [regPin, setRegPin] = useState('');
  const [email, setEmail] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSyncingManual, setIsSyncingManual] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    const res = await login(mobileOrId, pin);
    setIsLoading(false);

    if (res.success) {
      setSuccessMessage('Logged in successfully! Cloud data synced.');
      setTimeout(() => {
        setSuccessMessage(null);
        onClose();
      }, 1200);
    } else {
      setErrorMessage(res.error || 'Failed to log in.');
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    const res = await register({
      ownerName,
      businessName,
      mobile: regMobile,
      pin: regPin,
      email,
    });
    setIsLoading(false);

    if (res.success) {
      setSuccessMessage('Owner account created! Multi-device sync enabled.');
      setTimeout(() => {
        setSuccessMessage(null);
        onClose();
      }, 1400);
    } else {
      setErrorMessage(res.error || 'Failed to create account.');
    }
  };

  const handleManualSync = async () => {
    if (!onSyncNow) return;
    setIsSyncingManual(true);
    try {
      await onSyncNow();
    } finally {
      setTimeout(() => setIsSyncingManual(false), 600);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        isLoggedIn
          ? 'Owner Profile & Cloud Sync'
          : mode === 'LOGIN'
          ? 'Owner / Provider Login'
          : 'Create Finance Account'
      }
      subtitle={
        isLoggedIn
          ? `${owner?.businessName} | Multi-Device Connected`
          : 'Access all customer & collection data on any device'
      }
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Alerts */}
        {errorMessage && (
          <div className="p-3 rounded-2xl bg-rose-950/80 border border-rose-500/50 flex items-start gap-2 text-xs text-rose-300 animate-slide-up">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 flex items-start gap-2 text-xs text-emerald-300 animate-slide-up">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* ALREADY LOGGED IN: OWNER DASHBOARD & CLOUD STATUS */}
        {isLoggedIn && owner ? (
          <div className="space-y-4">
            {/* Active Owner Profile Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-dark-850 via-dark-900 to-black border border-gold-500/40 shadow-glow-gold relative overflow-hidden">
              <div className="relative z-10 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-600 via-yellow-500 to-amber-300 text-dark-950 font-black flex items-center justify-center text-lg shrink-0 shadow-md">
                    {owner.ownerName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-base sm:text-lg font-extrabold text-white">
                      {owner.businessName}
                    </h4>
                    <p className="text-xs text-gold-300/80 font-medium">
                      Owner: <strong className="text-white">{owner.ownerName}</strong>
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] font-mono text-slate-400">
                        📱 {owner.mobile}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-gold-500/20 text-gold-400 font-mono font-bold border border-gold-500/30">
                        {owner.id}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cloud Sync Status Pill */}
              <div className="mt-4 pt-3 border-t border-dark-750/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      syncStatus === 'SYNCING' || isSyncingManual
                        ? 'bg-amber-400 animate-spin'
                        : syncStatus === 'OFFLINE'
                        ? 'bg-rose-500'
                        : 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                    }`}
                  />
                  <span className="font-bold text-slate-200">
                    {syncStatus === 'SYNCING' || isSyncingManual
                      ? 'Syncing with Cloud...'
                      : syncStatus === 'OFFLINE'
                      ? 'Offline Mode'
                      : 'Live Cloud Synced'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleManualSync}
                  disabled={isSyncingManual}
                  className="px-3 py-1 rounded-xl bg-dark-800 hover:bg-dark-750 border border-gold-500/30 text-gold-400 font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${
                      isSyncingManual ? 'animate-spin text-amber-400' : ''
                    }`}
                  />
                  <span>{isSyncingManual ? 'Syncing...' : 'Sync Now'}</span>
                </button>
              </div>
            </div>

            {/* Active Device Info */}
            <div className="p-3.5 rounded-2xl bg-dark-850 border border-gold-500/20 text-xs space-y-1.5 text-slate-300">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-gold-400" /> Current Device:
                </span>
                <span className="font-bold text-white font-mono">{activeDeviceId}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Cloud className="w-3.5 h-3.5 text-sky-400" /> Multi-Device Status:
                </span>
                <span className="font-bold text-emerald-400">Reflecting on all devices</span>
              </div>
              {lastSyncedAt && (
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-dark-750">
                  <span>Last Cloud Check:</span>
                  <span className="font-mono">
                    {new Date(lastSyncedAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </span>
                </div>
              )}
            </div>

            {/* How it works banner */}
            <div className="p-3 bg-dark-850/80 rounded-2xl border border-dark-750 text-xs text-slate-300 space-y-1">
              <div className="font-bold text-gold-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> How to log in on your other devices:
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Open this app on your other phone or laptop, click <strong>Owner Login</strong>, and enter Mobile:{' '}
                <strong className="text-white">{owner.mobile}</strong> and your Secret PIN. All loans and collections will reflect instantly!
              </p>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center justify-between gap-3 border-t border-dark-750">
              <button
                type="button"
                onClick={logout}
                className="px-4 py-2.5 rounded-xl border border-rose-500/40 text-rose-400 hover:bg-rose-950/60 font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out / Switch Account</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-dark-950 font-black text-xs shadow-glow-gold transition-all active:scale-95"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* LOGIN OR REGISTER FORMS */
          <div>
            {/* Mode Switcher Tabs */}
            <div className="flex p-1 bg-dark-850 rounded-2xl border border-gold-500/20 mb-4">
              <button
                type="button"
                onClick={() => {
                  setMode('LOGIN');
                  setErrorMessage(null);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                  mode === 'LOGIN'
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-dark-950 shadow-md font-extrabold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Owner Login
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('REGISTER');
                  setErrorMessage(null);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                  mode === 'REGISTER'
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-dark-950 shadow-md font-extrabold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                New Account
              </button>
            </div>

            {mode === 'LOGIN' ? (
              <form onSubmit={handleLoginSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-gold-300 mb-1">
                    Mobile Number or Account ID
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gold-400">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={mobileOrId}
                      onChange={(e) => setMobileOrId(e.target.value)}
                      placeholder="e.g. 9876543210 or OWN-1001"
                      className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm rounded-xl border border-gold-500/30 bg-dark-850 text-white outline-none focus:border-gold-400 transition-all font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gold-300 mb-1">
                    Secret Access PIN
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gold-400">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      required
                      maxLength={6}
                      inputMode="numeric"
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      placeholder="4 or 6-digit PIN"
                      className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm rounded-xl border border-gold-500/30 bg-dark-850 text-white outline-none focus:border-gold-400 transition-all font-mono tracking-widest"
                    />
                  </div>
                </div>

                <div className="p-3 bg-dark-850/60 rounded-xl border border-gold-500/20 text-[11px] text-slate-300 flex items-start gap-2">
                  <Cloud className="w-4 h-4 shrink-0 text-sky-400 mt-0.5" />
                  <span>
                    Logging in will sync and reflect all your customers, loans, daily collections, and receipts instantly on this device.
                  </span>
                </div>

                <div className="pt-2 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 text-xs font-bold text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 py-2.5 px-4 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-600 hover:to-yellow-600 active:scale-95 text-dark-950 font-black text-xs sm:text-sm rounded-xl shadow-glow-gold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Logging In & Syncing...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
                        <span>Log In to Account</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleRegisterSubmit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gold-300 mb-1">
                      Owner Full Name *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gold-400">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={ownerName}
                        onChange={(e) => setOwnerName(e.target.value)}
                        placeholder="e.g. B. Gopi"
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gold-500/30 bg-dark-850 text-white outline-none focus:border-gold-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gold-300 mb-1">
                      Business Name *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gold-400">
                        <Building className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        placeholder="e.g. Sri Lakshmi Finance"
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gold-500/30 bg-dark-850 text-white outline-none focus:border-gold-400"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gold-300 mb-1">
                      Mobile Number (For Login) *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gold-400">
                        <Phone className="w-4 h-4" />
                      </div>
                      <input
                        type="tel"
                        required
                        value={regMobile}
                        onChange={(e) => setRegMobile(e.target.value)}
                        placeholder="10-digit mobile"
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gold-500/30 bg-dark-850 text-white outline-none focus:border-gold-400 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gold-300 mb-1">
                      Secret PIN (4-6 digits) *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gold-400">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type="password"
                        required
                        maxLength={6}
                        inputMode="numeric"
                        value={regPin}
                        onChange={(e) => setRegPin(e.target.value)}
                        placeholder="PIN to secure data"
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gold-500/30 bg-dark-850 text-white outline-none focus:border-gold-400 font-mono tracking-widest"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gold-300 mb-1">
                    Email Address (Optional)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gold-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. owner@finance.com"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gold-500/30 bg-dark-850 text-white outline-none focus:border-gold-400"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 text-xs font-bold text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 py-2.5 px-4 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-600 hover:to-yellow-600 active:scale-95 text-dark-950 font-black text-xs sm:text-sm rounded-xl shadow-glow-gold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Creating Account...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 stroke-[2.5]" />
                        <span>Create & Enable Cloud Sync</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
