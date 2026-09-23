import React, { useState, useRef } from 'react';
import { BackupData, Customer, PaymentRecord } from '../../types/finance';
import { createBackupJSON, parseAndValidateBackup } from '../../utils/storage';
import { exportCustomersToCSV, exportPaymentsToCSV, exportTodayCollectionSheetToCSV } from '../../utils/csvExport';
import { getTodayISO } from '../../utils/dateUtils';
import { useLanguage } from '../../hooks/useLanguage';
import {
  Database,
  Download,
  Upload,
  RefreshCw,
  Trash2,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  HardDrive,
  Sparkles,
} from 'lucide-react';

interface BackupRestoreViewProps {
  customers: Customer[];
  payments: PaymentRecord[];
  onRestoreBackup: (data: BackupData) => boolean;
  onLoadDemoData: () => void;
  onClearAllData: () => void;
}

export const BackupRestoreView: React.FC<BackupRestoreViewProps> = ({
  customers,
  payments,
  onRestoreBackup,
  onLoadDemoData,
  onClearAllData,
}) => {
  const { t, lang } = useLanguage();
  const [restoreStatus, setRestoreStatus] = useState<{ success?: boolean; message?: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadJSONBackup = () => {
    const jsonStr = createBackupJSON(customers, payments);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `GiriGiri_Backup_${getTodayISO()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = parseAndValidateBackup(content);
      if (res.success && res.data) {
        const ok = onRestoreBackup(res.data);
        if (ok) {
          setRestoreStatus({
            success: true,
            message: lang === 'te'
              ? `${res.data.customers.length} కస్టమర్లు మరియు ${res.data.payments.length} చెల్లింపు రికార్డులు విజయవంతంగా పునరుద్ధరించబడ్డాయి!`
              : `Successfully restored ${res.data.customers.length} customers and ${res.data.payments.length} payment records!`,
          });
        } else {
          setRestoreStatus({
            success: false,
            message: lang === 'te' ? 'బ్యాకప్ పునరుద్ధరణ విఫలమైంది.' : 'Failed to restore backup data.',
          });
        }
      } else {
        setRestoreStatus({
          success: false,
          message: res.error || (lang === 'te' ? 'చెల్లని బ్యాకప్ ఫైల్.' : 'Invalid backup file.'),
        });
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClear = () => {
    const confirmText = lang === 'te'
      ? '⚠️ హెచ్చరిక: మీరు అన్ని కస్టమర్ లోన్లు మరియు చెల్లింపుల చరిత్రను పూర్తిగా తొలగించాలనుకుంటున్నారా? దయచేసి ముందుగా JSON బ్యాకప్ డౌన్‌లోడ్ చేసుకున్నారని నిర్ధారించుకోండి!'
      : '⚠️ DANGER: Are you sure you want to completely erase ALL customer loans and payment history? Please ensure you have downloaded a JSON backup first!';
    if (window.confirm(confirmText)) {
      onClearAllData();
      setRestoreStatus({
        success: true,
        message: lang === 'te' ? 'అన్ని లోకల్ డేటా తొలగించబడింది.' : 'All local data cleared.',
      });
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
          <Database className="w-6 h-6 text-gold-400" />
          <span>{t('backupTitle')}</span>
        </h2>
        <p className="text-xs sm:text-sm text-gold-200/70 font-medium">
          {t('backupSubtitle')}
        </p>
      </div>

      {/* Status Message */}
      {restoreStatus && (
        <div
          className={`p-4 rounded-2xl flex items-center gap-3 border text-xs sm:text-sm font-semibold animate-slide-up ${
            restoreStatus.success
              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50'
              : 'bg-rose-950/80 text-rose-300 border-rose-500/50'
          }`}
        >
          {restoreStatus.success ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400" />
          )}
          <span>{restoreStatus.message}</span>
        </div>
      )}

      {/* Storage Health Card (Luxury Gold) */}
      <div className="bg-dark-900 rounded-3xl border border-gold-500/20 p-5 sm:p-6 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gold-500/10 text-gold-400 border border-gold-500/20 flex items-center justify-center shrink-0 shadow-glow-gold">
            <HardDrive className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-white">
              {t('localStorageStatus')}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {customers.length} {t('customers')} • {payments.length} {t('ledger')} {lang === 'te' ? 'రికార్డులు మీ పరికరంలో భద్రంగా ఉన్నాయి' : 'records safely saved on this device'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/30 font-bold text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>{lang === 'te' ? '100% సురక్షితం & ఆఫ్‌లైన్' : '100% Offline & Safe'}</span>
          </span>
        </div>
      </div>

      {/* 1. JSON Backup & Restore Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Export JSON */}
        <div className="bg-dark-900 rounded-3xl border border-gold-500/20 p-5 sm:p-6 shadow-card space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-white font-bold text-base">
              <Download className="w-5 h-5 text-gold-400" />
              <span>{t('downloadJSON')}</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {lang === 'te'
                ? 'మీ కస్టమర్లు, రుణాలు మరియు చెల్లింపుల పూర్తి సమాచారాన్ని ఒకే JSON ఫైల్ రూపంలో డౌన్‌లోడ్ చేయండి.'
                : 'Creates a single complete JSON backup file containing all your customers, active loans, and payment history.'}
            </p>
          </div>

          <button
            type="button"
            onClick={handleDownloadJSONBackup}
            className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-600 hover:to-yellow-600 active:scale-95 text-dark-950 font-black text-xs sm:text-sm rounded-xl shadow-glow-gold flex items-center justify-center gap-2 transition-all"
          >
            <Download className="w-4 h-4 stroke-[2.5]" />
            <span>{lang === 'te' ? 'బ్యాకప్ సేవ్ చేయండి (JSON)' : 'Save Backup (JSON File)'}</span>
          </button>
        </div>

        {/* Restore JSON */}
        <div className="bg-dark-900 rounded-3xl border border-gold-500/20 p-5 sm:p-6 shadow-card space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-white font-bold text-base">
              <Upload className="w-5 h-5 text-emerald-400" />
              <span>{t('restoreJSON')}</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {lang === 'te'
                ? 'గతంలో డౌన్‌లోడ్ చేసిన .json బ్యాకప్ ఫైల్‌ను అప్‌లోడ్ చేసి మీ డేటాను సులభంగా పునరుద్ధరించండి.'
                : 'Upload a previously downloaded .json backup file to restore all your customer loans.'}
            </p>
          </div>

          <div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".json"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-3 px-4 bg-dark-800 hover:bg-dark-750 active:scale-95 text-gold-400 font-bold text-xs sm:text-sm rounded-xl border border-gold-500/30 flex items-center justify-center gap-2 transition-all"
            >
              <Upload className="w-4 h-4" />
              <span>{lang === 'te' ? 'ఫైల్ ఎంచుకోండి & పునరుద్ధరించండి' : 'Select Backup File & Restore'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. CSV Exports Strip */}
      <div className="bg-dark-900 rounded-3xl border border-gold-500/20 p-5 sm:p-6 shadow-card space-y-4">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
          <h3 className="font-extrabold text-base text-white">
            Excel & Google Sheets (CSV) {t('exportCSV')}
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => exportCustomersToCSV(customers, payments)}
            className="p-3.5 rounded-2xl bg-dark-800 hover:bg-dark-750 border border-gold-500/20 text-left transition-all group"
          >
            <div className="font-bold text-xs sm:text-sm text-white group-hover:text-gold-400 transition-colors">
              👥 {lang === 'te' ? 'అన్ని కస్టమర్ల CSV' : 'All Customers CSV'}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {lang === 'te' ? 'పేర్లు, గ్రామం, బాకీలు, వసూళ్లు' : 'Names, village, balances, and due days'}
            </p>
          </button>

          <button
            type="button"
            onClick={() => exportPaymentsToCSV(payments)}
            className="p-3.5 rounded-2xl bg-dark-800 hover:bg-dark-750 border border-gold-500/20 text-left transition-all group"
          >
            <div className="font-bold text-xs sm:text-sm text-white group-hover:text-gold-400 transition-colors">
              📜 {lang === 'te' ? 'చెల్లింపుల లెడ్జర్ CSV' : 'Payment Ledger CSV'}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {lang === 'te' ? 'అన్ని రసీదుల పూర్తి ఆడిట్ లాగ్' : 'Audit log of all collection receipts'}
            </p>
          </button>

          <button
            type="button"
            onClick={() => exportTodayCollectionSheetToCSV(customers, payments)}
            className="p-3.5 rounded-2xl bg-dark-800 hover:bg-dark-750 border border-gold-500/20 text-left transition-all group"
          >
            <div className="font-bold text-xs sm:text-sm text-white group-hover:text-gold-400 transition-colors">
              ⚡ {lang === 'te' ? 'నేటి కలెక్షన్ షీట్ CSV' : "Today's Run Sheet CSV"}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {lang === 'te' ? 'ఫీల్డ్ వసూళ్ల కోసం ప్రింట్ చేయదగిన షీట్' : "Field sheet with today's targets"}
            </p>
          </button>
        </div>
      </div>

      {/* 3. Demo Data & Reset Actions */}
      <div className="bg-dark-900 rounded-3xl border border-gold-500/20 p-5 sm:p-6 shadow-card space-y-4">
        <h3 className="font-extrabold text-base text-white">
          {lang === 'te' ? 'డేటా నిర్వహణ & రీసెట్' : 'Data Management & Reset'}
        </h3>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
          <button
            type="button"
            onClick={() => {
              const confirmMsg = lang === 'te'
                ? 'నమూనా గ్రామీణ కస్టమర్ల డేటాను లోడ్ చేయాలనుకుంటున్నారా? (ప్రస్తుత రికార్డులు భర్తీ చేయబడతాయి)'
                : 'Load sample village customer dataset? (Existing records will be replaced)';
              if (window.confirm(confirmMsg)) {
                onLoadDemoData();
                setRestoreStatus({
                  success: true,
                  message: lang === 'te' ? 'నమూనా డేటా విజయవంతంగా లోడ్ అయింది!' : 'Realistic demo data loaded successfully!',
                });
              }
            }}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-dark-800 hover:bg-dark-750 border border-gold-500/20 text-gold-400 font-bold text-xs flex items-center justify-center gap-2 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            <span>{t('loadDemoData')}</span>
          </button>

          <button
            type="button"
            onClick={handleClear}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/60 border border-rose-500/30 text-rose-400 font-bold text-xs flex items-center justify-center gap-2 transition-all"
          >
            <Trash2 className="w-4 h-4" />
            <span>{t('clearAllData')}</span>
          </button>
        </div>
      </div>

      {/* 4. Giri-Giri Business Math Explainer Card */}
      <div className="rounded-3xl bg-gradient-to-br from-dark-850 via-dark-900 to-black text-white p-6 shadow-2xl space-y-3 border border-gold-500/30">
        <div className="flex items-center gap-2 text-gold-400 font-extrabold text-sm uppercase tracking-wide">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>{lang === 'te' ? 'గిరి-గిరి ప్రామాణిక వ్యాపార గణన సూత్రాలు' : 'Giri-Giri Standard Calculation Rules'}</span>
        </div>

        <div className="text-xs text-slate-300 space-y-2 leading-relaxed font-mono">
          <div className="p-3 bg-dark-950/90 rounded-2xl border border-gold-500/20">
            <p className="text-gold-400 font-bold">1. {lang === 'te' ? 'ఫైనాన్స్ మొత్తం (అసలు F): ఉదా. ₹1,00,000' : 'Finance Amount (Principal F): e.g. ₹1,00,000'}</p>
            <p>• {lang === 'te' ? '10% ముందస్తు కట్ = ₹10,000 (ఫైనాన్షియర్ వెంటనే తీసుకునే లాభం)' : '10% Upfront Cut = ₹10,000 (Financier instant profit pocketed upfront)'}</p>
            <p>• {lang === 'te' ? 'చేతికి ఇచ్చే నగదు = ₹90,000 (కస్టమర్‌కు ఇచ్చిన 90% అసలు)' : 'Actual Cash Given = ₹90,000 (Given in cash to borrower)'}</p>
            <p>• {lang === 'te' ? 'రోజువారీ వసూలు = ₹1,000 / రోజుకు (100 రోజుల పాటు ₹1,00,000 లో 1%)' : 'Daily Collection = ₹1,000 / day (1% of ₹1,00,000 for 100 days)'}</p>
          </div>
          <div className="p-3 bg-dark-950/90 rounded-2xl border border-gold-500/20">
            <p className="text-amber-400 font-bold">2. {lang === 'te' ? 'డబ్బుల విభజన సూత్రం (Money Separation Rule):' : 'Money Separation Rule:'}</p>
            <p>• {lang === 'te' ? 'ముందస్తు ₹10,000 లాభం రోజువారీ వసూళ్ల లెక్కలో కలపబడదు.' : 'The ₹10,000 upfront profit is never mixed into daily repayments.'}</p>
            <p>• {lang === 'te' ? 'కస్టమర్ రుణం పూర్తి రికవరీ కేవలం ₹1,000 రోజువారీ వసూళ్ల ఆధారంగానే లెక్కించబడుతుంది.' : 'Daily repayment progress is purely based on customer daily collections.'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

