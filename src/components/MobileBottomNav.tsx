import { BookOpen, CheckSquare, TrendingUp, Calendar } from 'lucide-react';

interface MobileBottomNavProps {
  activeTab: 'diary' | 'tasks' | 'finance' | 'calendar';
  setActiveTab: (tab: 'diary' | 'tasks' | 'finance' | 'calendar') => void;
  pendingTasksCount: number;
}

export function MobileBottomNav({
  activeTab,
  setActiveTab,
  pendingTasksCount,
}: MobileBottomNavProps) {
  const tabs = [
    {
      id: 'diary' as const,
      label: 'Diary',
      icon: BookOpen,
    },
    {
      id: 'tasks' as const,
      label: 'Tugas',
      icon: CheckSquare,
      badge: pendingTasksCount > 0 ? pendingTasksCount : undefined,
    },
    {
      id: 'finance' as const,
      label: 'Keuangan',
      icon: TrendingUp,
    },
    {
      id: 'calendar' as const,
      label: 'Kalender',
      icon: Calendar,
    },
  ];

  return (
    <nav 
      aria-label="Navigasi Utama Ponsel"
      className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200/90 px-3 py-1 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
      style={{ paddingBottom: 'max(0.35rem, env(safe-area-inset-bottom))' }}
    >
      <div className="grid grid-cols-4 items-center">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex flex-col items-center justify-center min-h-[50px] py-1 px-1 rounded-xl transition-all cursor-pointer ${
                isActive
                  ? 'text-stone-950 font-semibold'
                  : 'text-stone-400 hover:text-stone-700 font-medium'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110 text-stone-900 stroke-[2.2]' : 'text-stone-600 stroke-[1.8]'}`} />
                {tab.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-stone-900 text-white font-mono text-[9px] font-bold flex items-center justify-center">
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] tracking-tight mt-1 ${isActive ? 'text-stone-900 font-bold' : 'text-stone-600'}`}>
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute bottom-0.5 w-1 h-1 bg-stone-900 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
