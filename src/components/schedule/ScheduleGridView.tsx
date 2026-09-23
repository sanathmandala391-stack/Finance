import React, { useState } from 'react';
import { Customer, DayScheduleItem } from '../../types/finance';
import { StatusBadge } from '../common/StatusBadge';
import { formatINR } from '../../utils/currency';
import { formatDisplayDate, formatDayOfWeek } from '../../utils/dateUtils';
import { useLanguage } from '../../hooks/useLanguage';
import { Grid, List } from 'lucide-react';

interface ScheduleGridViewProps {
  customer: Customer;
  schedule: DayScheduleItem[];
  onSelectDay: (dayItem: DayScheduleItem) => void;
}

export const ScheduleGridView: React.FC<ScheduleGridViewProps> = ({
  schedule,
  onSelectDay,
}) => {
  const { t } = useLanguage();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const filteredSchedule = schedule.filter((item) => {
    if (filterStatus === 'ALL') return true;
    if (filterStatus === 'PAID') return item.status === 'PAID' || item.status === 'PAID_LATE';
    if (filterStatus === 'DUE') return item.status === 'DUE';
    if (filterStatus === 'TODAY') return item.isToday;
    if (filterStatus === 'UPCOMING') return item.status === 'UPCOMING';
    if (filterStatus === 'PARTIAL') return item.status === 'PARTIAL';
    return true;
  });

  const getStatusBorder = (status: string, isToday: boolean) => {
    if (isToday) return 'border-amber-400 bg-amber-950/40 ring-2 ring-amber-400/40';
    switch (status) {
      case 'PAID':
        return 'border-emerald-500/40 bg-emerald-950/20 hover:border-emerald-400';
      case 'DUE':
        return 'border-rose-500/40 bg-rose-950/20 hover:border-rose-400';
      case 'PAID_LATE':
        return 'border-sky-500/40 bg-sky-950/20 hover:border-sky-400';
      case 'PARTIAL':
        return 'border-orange-500/40 bg-orange-950/20 hover:border-orange-400';
      case 'TODAY_PENDING':
        return 'border-amber-400/60 bg-amber-950/30 hover:border-amber-400';
      case 'UPCOMING':
      default:
        return 'border-dark-750 bg-dark-900 hover:border-gold-500/40';
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-dark-900 p-3 rounded-2xl border border-gold-500/20">
        {/* Status Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setFilterStatus('ALL')}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              filterStatus === 'ALL'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-dark-950 font-black shadow-glow-gold'
                : 'bg-dark-850 text-slate-300 hover:text-white border border-dark-750'
            }`}
          >
            100 {t('day')}
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('PAID')}
            className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
              filterStatus === 'PAID'
                ? 'bg-emerald-600 text-white font-bold shadow-sm'
                : 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30'
            }`}
          >
            <span>🟢</span> {t('paid')}
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('DUE')}
            className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
              filterStatus === 'DUE'
                ? 'bg-rose-600 text-white font-bold shadow-sm'
                : 'bg-rose-950/60 text-rose-300 border border-rose-500/30'
            }`}
          >
            <span>🔴</span> {t('due')}
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('PARTIAL')}
            className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
              filterStatus === 'PARTIAL'
                ? 'bg-orange-600 text-white font-bold shadow-sm'
                : 'bg-orange-950/60 text-orange-300 border border-orange-500/30'
            }`}
          >
            <span>🟠</span> {t('partial')}
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('UPCOMING')}
            className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
              filterStatus === 'UPCOMING'
                ? 'bg-slate-700 text-white font-bold'
                : 'bg-dark-850 text-slate-400 border border-dark-750'
            }`}
          >
            <span>⚪</span> {t('upcoming')}
          </button>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1 bg-dark-850 p-1 rounded-xl border border-dark-750 shrink-0">
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-lg transition-all ${
              viewMode === 'grid'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-dark-950 shadow-sm font-black'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Grid Matrix View"
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-lg transition-all ${
              viewMode === 'list'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-dark-950 shadow-sm font-black'
                : 'text-slate-400 hover:text-white'
            }`}
            title="List Passbook View"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Visual Status Legend */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-[11px] bg-dark-900 p-2.5 rounded-xl border border-gold-500/20">
        <div className="flex items-center gap-1 text-slate-300">
          <span>🟢</span> <span>{t('paid')}</span>
        </div>
        <div className="flex items-center gap-1 text-slate-300">
          <span>🔴</span> <span>{t('due')}</span>
        </div>
        <div className="flex items-center gap-1 text-slate-300">
          <span>🟡</span> <span>{t('todayPending')}</span>
        </div>
        <div className="flex items-center gap-1 text-slate-300">
          <span>🟠</span> <span>{t('partial')}</span>
        </div>
        <div className="flex items-center gap-1 text-slate-300">
          <span>🔵</span> <span>{t('paidLate')}</span>
        </div>
        <div className="flex items-center gap-1 text-slate-300">
          <span>⚪</span> <span>{t('upcoming')}</span>
        </div>
      </div>

      {/* MATRIX GRID VIEW */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-10 gap-2">
          {filteredSchedule.map((item) => (
            <div
              key={item.dayNumber}
              onClick={() => onSelectDay(item)}
              className={`p-2.5 rounded-xl border transition-all duration-150 cursor-pointer active:scale-95 shadow-sm hover:shadow-md flex flex-col justify-between min-h-[90px] relative ${getStatusBorder(
                item.status,
                item.isToday
              )}`}
            >
              {/* Day Header */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-white font-mono">
                  D{item.dayNumber}
                </span>
                <StatusBadge status={item.status} size="sm" showIcon={true} />
              </div>

              {/* Date */}
              <div className="my-1">
                <div className="text-[11px] font-bold text-slate-200 truncate">
                  {formatDisplayDate(item.date, false)}
                </div>
                <div className="text-[9px] text-slate-400 font-medium">
                  {formatDayOfWeek(item.date)}
                </div>
              </div>

              {/* Amount & Action Hint */}
              <div className="pt-1 border-t border-dark-750 flex items-center justify-between">
                <span className="text-[10px] font-mono font-extrabold text-gold-400">
                  {item.paidAmount > 0 ? formatINR(item.paidAmount) : formatINR(item.targetAmount)}
                </span>
                {item.remainingDue > 0 && (
                  <span className="text-[9px] text-rose-400 font-black">
                    {t('due')}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DETAILED LIST PASSBOOK VIEW */}
      {viewMode === 'list' && (
        <div className="overflow-x-auto rounded-2xl border border-gold-500/20 bg-dark-900">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-dark-850 border-b border-dark-750 text-slate-400 font-bold uppercase tracking-wider">
                <th className="p-3">{t('day')} #</th>
                <th className="p-3">{t('scheduledDate')}</th>
                <th className="p-3">{t('todaysTarget')}</th>
                <th className="p-3">{t('todaysCollected')}</th>
                <th className="p-3">Paid Date</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-750">
              {filteredSchedule.map((item) => (
                <tr
                  key={item.dayNumber}
                  className={`hover:bg-dark-850 transition-colors ${
                    item.isToday ? 'bg-amber-950/20 font-medium' : ''
                  }`}
                >
                  <td className="p-3 font-mono font-bold text-white">
                    Day {item.dayNumber}
                  </td>
                  <td className="p-3 font-medium text-slate-200">
                    {formatDisplayDate(item.date)} ({formatDayOfWeek(item.date)})
                  </td>
                  <td className="p-3 font-mono font-bold text-slate-300">
                    {formatINR(item.targetAmount)}
                  </td>
                  <td className="p-3 font-mono font-bold text-emerald-400">
                    {item.paidAmount > 0 ? formatINR(item.paidAmount) : '-'}
                  </td>
                  <td className="p-3 text-slate-400 font-mono">
                    {item.lastPaidDate ? formatDisplayDate(item.lastPaidDate) : '-'}
                  </td>
                  <td className="p-3">
                    <StatusBadge status={item.status} size="sm" />
                  </td>
                  <td className="p-3 text-right">
                    <button
                      type="button"
                      onClick={() => onSelectDay(item)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        item.remainingDue > 0
                          ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-dark-950 font-black shadow-sm'
                          : 'bg-dark-850 text-slate-300 hover:bg-dark-800'
                      }`}
                    >
                      {item.remainingDue > 0 ? t('confirmPayment') : 'View'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
