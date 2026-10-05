/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { DiaryEntry, TaskItem, FinanceRecord, DailyAlarm, DevicePermissionsState } from './types';
import { 
  loadDiaryEntries, 
  saveDiaryEntries, 
  loadTasks, 
  saveTasks, 
  loadFinanceRecords, 
  saveFinanceRecords, 
  loadAlarms, 
  saveAlarms, 
  loadMonthlyBudget, 
  saveMonthlyBudget 
} from './utils/storage';
import { loadSavedPermissions, savePermissions } from './utils/devicePermissions';
import { Header } from './components/Header';
import { DailyGlance } from './components/DailyGlance';
import { DiaryView } from './components/DiaryView';
import { TaskView } from './components/TaskView';
import { FinanceView } from './components/FinanceView';
import { CalendarView } from './components/CalendarView';
import { AlarmModal } from './components/AlarmModal';
import { BackupModal } from './components/BackupModal';
import { PermissionsModal } from './components/PermissionsModal';
import { MobileBottomNav } from './components/MobileBottomNav';
import { startRepeatingAlarm, stopRepeatingAlarm } from './utils/audioAlarm';
import { generateIcsFileContent, downloadFile, getLocalDateString } from './utils/calendarSync';

export default function App() {
  const [activeTab, setActiveTab] = useState<'diary' | 'tasks' | 'finance' | 'calendar'>('diary');

  // Persistent States
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>(() => loadDiaryEntries());
  const [tasks, setTasks] = useState<TaskItem[]>(() => loadTasks());
  const [financeRecords, setFinanceRecords] = useState<FinanceRecord[]>(() => loadFinanceRecords());
  const [alarms, setAlarms] = useState<DailyAlarm[]>(() => loadAlarms());
  const [devicePermissions, setDevicePermissions] = useState<DevicePermissionsState>(() => loadSavedPermissions());
  
  const currentMonthStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const todayStr = useMemo(() => getLocalDateString(), []);

  const [monthlyBudget, setMonthlyBudget] = useState<number>(() => loadMonthlyBudget(currentMonthStr));

  // Contextual target dates when navigating from calendar or quick actions
  const [targetDateForDiary, setTargetDateForDiary] = useState<string | undefined>(undefined);
  const [targetDateForTask, setTargetDateForTask] = useState<string | undefined>(undefined);
  const [targetDateForFinance, setTargetDateForFinance] = useState<string | undefined>(undefined);
  const [isWritingInitialDiary, setIsWritingInitialDiary] = useState(false);
  const [isAddingInitialTask, setIsAddingInitialTask] = useState(false);
  const [isAddingInitialFinance, setIsAddingInitialFinance] = useState(false);

  // Modals & Triggers
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);
  const [activeTriggeredAlarm, setActiveTriggeredAlarm] = useState<{
    id: string;
    title: string;
    time: string;
    source: 'daily-alarm' | 'task';
  } | null>(null);

  // Alarm suppression tracker so the same alarm doesn't fire multiple times in the same minute
  const [triggeredAlarmsCache, setTriggeredAlarmsCache] = useState<Set<string>>(new Set());

  // Web Notification Permission
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    } else {
      setNotificationPermission('unsupported');
    }
  }, []);

  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        setNotificationPermission(perm);
      } catch (err) {
        console.warn('Could not request notification permission', err);
      }
    }
  }, []);

  // Save changes to localStorage
  useEffect(() => {
    saveDiaryEntries(diaryEntries);
  }, [diaryEntries]);

  useEffect(() => {
    saveTasks(tasks);
  }, [tasks]);

  useEffect(() => {
    saveFinanceRecords(financeRecords);
  }, [financeRecords]);

  useEffect(() => {
    saveAlarms(alarms);
  }, [alarms]);

  useEffect(() => {
    saveMonthlyBudget(currentMonthStr, monthlyBudget);
  }, [monthlyBudget, currentMonthStr]);

  // Alarm clock monitor loop (ticks every 5 seconds)
  useEffect(() => {
    const checkAlarms = () => {
      const now = new Date();
      const currentDayOfWeek = now.getDay();
      const currentHours = String(now.getHours()).padStart(2, '0');
      const currentMinutes = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${currentHours}:${currentMinutes}`;
      const currentDateStr = getLocalDateString(now);

      // 1. Check daily recurring alarms
      for (const alarm of alarms) {
        if (!alarm.enabled) continue;
        if (!alarm.days.includes(currentDayOfWeek)) continue;
        if (alarm.time === currentTimeStr) {
          const triggerKey = `daily-${alarm.id}-${currentDateStr}-${currentTimeStr}`;
          if (!triggeredAlarmsCache.has(triggerKey)) {
            setTriggeredAlarmsCache((prev) => new Set(prev).add(triggerKey));
            
            // Trigger Alarm Audio & Modal
            startRepeatingAlarm(alarm.sound || 'zen-bell');
            setActiveTriggeredAlarm({
              id: alarm.id,
              title: alarm.title,
              time: alarm.time,
              source: 'daily-alarm',
            });

            // Native Browser Notification
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('AJI: Alarm Harian', {
                body: `${alarm.title} (Pukul ${alarm.time})`,
                icon: '/favicon.ico',
              });
            }
            return;
          }
        }
      }

      // 2. Check task alarms
      for (const task of tasks) {
        if (task.completed) continue;
        if (!task.alarmEnabled) continue;
        if (task.dueDate !== currentDateStr) continue;

        const taskAlarmTime = task.alarmTime || task.dueTime;
        if (taskAlarmTime === currentTimeStr) {
          const triggerKey = `task-${task.id}-${currentDateStr}-${currentTimeStr}`;
          if (!triggeredAlarmsCache.has(triggerKey)) {
            setTriggeredAlarmsCache((prev) => new Set(prev).add(triggerKey));

            startRepeatingAlarm('zen-bell');
            setActiveTriggeredAlarm({
              id: task.id,
              title: task.title,
              time: taskAlarmTime,
              source: 'task',
            });

            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('AJI: Pengingat Tugas', {
                body: `Waktunya menyelesaikan: ${task.title}`,
                icon: '/favicon.ico',
              });
            }
            return;
          }
        }
      }
    };

    checkAlarms();
    const interval = setInterval(checkAlarms, 5000);
    return () => clearInterval(interval);
  }, [alarms, tasks, triggeredAlarmsCache]);

  const handleDismissAlarm = () => {
    stopRepeatingAlarm();
    setActiveTriggeredAlarm(null);
  };

  const handleSnoozeAlarm = () => {
    stopRepeatingAlarm();
    if (!activeTriggeredAlarm) return;

    const now = new Date();
    now.setMinutes(now.getMinutes() + 5);
    const snoozeTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    if (activeTriggeredAlarm.source === 'daily-alarm') {
      setAlarms((prev) =>
        prev.map((a) => (a.id === activeTriggeredAlarm.id ? { ...a, time: snoozeTime } : a))
      );
    } else {
      setTasks((prev) =>
        prev.map((t) => (t.id === activeTriggeredAlarm.id ? { ...t, alarmTime: snoozeTime } : t))
      );
    }
    setActiveTriggeredAlarm(null);
  };

  // Handlers for Diary
  const handleSaveDiary = (entry: DiaryEntry) => {
    setDiaryEntries((prev) => {
      const idx = prev.findIndex((e) => e.id === entry.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = entry;
        return copy;
      }
      return [entry, ...prev];
    });
  };

  const handleDeleteDiary = (id: string) => {
    setDiaryEntries((prev) => prev.filter((e) => e.id !== id));
  };

  // Handlers for Tasks
  const handleSaveTask = (task: TaskItem) => {
    setTasks((prev) => {
      const idx = prev.findIndex((t) => t.id === task.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = task;
        return copy;
      }
      return [task, ...prev];
    });
  };

  const handleDeleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const handleToggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const nextCompleted = !t.completed;
        return {
          ...t,
          completed: nextCompleted,
          completedAt: nextCompleted ? new Date().toISOString() : undefined,
        };
      })
    );
  };

  // Handlers for Finance
  const handleAddFinanceRecord = (record: FinanceRecord) => {
    setFinanceRecords((prev) => [record, ...prev]);
  };

  const handleDeleteFinanceRecord = (id: string) => {
    setFinanceRecords((prev) => prev.filter((r) => r.id !== id));
  };

  // Calendar Sync: Export all tasks to .ics
  const handleSyncAllToCalendar = () => {
    const icsContent = generateIcsFileContent(tasks);
    downloadFile(`aji-semua-jadwal-${todayStr}.ics`, icsContent);
  };

  // Pending tasks count
  const pendingTasksCount = useMemo(() => {
    return tasks.filter((t) => !t.completed).length;
  }, [tasks]);

  // Restore data from backup
  const handleRestoreData = (data: {
    diaryEntries: DiaryEntry[];
    tasks: TaskItem[];
    financeRecords: FinanceRecord[];
    alarms: DailyAlarm[];
  }) => {
    setDiaryEntries(data.diaryEntries);
    setTasks(data.tasks);
    setFinanceRecords(data.financeRecords);
    setAlarms(data.alarms);
  };

  // Quick navigation triggers from DailyGlance and Calendar
  const handleQuickNewDiary = (date?: string) => {
    setTargetDateForDiary(date || todayStr);
    setIsWritingInitialDiary(true);
    setActiveTab('diary');
  };

  const handleQuickNewTask = (date?: string) => {
    setTargetDateForTask(date || todayStr);
    setIsAddingInitialTask(true);
    setActiveTab('tasks');
  };

  const handleQuickNewFinance = (date?: string) => {
    setTargetDateForFinance(date || todayStr);
    setIsAddingInitialFinance(true);
    setActiveTab('finance');
  };

  return (
    <div className="min-h-screen bg-[#faf9f6] text-stone-900 flex flex-col font-sans paper-bg selection:bg-stone-200">
      {/* Elevated Minimalist Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        openBackupModal={() => setIsBackupModalOpen(true)}
        openPermissionsModal={() => setIsPermissionsModalOpen(true)}
        pendingTasksCount={pendingTasksCount}
        hasActiveAlarms={alarms.some((a) => a.enabled)}
        onSyncAllToCalendar={handleSyncAllToCalendar}
      />

      {/* Main Workspace */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-3.5 sm:px-6 py-4 sm:py-8 pb-28 sm:pb-8">
        
        {/* Welcome & Day Glance Bar */}
        <DailyGlance
          todayStr={todayStr}
          diaryEntries={diaryEntries}
          tasks={tasks}
          financeRecords={financeRecords}
          onOpenNewDiary={() => handleQuickNewDiary()}
          onOpenNewTask={() => handleQuickNewTask()}
          onOpenNewFinance={() => handleQuickNewFinance()}
        />

        {/* Tab Views */}
        {activeTab === 'diary' && (
          <DiaryView
            entries={diaryEntries}
            onSaveEntry={handleSaveDiary}
            onDeleteEntry={handleDeleteDiary}
            initialDate={targetDateForDiary}
            isWritingInitial={isWritingInitialDiary}
          />
        )}

        {activeTab === 'tasks' && (
          <TaskView
            tasks={tasks}
            alarms={alarms}
            onSaveTask={handleSaveTask}
            onDeleteTask={handleDeleteTask}
            onToggleTask={handleToggleTask}
            onSaveAlarms={setAlarms}
            onRequestNotificationPermission={requestNotificationPermission}
            notificationPermission={notificationPermission}
            initialDate={targetDateForTask}
            isAddingInitial={isAddingInitialTask}
          />
        )}

        {activeTab === 'finance' && (
          <FinanceView
            records={financeRecords}
            onAddRecord={handleAddFinanceRecord}
            onDeleteRecord={handleDeleteFinanceRecord}
            monthlyBudget={monthlyBudget}
            onUpdateMonthlyBudget={setMonthlyBudget}
            initialDate={targetDateForFinance}
            isAddingInitial={isAddingInitialFinance}
          />
        )}

        {activeTab === 'calendar' && (
          <CalendarView
            diaryEntries={diaryEntries}
            tasks={tasks}
            financeRecords={financeRecords}
            onOpenNewDiary={handleQuickNewDiary}
            onOpenNewTask={handleQuickNewTask}
            onOpenNewFinance={handleQuickNewFinance}
          />
        )}
      </main>

      {/* Minimalist Footer */}
      <footer className="border-t border-stone-200/80 py-8 text-center text-xs text-stone-500 bg-white/40">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="font-serif-diary text-stone-800 font-semibold tracking-wide text-sm">
            AJI · Ruang Pribadi Harian
          </p>
          <div className="flex items-center gap-3 text-stone-500">
            <span>Privat & Tersimpan Lokal</span>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => setIsBackupModalOpen(true)}
              className="hover:text-stone-900 transition-colors cursor-pointer"
            >
              Cadangan Data
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={handleSyncAllToCalendar}
              className="hover:text-stone-900 transition-colors cursor-pointer"
            >
              Unduh Kalender (.ics)
            </button>
          </div>
        </div>
      </footer>

      {/* Alarm Sound & Visual Modal */}
      <AlarmModal
        alarmData={activeTriggeredAlarm}
        onDismiss={handleDismissAlarm}
        onSnooze={handleSnoozeAlarm}
      />

      {/* Backup & Data Privacy Modal */}
      <BackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        diaryEntries={diaryEntries}
        tasks={tasks}
        financeRecords={financeRecords}
        alarms={alarms}
        onRestoreData={handleRestoreData}
      />

      {/* Device Permissions Manager Modal */}
      <PermissionsModal
        isOpen={isPermissionsModalOpen}
        onClose={() => setIsPermissionsModalOpen(false)}
        permissions={devicePermissions}
        onUpdatePermissions={(updated) => {
          setDevicePermissions(updated);
          savePermissions(updated);
        }}
      />

      {/* Mobile Bottom Navigation Bar (Thumb-Zone Friendly) */}
      <MobileBottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingTasksCount={pendingTasksCount}
      />
    </div>
  );
}
