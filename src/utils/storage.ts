import { DiaryEntry, TaskItem, FinanceRecord, DailyAlarm } from '../types';
import { initialAlarms, initialDiaryEntries, initialFinanceRecords, initialTasks } from './dummyData';

const STORAGE_KEYS = {
  DIARY: 'kala_diary_entries_v1',
  TASKS: 'kala_tasks_v1',
  FINANCE: 'kala_finance_v1',
  ALARMS: 'kala_alarms_v1',
  BUDGET: 'kala_monthly_budget_v1',
};

export function loadDiaryEntries(): DiaryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DIARY);
    if (raw === null) return initialDiaryEntries;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : initialDiaryEntries;
  } catch (e) {
    console.error('Failed to load diary entries', e);
    return initialDiaryEntries;
  }
}

export function saveDiaryEntries(entries: DiaryEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.DIARY, JSON.stringify(entries));
  } catch (e) {
    console.error('Failed to save diary entries', e);
  }
}

export function loadTasks(): TaskItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TASKS);
    if (raw === null) return initialTasks;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : initialTasks;
  } catch (e) {
    console.error('Failed to load tasks', e);
    return initialTasks;
  }
}

export function saveTasks(tasks: TaskItem[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
  } catch (e) {
    console.error('Failed to save tasks', e);
  }
}

export function loadFinanceRecords(): FinanceRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.FINANCE);
    if (raw === null) return initialFinanceRecords;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : initialFinanceRecords;
  } catch (e) {
    console.error('Failed to load finance records', e);
    return initialFinanceRecords;
  }
}

export function saveFinanceRecords(records: FinanceRecord[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.FINANCE, JSON.stringify(records));
  } catch (e) {
    console.error('Failed to save finance records', e);
  }
}

export function loadAlarms(): DailyAlarm[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ALARMS);
    if (raw === null) return initialAlarms;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : initialAlarms;
  } catch (e) {
    console.error('Failed to load alarms', e);
    return initialAlarms;
  }
}

export function saveAlarms(alarms: DailyAlarm[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.ALARMS, JSON.stringify(alarms));
  } catch (e) {
    console.error('Failed to save alarms', e);
  }
}

export function loadMonthlyBudget(monthStr: string): number {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEYS.BUDGET}_${monthStr}`);
    return raw ? parseFloat(raw) : 6000000; // Default Rp 6.000.000
  } catch {
    return 6000000;
  }
}

export function saveMonthlyBudget(monthStr: string, amount: number) {
  try {
    localStorage.setItem(`${STORAGE_KEYS.BUDGET}_${monthStr}`, amount.toString());
  } catch (e) {
    console.error('Failed to save monthly budget', e);
  }
}
