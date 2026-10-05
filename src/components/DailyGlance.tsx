import { useMemo } from 'react';
import { CheckCircle2, TrendingDown, BookOpen, Plus, Clock, Sparkles } from 'lucide-react';
import { DiaryEntry, TaskItem, FinanceRecord } from '../types';
import { formatRupiah } from '../utils/calendarSync';

interface DailyGlanceProps {
  todayStr: string;
  diaryEntries: DiaryEntry[];
  tasks: TaskItem[];
  financeRecords: FinanceRecord[];
  onOpenNewDiary: () => void;
  onOpenNewTask: () => void;
  onOpenNewFinance: () => void;
}

export function DailyGlance({
  todayStr,
  diaryEntries,
  tasks,
  financeRecords,
  onOpenNewDiary,
  onOpenNewTask,
  onOpenNewFinance,
}: DailyGlanceProps) {
  // Determine greeting based on local hour
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 4 && hour < 11) return 'Selamat Pagi';
    if (hour >= 11 && hour < 15) return 'Selamat Siang';
    if (hour >= 15 && hour < 19) return 'Selamat Sore';
    return 'Selamat Malam';
  }, []);

  // Today metrics
  const todayTasks = useMemo(() => tasks.filter((t) => t.dueDate === todayStr), [tasks, todayStr]);
  const completedTodayTasks = todayTasks.filter((t) => t.completed).length;
  const taskProgressPercent = todayTasks.length > 0 ? Math.round((completedTodayTasks / todayTasks.length) * 100) : 100;

  const todayExpenses = useMemo(() => {
    return financeRecords
      .filter((f) => f.date === todayStr && f.type === 'expense')
      .reduce((sum, f) => sum + f.amount, 0);
  }, [financeRecords, todayStr]);

  const hasWrittenDiaryToday = useMemo(() => {
    return diaryEntries.some((d) => d.date === todayStr);
  }, [diaryEntries, todayStr]);

  const todayFormatted = useMemo(() => {
    return new Date(todayStr).toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, [todayStr]);

  return (
    <div className="bg-white border border-stone-200/90 rounded-2xl p-5 sm:p-6 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)] mb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-stone-100">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-wider text-stone-400 font-semibold">
            {todayFormatted}
          </span>
          <h2 className="font-serif-diary text-2xl sm:text-3xl font-semibold text-stone-900 tracking-tight mt-0.5">
            {greeting}, mari selaraskan harimu.
          </h2>
        </div>

        {/* Quick entry buttons */}
        <div className="grid grid-cols-3 gap-2 w-full sm:w-auto mt-3 sm:mt-0">
          <button
            type="button"
            onClick={onOpenNewDiary}
            className="flex items-center justify-center gap-1.5 px-2.5 py-2 text-xs font-semibold text-stone-700 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-xl transition-colors cursor-pointer min-h-[42px]"
          >
            <Plus className="w-3.5 h-3.5 text-stone-500 shrink-0" />
            <span className="truncate">Diary</span>
          </button>
          <button
            type="button"
            onClick={onOpenNewTask}
            className="flex items-center justify-center gap-1.5 px-2.5 py-2 text-xs font-semibold text-stone-700 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-xl transition-colors cursor-pointer min-h-[42px]"
          >
            <Plus className="w-3.5 h-3.5 text-stone-500 shrink-0" />
            <span className="truncate">Tugas</span>
          </button>
          <button
            type="button"
            onClick={onOpenNewFinance}
            className="flex items-center justify-center gap-1.5 px-2.5 py-2 text-xs font-semibold text-stone-700 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-xl transition-colors cursor-pointer min-h-[42px]"
          >
            <Plus className="w-3.5 h-3.5 text-stone-500 shrink-0" />
            <span className="truncate">Belanja</span>
          </button>
        </div>
      </div>

      {/* 3 Pillar Summary Cards for Today */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
        {/* Tugas Hari Ini */}
        <div className="p-3.5 bg-stone-50/70 rounded-xl border border-stone-200/60">
          <div className="flex items-center justify-between text-xs text-stone-500">
            <span className="font-medium">Tugas Hari Ini</span>
            <CheckCircle2 className="w-4 h-4 text-stone-600" />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="font-mono text-xl font-bold text-stone-900">
              {completedTodayTasks}/{todayTasks.length}
            </span>
            <span className="text-xs text-stone-500">selesai</span>
          </div>
          <div className="w-full bg-stone-200 rounded-full h-1 mt-2.5 overflow-hidden">
            <div
              className="bg-stone-900 h-full rounded-full transition-all duration-300"
              style={{ width: `${todayTasks.length > 0 ? taskProgressPercent : 0}%` }}
            />
          </div>
        </div>

        {/* Pengeluaran Hari Ini */}
        <div className="p-3.5 bg-stone-50/70 rounded-xl border border-stone-200/60">
          <div className="flex items-center justify-between text-xs text-stone-500">
            <span className="font-medium">Pengeluaran Hari Ini</span>
            <TrendingDown className="w-4 h-4 text-stone-600" />
          </div>
          <div className="mt-2">
            <span className="font-mono text-xl font-bold text-stone-900">
              {formatRupiah(todayExpenses)}
            </span>
          </div>
          <p className="text-[11px] text-stone-400 mt-1">
            {financeRecords.filter((f) => f.date === todayStr && f.type === 'expense').length} transaksi tercatat
          </p>
        </div>

        {/* Status Diary Hari Ini */}
        <div className="p-3.5 bg-stone-50/70 rounded-xl border border-stone-200/60">
          <div className="flex items-center justify-between text-xs text-stone-500">
            <span className="font-medium">Jurnal & Diary</span>
            <BookOpen className="w-4 h-4 text-stone-600" />
          </div>
          <div className="mt-2">
            <span className="text-sm font-semibold text-stone-900">
              {hasWrittenDiaryToday ? 'Sudah ditorehkan ✓' : 'Belum ada catatan hari ini'}
            </span>
          </div>
          <p className="text-[11px] text-stone-400 mt-1">
            {hasWrittenDiaryToday
              ? 'Pikiran dan refleksi harimu telah tersimpan rapi.'
              : 'Luangkan 3 menit untuk mengurai perasaanmu.'}
          </p>
        </div>
      </div>
    </div>
  );
}
