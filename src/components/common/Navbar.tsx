import React, { useState } from 'react';
import {
  Calendar,
  PlusCircle,
  IndianRupee,
  RefreshCw,
  Sparkles,
  Languages,
} from 'lucide-react';
import { formatDisplayDate, getTodayISO } from '../../utils/dateUtils';
import { useLanguage } from '../../hooks/useLanguage';

interface NavbarProps {
  todayDate: string;
  onDateChange: (date: string) => void;
  onOpenAddCustomer: () => void;
  onNavigateToTab: (tab: string) => void;
  activeTab: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  todayDate,
  onDateChange,
  onOpenAddCustomer,
  onNavigateToTab,
  activeTab,
}) => {
  const { lang, setLang, t } = useLanguage();
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);

  const isRealToday = todayDate === getTodayISO();

  return (
    <header className="sticky top-0 z-40 bg-dark-950/95 backdrop-blur-md border-b border-gold-500/20 shadow-lg shadow-black/40 transition-colors">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Brand Logo */}
          <div
            onClick={() => onNavigateToTab('dashboard')}
            className="flex items-center gap-3 cursor-pointer group select-none"
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-amber-600 via-yellow-500 to-amber-300 flex items-center justify-center text-dark-950 shadow-glow-gold group-hover:scale-105 transition-all">
              <IndianRupee className="w-5 h-5 sm:w-6 sm:h-6 font-black stroke-[3]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-xl sm:text-2xl tracking-tight text-white">
                  {t('appName')}
                </span>
                <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-md bg-gold-500/20 text-gold-400 font-extrabold border border-gold-500/40">
                  {t('appSubname')}
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-gold-200/60 font-medium hidden sm:block">
                {t('appTagline')}
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 bg-dark-900/90 p-1.5 rounded-2xl border border-gold-500/20 text-xs sm:text-sm font-bold shadow-inner">
            <button
              onClick={() => onNavigateToTab('dashboard')}
              className={`px-3.5 py-1.5 rounded-xl transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-dark-950 shadow-md font-extrabold'
                  : 'text-slate-300 hover:text-gold-400'
              }`}
            >
              {t('dashboard')}
            </button>
            <button
              onClick={() => onNavigateToTab('today')}
              className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === 'today'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-dark-950 shadow-md font-extrabold'
                  : 'text-slate-300 hover:text-gold-400'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              {t('todaysRun')}
            </button>
            <button
              onClick={() => onNavigateToTab('customers')}
              className={`px-3.5 py-1.5 rounded-xl transition-all ${
                activeTab === 'customers'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-dark-950 shadow-md font-extrabold'
                  : 'text-slate-300 hover:text-gold-400'
              }`}
            >
              {t('customers')}
            </button>
            <button
              onClick={() => onNavigateToTab('history')}
              className={`px-3.5 py-1.5 rounded-xl transition-all ${
                activeTab === 'history'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-dark-950 shadow-md font-extrabold'
                  : 'text-slate-300 hover:text-gold-400'
              }`}
            >
              {t('ledger')}
            </button>
            <button
              onClick={() => onNavigateToTab('reports')}
              className={`px-3.5 py-1.5 rounded-xl transition-all ${
                activeTab === 'reports'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-dark-950 shadow-md font-extrabold'
                  : 'text-slate-300 hover:text-gold-400'
              }`}
            >
              {t('reports')}
            </button>
            <button
              onClick={() => onNavigateToTab('backup')}
              className={`px-3.5 py-1.5 rounded-xl transition-all ${
                activeTab === 'backup'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-dark-950 shadow-md font-extrabold'
                  : 'text-slate-300 hover:text-gold-400'
              }`}
            >
              {t('backup')}
            </button>
          </nav>

          {/* Right Tools (Language Switcher + Date Selector + Add Customer) */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Language Switcher (English / తెలుగు) */}
            <div className="relative">
              <button
                onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-dark-900 border border-gold-500/30 text-gold-400 hover:border-gold-400 hover:bg-dark-850 text-xs font-bold transition-all shadow-sm"
                title="Switch Language / భాషను మార్చండి"
              >
                <Languages className="w-4 h-4 text-amber-400" />
                <span>{lang === 'te' ? 'తెలుగు' : 'English'}</span>
              </button>

              {isLangMenuOpen && (
                <div className="absolute right-0 mt-2 p-1.5 w-36 bg-dark-900 border border-gold-500/40 rounded-2xl shadow-2xl z-50 animate-scale-in">
                  <button
                    onClick={() => {
                      setLang('en');
                      setIsLangMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                      lang === 'en'
                        ? 'bg-gold-500/20 text-gold-400 border border-gold-500/30'
                        : 'text-slate-300 hover:bg-dark-800'
                    }`}
                  >
                    <span>English</span>
                    {lang === 'en' && <span className="text-[10px] text-amber-400">✓</span>}
                  </button>
                  <button
                    onClick={() => {
                      setLang('te');
                      setIsLangMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between mt-1 ${
                      lang === 'te'
                        ? 'bg-gold-500/20 text-gold-400 border border-gold-500/30'
                        : 'text-slate-300 hover:bg-dark-800'
                    }`}
                  >
                    <span>తెలుగు (Telugu)</span>
                    {lang === 'te' && <span className="text-[10px] text-amber-400">✓</span>}
                  </button>
                </div>
              )}
            </div>

            {/* Date Simulator Widget */}
            <div className="relative">
              <button
                onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl text-xs font-bold border transition-all ${
                  isRealToday
                    ? 'bg-dark-900 text-slate-200 border-gold-500/30 hover:border-gold-400'
                    : 'bg-amber-950 text-amber-300 border-amber-500 animate-pulse'
                }`}
                title="Active Date"
              >
                <Calendar className="w-3.5 h-3.5 text-gold-400" />
                <span>{formatDisplayDate(todayDate, false)}</span>
                {!isRealToday && (
                  <span className="text-[10px] bg-amber-500 text-dark-950 rounded px-1 font-black">
                    {t('simulated')}
                  </span>
                )}
              </button>

              {isDatePickerOpen && (
                <div className="absolute right-0 mt-2 p-3 w-64 bg-dark-900 border border-gold-500/40 rounded-2xl shadow-2xl z-50 animate-scale-in">
                  <div className="text-xs font-bold text-gold-400 mb-2">
                    {t('activeDate')}:
                  </div>
                  <input
                    type="date"
                    value={todayDate}
                    onChange={(e) => {
                      if (e.target.value) {
                        onDateChange(e.target.value);
                        setIsDatePickerOpen(false);
                      }
                    }}
                    className="w-full px-2.5 py-2 text-xs font-mono rounded-xl border border-gold-500/30 bg-dark-800 text-white outline-none focus:border-gold-400"
                  />
                  <div className="mt-3 flex items-center justify-between pt-2 border-t border-dark-750 text-xs">
                    <button
                      onClick={() => {
                        onDateChange(getTodayISO());
                        setIsDatePickerOpen(false);
                      }}
                      className="text-gold-400 font-bold hover:underline flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" /> {t('resetDate')}
                    </button>
                    <button
                      onClick={() => setIsDatePickerOpen(false)}
                      className="text-slate-400 hover:text-white"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Add Customer Button */}
            <button
              onClick={onOpenAddCustomer}
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-600 hover:to-yellow-600 active:scale-95 text-dark-950 font-black text-xs sm:text-sm rounded-xl shadow-glow-gold transition-all"
            >
              <PlusCircle className="w-4 h-4 stroke-[2.5]" />
              <span>{t('addCustomer')}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
