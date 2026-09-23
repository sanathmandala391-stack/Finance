import React from 'react';
import { ScheduleStatus } from '../../types/finance';
import { useLanguage } from '../../hooks/useLanguage';

interface StatusBadgeProps {
  status: ScheduleStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
  customText?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  showIcon = true,
  className = '',
  customText,
}) => {
  const { t } = useLanguage();

  const getBadgeConfig = () => {
    switch (status) {
      case 'PAID':
        return {
          bg: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40 shadow-sm',
          dot: 'bg-emerald-400',
          emoji: '🟢',
          label: t('paid'),
        };
      case 'DUE':
        return {
          bg: 'bg-rose-950/80 text-rose-300 border-rose-500/40 shadow-sm',
          dot: 'bg-rose-400',
          emoji: '🔴',
          label: t('due'),
        };
      case 'TODAY_PENDING':
        return {
          bg: 'bg-amber-950/80 text-amber-300 border-amber-500/50 shadow-sm animate-pulse',
          dot: 'bg-amber-400',
          emoji: '🟡',
          label: t('todayPending'),
        };
      case 'PARTIAL':
        return {
          bg: 'bg-orange-950/80 text-orange-300 border-orange-500/40 shadow-sm',
          dot: 'bg-orange-400',
          emoji: '🟠',
          label: t('partial'),
        };
      case 'PAID_LATE':
        return {
          bg: 'bg-sky-950/80 text-sky-300 border-sky-500/40 shadow-sm',
          dot: 'bg-sky-400',
          emoji: '🔵',
          label: t('paidLate'),
        };
      case 'UPCOMING':
      default:
        return {
          bg: 'bg-dark-800/80 text-slate-400 border-slate-700/60',
          dot: 'bg-slate-500',
          emoji: '⚪',
          label: t('upcoming'),
        };
    }
  };

  const config = getBadgeConfig();

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-xs font-bold px-2.5 py-1 gap-1.5',
    lg: 'text-sm font-bold px-3 py-1.5 gap-2',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border backdrop-blur-sm font-semibold tracking-wide ${sizeClasses[size]} ${config.bg} ${className}`}
    >
      {showIcon && <span className="text-[10px] leading-none">{config.emoji}</span>}
      <span>{customText || config.label}</span>
    </span>
  );
};
