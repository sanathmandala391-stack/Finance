import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context/AuthContext';
import { cloudSync } from '../../services/cloudSyncService';
import { QRCodeSVG } from 'qrcode.react';
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
  CheckCircle2,
  AlertCircle,
  KeyRound,
  QrCode,
  Share2,
  Copy,
  Check,
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
    activeDeviceId,
  } = useAuth();

  const [mode, setMode] = useState<'LOGIN' | 'REGISTER' | 'QR_SYNC'>('LOGIN');
  const [mobileOrId, setMobileOrId] = useState('');
  const [pin, setPin] = useState('');

  // Registration state
  const [ownerName, setOwnerName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [regMobile, setRegMobile] = useState('');
  const [regPin, setRegPin] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSyncingManual, setIsSyncingManual] = useState(false);

  // QR Sync State
  const [syncUrl, setSyncUrl] = useState<string>('');
  const [isCopied, setIsCopied] = useState(false);

  // Generate QR sync URL when opening or when owner changes
  useEffect(() => {
    if (isOpen) {
      try {
        const custs = JSON.parse(localStorage.getItem('giri_giri_customers_v2') || '[]');
        const pays = JSON.parse(localStorage.getItem('giri_giri_payments_v2') || '[]');
        const activeOwner = owner || {
          id: 'OWN-1001',
          ownerName: 'Finance Owner',
          businessName: 'Sri Lakshmi Narsimha Finance',
          mobile: '9876543210',
          pin: '1234',
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
          activeDeviceId,
        };

        cloudSync.generateMobileSyncUrl(activeOwner, custs, pays).then((url) => {
          setSyncUrl(url);
        });
      } catch {
        // Ignore
      }
    }
  }, [isOpen, owner, activeDeviceId]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    const res = await login(mobileOrId, pin);
    setIsLoading(false);

    if (res.success) {
      setSuccessMessage('Logged in successfully! Cross-device sync enabled.');
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
    });
    setIsLoading(false);

    if (res.success) {
      setSuccessMessage('Owner account configured! Multi-device sync enabled.');
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
      setSuccessMessage('Data broadcasted to all connected devices!');
      setTimeout(() => setSuccessMessage(null), 2500);
    } finally {
      setTimeout(() => setIsSyncingManual(false), 500);
    }
  };

  const handleCopySyncLink = () => {
    if (!syncUrl) return;
    navigator.clipboard.writeText(syncUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleShareWhatsApp = () => {
    if (!syncUrl) return;
    const text = encodeURIComponent(
      `📲 Open this Giri-Giri Finance Sync link on your mobile phone to immediately mirror all customers and dues:\n\n${syncUrl}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        mode === 'QR_SYNC'
          ? '📲 Instant Mobile Sync (QR Code)'
          : isLoggedIn
          ? 'Owner Profile & Cross-Device Hub'
          : mode === 'LOGIN'
          ? 'Owner / Provider Login'
          : 'Setup Finance Profile'
      }
      subtitle={
        mode === 'QR_SYNC'
          ? 'Scan this QR code with your mobile camera to mirror all dues instantly'
          : isLoggedIn
          ? `${owner?.businessName} | Real-Time Sync`
          : 'Access all customer & collection data across your laptop & mobile'
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

        {/* QR SYNC MODE */}
        {mode === 'QR_SYNC' ? (
          <div className="space-y-4 text-center">
            <div className="p-4 bg-white rounded-3xl inline-block mx-auto shadow-2xl border-4 border-gold-400">
              {syncUrl ? (
                <QRCodeSVG value={syncUrl} size={200} level="M" includeMargin={false} />
              ) : (
                <div className="w-[200px] h-[200px] flex items-center justify-center text-slate-600 text-xs font-bold">
                  Generating QR Code...
                </div>
              )}
            </div>

            <div className="space-y-1">
              <h4 className="text-sm font-extrabold text-white">
                Scan with your Mobile Camera or QR Scanner
              </h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Opens this finance app on your phone and imports 100% of your customers, loan schedules, and payments in 1 second.
              </p>
            </div>

            {/* Quick Copy Link & WhatsApp Share */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleCopySyncLink}
                className="p-3 rounded-xl bg-dark-850 hover:bg-dark-800 border border-gold-500/30 text-gold-400 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{isCopied ? 'Link Copied to Clipboard!' : 'Copy Sync Link'}</span>
              </button>

              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="p-3 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <Share2 className="w-4 h-4" />
                <span>Send to Myself via WhatsApp</span>
              </button>
            </div>

            <div className="pt-2 border-t border-dark-750 flex justify-end">
              <button
                type="button"
                onClick={() => setMode('LOGIN')}
                className="px-4 py-2 rounded-xl bg-dark-800 hover:bg-dark-750 text-slate-300 text-xs font-bold"
              >
                Back to Profile
              </button>
            </div>
          </div>
        ) : isLoggedIn && owner ? (
          /* ALREADY CONFIGURED OWNER HUB */
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

              {/* Status Pill */}
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
                      ? 'Broadcasting Sync...'
                      : syncStatus === 'OFFLINE'
                      ? 'Offline Mode'
                      : 'Live Multi-Device Connected'}
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

            {/* Instant Mobile Sync Action Box */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-transparent border border-gold-500/30 flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <h5 className="text-xs font-black text-white flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-gold-400" />
                  <span>Sync to Mobile Phone</span>
                </h5>
                <p className="text-[11px] text-slate-400">
                  Instantly open & duplicate this live data on your phone with a QR code.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setMode('QR_SYNC')}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-dark-950 font-black text-xs shadow-glow-gold flex items-center gap-1.5 transition-all active:scale-95 shrink-0"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Show QR Code</span>
              </button>
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
                  <Cloud className="w-3.5 h-3.5 text-sky-400" /> Cross-Device Real-Time Sync:
                </span>
                <span className="font-bold text-emerald-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Active
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center justify-between gap-3 border-t border-dark-750">
              <button
                type="button"
                onClick={logout}
                className="px-4 py-2.5 rounded-xl border border-rose-500/40 text-rose-400 hover:bg-rose-950/60 font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Switch Account</span>
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
                Setup New Account
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('QR_SYNC');
                  setErrorMessage(null);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1 ${
                  (mode as string) === 'QR_SYNC'
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-dark-950 shadow-md font-extrabold'
                    : 'text-gold-400 hover:text-gold-300'
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>QR Sync</span>
              </button>
            </div>

            {mode === 'LOGIN' && (
              <form onSubmit={handleLoginSubmit} className="space-y-3.5">
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
                    placeholder="Enter 10-digit mobile number"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gold-500/30 bg-dark-850 text-white text-xs sm:text-sm outline-none focus:border-gold-400 font-mono transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gold-300 mb-1 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-gold-400" />
                    <span>Secret Security PIN</span>
                  </label>
                  <input
                    type="password"
                    required
                    maxLength={6}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="Enter 4 or 6-digit PIN"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gold-500/30 bg-dark-850 text-white text-xs sm:text-sm outline-none focus:border-gold-400 font-mono transition-all"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-600 hover:to-yellow-600 text-dark-950 font-black text-xs sm:text-sm rounded-xl shadow-glow-gold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Lock className="w-4 h-4" />
                    )}
                    <span>{isLoading ? 'Connecting...' : 'Log In & Sync Data'}</span>
                  </button>
                </div>
              </form>
            )}

            {mode === 'REGISTER' && (
              <form onSubmit={handleRegisterSubmit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gold-300 mb-1 flex items-center gap-1">
                      <Building className="w-3.5 h-3.5 text-gold-400" />
                      <span>Finance Business Name *</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="e.g. Sri Lakshmi Narsimha Finance"
                      className="w-full px-3 py-2 rounded-xl border border-gold-500/30 bg-dark-850 text-white text-xs outline-none focus:border-gold-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gold-300 mb-1 flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-gold-400" />
                      <span>Owner / Manager Name *</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      placeholder="e.g. Mandala Sunitha"
                      className="w-full px-3 py-2 rounded-xl border border-gold-500/30 bg-dark-850 text-white text-xs outline-none focus:border-gold-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gold-300 mb-1 flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-gold-400" />
                      <span>10-Digit Mobile Number *</span>
                    </label>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      value={regMobile}
                      onChange={(e) => setRegMobile(e.target.value)}
                      placeholder="9876543210"
                      className="w-full px-3 py-2 rounded-xl border border-gold-500/30 bg-dark-850 text-white text-xs outline-none focus:border-gold-400 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gold-300 mb-1 flex items-center gap-1">
                      <KeyRound className="w-3.5 h-3.5 text-gold-400" />
                      <span>Create Secret PIN *</span>
                    </label>
                    <input
                      type="password"
                      required
                      maxLength={6}
                      value={regPin}
                      onChange={(e) => setRegPin(e.target.value)}
                      placeholder="4 to 6 digit PIN"
                      className="w-full px-3 py-2 rounded-xl border border-gold-500/30 bg-dark-850 text-white text-xs outline-none focus:border-gold-400 font-mono"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 text-dark-950 font-black text-xs sm:text-sm rounded-xl shadow-glow-gold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <ShieldCheck className="w-4 h-4" />
                    )}
                    <span>{isLoading ? 'Creating...' : 'Save & Enable Device Sync'}</span>
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
