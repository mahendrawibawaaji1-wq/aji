import { useState, useEffect } from 'react';
import { 
  BookOpen, 
  CheckSquare, 
  TrendingUp, 
  Calendar as CalendarIcon, 
  Bell, 
  Settings, 
  Download,
  CalendarCheck,
  Volume2,
  Smartphone
} from 'lucide-react';
import { playAlarmSound } from '../utils/audioAlarm';

interface HeaderProps {
  activeTab: 'diary' | 'tasks' | 'finance' | 'calendar';
  setActiveTab: (tab: 'diary' | 'tasks' | 'finance' | 'calendar') => void;
  openBackupModal: () => void;
  openPermissionsModal: () => void;
  pendingTasksCount: number;
  hasActiveAlarms: boolean;
  onSyncAllToCalendar: () => void;
}

export function Header({
  activeTab,
  setActiveTab,
  openBackupModal,
  openPermissionsModal,
  pendingTasksCount,
  hasActiveAlarms,
  onSyncAllToCalendar,
}: HeaderProps) {
  const [currentDateFormatted, setCurrentDateFormatted] = useState<string>('');
  const [currentTimeFormatted, setCurrentTimeFormatted] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentDateFormatted(
        now.toLocaleDateString('id-ID', {
          weekday: 'long',
          day: 'numeric',
          month: 'short',
        })
      );
      setCurrentTimeFormatted(
        now.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-[#faf9f6]/95 backdrop-blur-md border-b border-stone-200/80">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Brand Identity */}
          <div className="flex items-center gap-3">
            <button 
              type="button" 
              onClick={() => setActiveTab('diary')}
              className="text-left group cursor-pointer"
            >
              <div className="flex items-baseline gap-2">
                <span className="font-serif-diary text-2xl font-bold tracking-tight text-stone-900 group-hover:text-stone-700 transition-colors">
                  AJI
                </span>
                <span className="text-[11px] font-mono tracking-widest uppercase text-stone-400 font-semibold hidden md:inline">
                  Catatan Harian
                </span>
              </div>
            </button>
          </div>

          {/* Center Segmented Nav Tabs (Desktop & Tablet) */}
          <nav className="hidden sm:flex items-center p-1 bg-stone-200/60 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('diary')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'diary'
                  ? 'bg-white text-stone-900 shadow-[0_1px_3px_rgba(0,0,0,0.06)] font-semibold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <BookOpen className="w-4 h-4 text-stone-700" />
              <span>Diary & Jurnal</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('tasks')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'tasks'
                  ? 'bg-white text-stone-900 shadow-[0_1px_3px_rgba(0,0,0,0.06)] font-semibold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <CheckSquare className="w-4 h-4 text-stone-700" />
              <span>Tugas & Alarm</span>
              {pendingTasksCount > 0 && (
                <span className="font-mono text-[11px] text-stone-600 bg-stone-100 px-1.5 py-0.5 rounded-md font-bold">
                  {pendingTasksCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('finance')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'finance'
                  ? 'bg-white text-stone-900 shadow-[0_1px_3px_rgba(0,0,0,0.06)] font-semibold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <TrendingUp className="w-4 h-4 text-stone-700" />
              <span>Keuangan</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('calendar')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'calendar'
                  ? 'bg-white text-stone-900 shadow-[0_1px_3px_rgba(0,0,0,0.06)] font-semibold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <CalendarIcon className="w-4 h-4 text-stone-700" />
              <span>Kalender</span>
            </button>
          </nav>

          {/* Right Tools & Live Clock */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            <div className="hidden lg:flex flex-col text-right font-mono text-xs text-stone-500 pr-2 border-r border-stone-200">
              <span className="text-stone-800 font-semibold">{currentTimeFormatted}</span>
              <span className="text-[10px] text-stone-400">{currentDateFormatted}</span>
            </div>

            {/* Device Permissions Manager */}
            <button
              type="button"
              onClick={openPermissionsModal}
              className="flex items-center gap-1.5 px-2.5 py-2 sm:py-1.5 text-xs font-semibold text-stone-700 hover:text-stone-900 bg-stone-100 hover:bg-stone-200/80 rounded-xl transition-colors cursor-pointer min-h-[40px]"
              title="Pengelola Izin Perangkat (Kamera, Lokasi, Kontak, Kalender, Notifikasi, Foto, Jam, Berkas)"
            >
              <Smartphone className="w-3.5 h-3.5 text-stone-800" />
              <span className="text-xs">Izin HP</span>
            </button>

            {/* Test Zen Alarm sound */}
            <button
              type="button"
              onClick={() => playAlarmSound('zen-bell')}
              className="p-2 sm:p-2 text-stone-500 hover:text-stone-800 hover:bg-stone-200/60 rounded-xl transition-colors cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
              title="Uji coba nada bel hening (Zen Bell)"
            >
              <Volume2 className="w-4 h-4" />
            </button>

            {/* Export .ics calendar button */}
            <button
              type="button"
              onClick={onSyncAllToCalendar}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:text-stone-900 bg-white border border-stone-200 hover:border-stone-300 rounded-lg transition-colors shadow-2xs cursor-pointer min-h-[36px]"
              title="Sinkronkan jadwal tugas ke berkas Kalender (.ics)"
            >
              <CalendarCheck className="w-3.5 h-3.5 text-stone-800" />
              <span>Sinkron Kalender</span>
            </button>

            {/* Backup & Settings modal */}
            <button
              type="button"
              onClick={openBackupModal}
              className="p-2 text-stone-500 hover:text-stone-800 hover:bg-stone-200/60 rounded-xl transition-colors cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
              title="Setelan Penyimpanan & Cadangan (Google Drive & Lokal)"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>
    </header>
  );
}
