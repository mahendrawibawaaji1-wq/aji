import { useEffect } from 'react';
import { BellRing, Check, Clock } from 'lucide-react';
import { stopRepeatingAlarm } from '../utils/audioAlarm';

interface AlarmModalProps {
  alarmData: {
    title: string;
    time: string;
    source: 'daily-alarm' | 'task';
  } | null;
  onDismiss: () => void;
  onSnooze: () => void;
}

export function AlarmModal({ alarmData, onDismiss, onSnooze }: AlarmModalProps) {
  useEffect(() => {
    return () => {
      stopRepeatingAlarm();
    };
  }, []);

  if (!alarmData) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl sm:rounded-3xl max-w-sm w-full p-5 sm:p-6 text-center shadow-xl border border-stone-200 space-y-4">
        {/* Pulsing Bell Icon */}
        <div className="w-14 sm:w-16 h-14 sm:h-16 mx-auto rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 animate-bounce">
          <BellRing className="w-7 sm:w-8 h-7 sm:h-8" />
        </div>

        <div>
          <span className="text-[11px] font-mono tracking-wider text-amber-700 uppercase font-semibold">
            {alarmData.source === 'daily-alarm' ? 'Alarm Pengingat Rutin' : 'Pengingat Tugas'}
          </span>
          <h2 className="font-serif-diary text-xl sm:text-2xl font-bold text-stone-900 mt-1">
            {alarmData.title}
          </h2>
          <div className="flex items-center justify-center gap-1.5 text-stone-500 text-xs font-mono mt-1">
            <Clock className="w-3.5 h-3.5" />
            <span>Pukul {alarmData.time}</span>
          </div>
        </div>

        <p className="text-xs text-stone-600 leading-relaxed">
          Waktunya berhenti sejenak, periksa agenda harian, atau selesaikan tugas yang sudah terjadwal.
        </p>

        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={onSnooze}
            className="flex-1 py-3 px-3 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors cursor-pointer min-h-[44px]"
          >
            Tunda 5 Menit
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="flex-1 py-3 px-3 text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 rounded-xl transition-colors shadow-xs cursor-pointer min-h-[44px]"
          >
            Matikan Alarm
          </button>
        </div>
      </div>
    </div>
  );
}
