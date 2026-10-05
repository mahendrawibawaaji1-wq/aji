import { useState, useMemo } from 'react';
import { DiaryEntry, TaskItem, FinanceRecord } from '../types';
import { 
  ChevronLeft, 
  ChevronRight, 
  BookOpen, 
  CheckSquare, 
  TrendingDown, 
  Plus, 
  Calendar as CalIcon,
  CalendarCheck,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { formatRupiah, generateIcsFileContent, downloadFile, getLocalDateString } from '../utils/calendarSync';

interface CalendarViewProps {
  diaryEntries: DiaryEntry[];
  tasks: TaskItem[];
  financeRecords: FinanceRecord[];
  onOpenNewDiary: (date: string) => void;
  onOpenNewTask: (date: string) => void;
  onOpenNewFinance: (date: string) => void;
}

export function CalendarView({
  diaryEntries,
  tasks,
  financeRecords,
  onOpenNewDiary,
  onOpenNewTask,
  onOpenNewFinance,
}: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(() => getLocalDateString());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDateStr(getLocalDateString(now));
  };

  const monthTitle = useMemo(() => {
    return currentDate.toLocaleDateString('id-ID', {
      month: 'long',
      year: 'numeric',
    });
  }, [currentDate]);

  // Days matrix for the calendar month
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const totalDays = lastDayOfMonth.getDate();
    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const days: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];

    // Preceding days from previous month
    const prevMonthLastDate = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const prevDate = new Date(year, month - 1, prevMonthLastDate - i);
      days.push({
        dateStr: getLocalDateString(prevDate),
        dayNum: prevMonthLastDate - i,
        isCurrentMonth: false,
      });
    }

    // Days of current month
    for (let d = 1; d <= totalDays; d++) {
      const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dateStr: dStr,
        dayNum: d,
        isCurrentMonth: true,
      });
    }

    // Fill remaining days
    const remaining = 42 - days.length;
    if (remaining < 7) {
      for (let next = 1; next <= remaining; next++) {
        const nextDate = new Date(year, month + 1, next);
        days.push({
          dateStr: getLocalDateString(nextDate),
          dayNum: next,
          isCurrentMonth: false,
        });
      }
    }

    return days;
  }, [year, month]);

  // Selected Day Details
  const selectedDayDiary = useMemo(() => {
    return diaryEntries.filter((d) => d.date === selectedDateStr);
  }, [diaryEntries, selectedDateStr]);

  const selectedDayTasks = useMemo(() => {
    return tasks.filter((t) => t.dueDate === selectedDateStr);
  }, [tasks, selectedDateStr]);

  const selectedDayFinance = useMemo(() => {
    return financeRecords.filter((f) => f.date === selectedDateStr);
  }, [financeRecords, selectedDateStr]);

  const selectedDayTotalExpense = useMemo(() => {
    return selectedDayFinance
      .filter((f) => f.type === 'expense')
      .reduce((sum, f) => sum + f.amount, 0);
  }, [selectedDayFinance]);

  const handleExportMonthToIcs = () => {
    const monthTasks = tasks.filter((t) => t.dueDate.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`));
    const ics = generateIcsFileContent(monthTasks.length > 0 ? monthTasks : tasks);
    downloadFile(`aji-kalender-${year}-${month + 1}.ics`, ics);
  };

  const dayOfWeekNames = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-stone-200">
        <div>
          <h1 className="font-serif-diary text-3xl font-semibold text-stone-900 tracking-tight">
            Kalender Terpadu
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            Pandangan menyeluruh yang menyatukan diary, jadwal tugas, dan pengeluaran harianmu.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end mt-2 sm:mt-0">
          <button
            type="button"
            onClick={handleToday}
            className="px-3.5 py-2 sm:py-1.5 text-xs font-semibold bg-white text-stone-700 border border-stone-200 hover:bg-stone-50 rounded-xl transition-colors shadow-2xs cursor-pointer min-h-[40px]"
          >
            Hari Ini
          </button>

          <button
            type="button"
            onClick={handleExportMonthToIcs}
            className="flex items-center gap-1.5 px-3.5 py-2 sm:py-1.5 text-xs font-semibold bg-stone-900 text-stone-50 rounded-xl hover:bg-stone-800 transition-colors shadow-2xs cursor-pointer min-h-[40px]"
            title="Ekspor kalender .ics untuk Google Calendar, Apple Calendar, Outlook"
          >
            <CalendarCheck className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ekspor Kalender (.ics)</span>
            <span className="sm:hidden">Ekspor .ics</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Matrix View */}
        <div className="lg:col-span-2 bg-white border border-stone-200/90 rounded-2xl p-3 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          {/* Calendar Header with Navigation */}
          <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-stone-100 mb-3 sm:mb-4">
            <h2 className="font-serif-diary text-xl sm:text-2xl font-bold text-stone-900 capitalize">
              {monthTitle}
            </h2>

            <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-2 sm:p-1.5 text-stone-600 hover:text-stone-900 rounded-lg hover:bg-white transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-2 sm:p-1.5 text-stone-600 hover:text-stone-900 rounded-lg hover:bg-white transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 text-center mb-1 sm:mb-2">
            {dayOfWeekNames.map((d) => (
              <span key={d} className="text-[11px] sm:text-xs font-semibold text-stone-400 py-1">
                {d}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((item) => {
              const isSelected = item.dateStr === selectedDateStr;
              const isToday = item.dateStr === getLocalDateString();

              const dayDiaryCount = diaryEntries.filter((d) => d.date === item.dateStr).length;
              const dayTasks = tasks.filter((t) => t.dueDate === item.dateStr);
              const dayPendingTasks = dayTasks.filter((t) => !t.completed).length;
              const dayExpenses = financeRecords
                .filter((f) => f.date === item.dateStr && f.type === 'expense')
                .reduce((s, f) => s + f.amount, 0);

              return (
                <button
                  type="button"
                  key={item.dateStr}
                  onClick={() => setSelectedDateStr(item.dateStr)}
                  className={`min-h-[50px] sm:min-h-[86px] p-1 sm:p-2 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                    isSelected
                      ? 'border-stone-900 bg-stone-50/90 shadow-2xs ring-1 ring-stone-900'
                      : isToday
                      ? 'border-stone-400 bg-stone-50/50 hover:border-stone-500'
                      : item.isCurrentMonth
                      ? 'border-stone-100 hover:border-stone-300 bg-white'
                      : 'border-transparent text-stone-300 bg-stone-50/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[11px] sm:text-xs font-mono font-medium ${
                        isToday
                          ? 'w-5 h-5 rounded-full bg-stone-900 text-white flex items-center justify-center text-[10px] font-bold'
                          : isSelected
                          ? 'text-stone-900 font-bold'
                          : item.isCurrentMonth
                          ? 'text-stone-800'
                          : 'text-stone-300'
                      }`}
                    >
                      {item.dayNum}
                    </span>

                    {dayPendingTasks > 0 && (
                      <span className="text-[9px] sm:text-[10px] font-mono text-stone-600 bg-stone-200/80 px-1 py-0.2 rounded font-bold">
                        {dayPendingTasks}
                      </span>
                    )}
                  </div>

                  {/* Mobile Dot Indicators */}
                  <div className="flex sm:hidden items-center justify-center gap-1 mt-1">
                    {dayDiaryCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                    {dayTasks.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-stone-800" />}
                    {dayExpenses > 0 && <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />}
                  </div>

                  {/* Desktop Indicators */}
                  <div className="hidden sm:block space-y-0.5 mt-1">
                    {dayDiaryCount > 0 && (
                      <div className="flex items-center gap-1 text-[10px] text-amber-700 truncate font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                        <span className="text-[9px] font-sans">Diary</span>
                      </div>
                    )}

                    {dayTasks.length > 0 && (
                      <div className="flex items-center gap-1 text-[10px] text-stone-700 truncate font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-stone-800 shrink-0" />
                        <span className="text-[9px] font-sans">
                          {dayTasks.length} Tugas
                        </span>
                      </div>
                    )}

                    {dayExpenses > 0 && (
                      <div className="flex items-center gap-1 text-[10px] text-rose-600 truncate font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                        <span className="text-[9px] font-mono font-semibold">
                          {formatRupiah(dayExpenses)}
                        </span>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-stone-500 pt-4 mt-3 border-t border-stone-100">
            <span className="text-stone-400">Petunjuk:</span>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Diary</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-stone-800" />
              <span>Tugas</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>Pengeluaran</span>
            </div>
          </div>
        </div>

        {/* Selected Day Timeline Sheet */}
        <div className="bg-white border border-stone-200/90 rounded-2xl p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-5">
          <div className="pb-3 border-b border-stone-100">
            <span className="text-[11px] text-stone-400 font-mono uppercase tracking-wider font-semibold">
              Rincian Hari
            </span>
            <h3 className="font-serif-diary text-xl font-bold text-stone-900 mt-0.5">
              {new Date(selectedDateStr).toLocaleDateString('id-ID', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </h3>
          </div>

          {/* Section: Diary on this date */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-900">
                <BookOpen className="w-3.5 h-3.5 text-stone-700" />
                <span>Diary ({selectedDayDiary.length})</span>
              </div>
              <button
                type="button"
                onClick={() => onOpenNewDiary(selectedDateStr)}
                className="text-[11px] text-stone-700 hover:text-stone-900 font-medium cursor-pointer"
              >
                + Tulis
              </button>
            </div>

            {selectedDayDiary.length === 0 ? (
              <p className="text-xs text-stone-400 italic py-2">
                Tidak ada tulisan diary pada tanggal ini.
              </p>
            ) : (
              <div className="space-y-2">
                {selectedDayDiary.map((d) => (
                  <div key={d.id} className="p-3 bg-stone-50/80 rounded-xl border border-stone-200/70">
                    <p className="text-xs font-semibold text-stone-900">{d.title}</p>
                    <p className="text-xs text-stone-600 line-clamp-2 mt-1 font-serif-diary">
                      {d.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section: Tasks on this date */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-900">
                <CheckSquare className="w-3.5 h-3.5 text-stone-700" />
                <span>Tugas ({selectedDayTasks.length})</span>
              </div>
              <button
                type="button"
                onClick={() => onOpenNewTask(selectedDateStr)}
                className="text-[11px] text-stone-700 hover:text-stone-900 font-medium cursor-pointer"
              >
                + Tambah
              </button>
            </div>

            {selectedDayTasks.length === 0 ? (
              <p className="text-xs text-stone-400 italic py-2">
                Tidak ada tugas terjadwal untuk hari ini.
              </p>
            ) : (
              <div className="space-y-2">
                {selectedDayTasks.map((t) => (
                  <div
                    key={t.id}
                    className="p-2.5 bg-stone-50/80 rounded-xl border border-stone-200/70 flex items-center justify-between"
                  >
                    <div>
                      <p
                        className={`text-xs font-medium ${
                          t.completed ? 'line-through text-stone-400' : 'text-stone-900 font-semibold'
                        }`}
                      >
                        {t.title}
                      </p>
                      <p className="text-[11px] font-mono text-stone-400 mt-0.5">
                        {t.dueTime ? `Pukul ${t.dueTime}` : 'Sepanjang hari'} · Prioritas {t.priority}
                      </p>
                    </div>
                    {t.completed && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section: Expenses on this date */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-900">
                <TrendingDown className="w-3.5 h-3.5 text-stone-700" />
                <span>Pengeluaran ({selectedDayFinance.length})</span>
              </div>
              <button
                type="button"
                onClick={() => onOpenNewFinance(selectedDateStr)}
                className="text-[11px] text-stone-700 hover:text-stone-900 font-medium cursor-pointer"
              >
                + Catat
              </button>
            </div>

            {selectedDayFinance.length === 0 ? (
              <p className="text-xs text-stone-400 italic py-2">
                Belum ada transaksi di tanggal ini.
              </p>
            ) : (
              <div className="space-y-2">
                <div className="text-xs text-stone-500 flex justify-between pb-1">
                  <span>Total Pengeluaran:</span>
                  <strong className="font-mono text-stone-900">
                    {formatRupiah(selectedDayTotalExpense)}
                  </strong>
                </div>
                {selectedDayFinance.map((f) => (
                  <div
                    key={f.id}
                    className="text-xs flex items-center justify-between py-1 border-t border-stone-100"
                  >
                    <span className="text-stone-700">{f.category}</span>
                    <span
                      className={`font-mono font-medium ${
                        f.type === 'expense' ? 'text-stone-800' : 'text-emerald-600'
                      }`}
                    >
                      {f.type === 'expense' ? '-' : '+'} {formatRupiah(f.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
