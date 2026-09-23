import React from 'react';
import {
  LayoutDashboard,
  Users,
  Sparkles,
  Receipt,
  Database,
  BarChart3,
} from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';

interface BottomNavProps {
  activeTab: string;
  onNavigate: (tab: string) => void;
  pendingCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onNavigate,
  pendingCount = 0,
}) => {
  const { t } = useLanguage();

  const navItems = [
    { id: 'dashboard', label: t('dashboard'), icon: LayoutDashboard },
    { id: 'today', label: t('todaysRun'), icon: Sparkles, badge: pendingCount > 0 ? pendingCount : undefined },
    { id: 'customers', label: t('customers'), icon: Users },
    { id: 'history', label: t('ledger'), icon: Receipt },
    { id: 'reports', label: t('reports'), icon: BarChart3 },
    { id: 'backup', label: t('backup'), icon: Database },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-dark-950/95 backdrop-blur-lg border-t border-gold-500/20 pb-safe shadow-2xl">
      <div className="grid grid-cols-6 items-center h-16 px-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`relative flex flex-col items-center justify-center py-1 rounded-xl transition-all ${
                isActive
                  ? 'text-gold-400 font-extrabold'
                  : 'text-slate-400 font-medium hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform ${
                    isActive ? 'scale-110 text-amber-400 stroke-[2.5]' : 'stroke-[1.75]'
                  }`}
                />
                {item.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-2 bg-rose-500 text-white text-[9px] font-black rounded-full px-1 min-w-[14px] h-[14px] flex items-center justify-center border-2 border-dark-950 shadow-sm animate-bounce">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[9px] sm:text-[10px] mt-1 truncate max-w-full">
                {item.label}
              </span>
              {isActive && (
                <div className="absolute bottom-0 w-8 h-1 bg-gradient-to-r from-amber-400 to-yellow-500 rounded-t-full shadow-glow-gold" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
