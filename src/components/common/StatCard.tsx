import React, { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  iconBgColor?: string;
  iconColor?: string;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  onClick?: () => void;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  iconBgColor = 'bg-gold-500/10 border border-gold-500/30',
  iconColor = 'text-gold-400',
  trend,
  onClick,
  className = '',
}) => {
  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden bg-gradient-to-b from-dark-850 to-dark-900 border border-gold-500/20 hover:border-gold-500/50 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-card hover:shadow-card-hover transition-all duration-300 ${
        onClick ? 'cursor-pointer active:scale-[0.99]' : ''
      } ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {value}
            </h3>
          </div>
          {subtitle && (
            <p className="text-[11px] sm:text-xs text-slate-400 font-medium">
              {subtitle}
            </p>
          )}
        </div>
        <div
          className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shrink-0 ${iconBgColor} ${iconColor} shadow-inner`}
        >
          {icon}
        </div>
      </div>

      {trend && (
        <div className="mt-3 pt-3 border-t border-dark-750 flex items-center justify-between text-xs">
          <span
            className={`font-semibold inline-flex items-center gap-1 ${
              trend.isPositive
                ? 'text-emerald-400'
                : 'text-amber-400'
            }`}
          >
            {trend.value}
          </span>
        </div>
      )}
    </div>
  );
};
