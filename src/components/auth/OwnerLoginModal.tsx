import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context/AuthContext';
import {
  Phone,
  KeyRound,
  LogOut,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Smartphone,
  Cloud,
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
    logout,
    syncStatus,
    activeDeviceId,
  } = useAuth();

  const [mobileOrId, setMobileOrId] = useState('8466985944');
  const [pin, setPin] = useState('1234');
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
      setSuccessMessage('Logged in successfully! Live cloud sync active.');
      setTimeout(() => {
        setSuccessMessage(null);
        onClose();
      }, 1000);
    } else {
      setErrorMessage(res.error || 'Failed to log in. Please check mobile and PIN.');
    }
  };

  const handleManualSync = async () => {
    if (!onSyncNow) return;
    setIsSyncingManual(true);
    try {
      await onSyncNow();
      setSuccessMessage('Data synchronized with Firebase!');
      setTimeout(() => setSuccessMessage(null), 2000);
    } finally {
      setTimeout(() => setIsSyncingManual(false), 500);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isLoggedIn ? 'Owner Profile & Cloud Sync' : 'Owner Login'}
      subtitle={
        isLoggedIn
          ? `${owner?.businessName || 'Sri Lakshmi Narasimha Finance'} | Live Firebase Connected`
          : 'Sign in with your registered mobile number to sync all collections'
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

        {isLoggedIn && owner ? (
          /* LOGGED IN VIEW */
          <div className="space-y-4">
            {/* Active Owner Card */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-dark-850 via-dark-900 to-black border border-gold-500/40 shadow-glow-gold space-y-3">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-600 via-yellow-500 to-amber-300 text-dark-950 font-black flex items-center justify-center text-lg shrink-0 shadow-md">
                  {owner.ownerName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="text-base sm:text-lg font-extrabold text-white">
                    {owner.businessName}
                  </h4>
                  <p className="text-xs text-gold-300/90 font-medium">
                    Owner: <strong className="text-white">{owner.ownerName}</strong>
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] font-mono text-slate-400">
                      📱 {owner.mobile}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono font-bold border border-emerald-500/40">
                      🟢 Connected
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Row */}
              <div className="pt-3 border-t border-dark-750/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      syncStatus === 'SYNCING' || isSyncingManual
                        ? 'bg-amber-400 animate-spin'
                        : 'bg-emerald-400'
                    }`}
                  />
                  <span className="font-bold text-slate-200">
                    {syncStatus === 'SYNCING' || isSyncingManual
                      ? 'Syncing with Firebase...'
                      : 'Live Firebase Connected'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleManualSync}
                  disabled={isSyncingManual}
                  className="px-3 py-1.5 rounded-xl bg-dark-800 hover:bg-dark-750 border border-gold-500/30 text-gold-400 font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${
                      isSyncingManual ? 'animate-spin text-amber-400' : ''
                    }`}
                  />
                  <span>{isSyncingManual ? 'Syncing...' : 'Sync Cloud'}</span>
                </button>
              </div>
            </div>

            {/* Device Info */}
            <div className="p-3.5 rounded-2xl bg-dark-850 border border-gold-500/20 text-xs space-y-1.5 text-slate-300">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-gold-400" /> Current Device:
                </span>
                <span className="font-bold text-white font-mono">{activeDeviceId}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Cloud className="w-3.5 h-3.5 text-amber-400" /> Database:
                </span>
                <span className="font-bold text-emerald-400 font-mono text-[11px]">
                  Firebase Realtime DB Active
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-between gap-3 border-t border-dark-750">
              <button
                type="button"
                onClick={logout}
                className="px-4 py-2 rounded-xl border border-rose-500/40 text-rose-400 hover:bg-rose-950/60 font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-dark-950 font-black text-xs shadow-glow-gold transition-all active:scale-95"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* SIMPLE LOGIN FORM */
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gold-300 mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-gold-400" />
                <span>Registered Mobile Number</span>
              </label>
              <input
                type="tel"
                required
                value={mobileOrId}
                onChange={(e) => setMobileOrId(e.target.value)}
                placeholder="8466985944"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gold-500/30 bg-dark-850 text-white text-xs sm:text-sm outline-none focus:border-gold-400 font-mono transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gold-300 mb-1 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-gold-400" />
                <span>Secret PIN</span>
              </label>
              <input
                type="password"
                required
                maxLength={8}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gold-500/30 bg-dark-850 text-white text-xs sm:text-sm outline-none focus:border-gold-400 font-mono tracking-widest transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 text-dark-950 font-black text-xs sm:text-sm shadow-glow-gold hover:from-amber-600 hover:to-yellow-600 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Connecting to Cloud...</span>
                </>
              ) : (
                <span>Log In & Sync Data</span>
              )}
            </button>
          </form>
        )}
      </div>
    </Modal>
  );
};
