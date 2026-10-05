import { useState, useMemo, useEffect } from 'react';
import { TaskItem, DailyAlarm, TaskPriority, TaskCategory, AlarmSound } from '../types';
import { 
  Plus, 
  Check, 
  Trash2, 
  Calendar, 
  Clock, 
  Bell, 
  BellRing,
  Volume2, 
  ListPlus, 
  CheckCircle2, 
  Circle, 
  ChevronDown, 
  ChevronUp, 
  X, 
  CalendarCheck, 
  CalendarPlus, 
  Play,
  Users,
  UserCheck
} from 'lucide-react';
import { generateGoogleCalendarUrl, generateIcsFileContent, downloadFile, getLocalDateString } from '../utils/calendarSync';
import { playAlarmSound } from '../utils/audioAlarm';
import { requestContactPicker } from '../utils/devicePermissions';

interface TaskViewProps {
  tasks: TaskItem[];
  alarms: DailyAlarm[];
  onSaveTask: (task: TaskItem) => void;
  onDeleteTask: (id: string) => void;
  onToggleTask: (id: string) => void;
  onSaveAlarms: (alarms: DailyAlarm[]) => void;
  onRequestNotificationPermission: () => void;
  notificationPermission: NotificationPermission | 'unsupported';
  initialDate?: string;
  isAddingInitial?: boolean;
}

const CATEGORY_LABELS: Record<TaskCategory, string> = {
  kerja: 'Pekerjaan',
  pribadi: 'Pribadi',
  belajar: 'Belajar',
  kesehatan: 'Kesehatan',
  keuangan: 'Keuangan',
  rumah: 'Rumah & Belanja',
};

const PRIORITY_LABELS: Record<TaskPriority, { label: string; dotColor: string }> = {
  tinggi: { label: 'Tinggi', dotColor: 'bg-rose-500' },
  sedang: { label: 'Sedang', dotColor: 'bg-amber-500' },
  rendah: { label: 'Rendah', dotColor: 'bg-stone-400' },
};

export function TaskView({
  tasks,
  alarms,
  onSaveTask,
  onDeleteTask,
  onToggleTask,
  onSaveAlarms,
  onRequestNotificationPermission,
  notificationPermission,
  initialDate,
  isAddingInitial = false,
}: TaskViewProps) {
  const [filterTab, setFilterTab] = useState<'today' | 'upcoming' | 'completed' | 'all'>('today');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isAddingTask, setIsAddingTask] = useState(isAddingInitial);
  const [isManagingAlarms, setIsManagingAlarms] = useState(false);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  // New Task Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TaskCategory>('kerja');
  const [priority, setPriority] = useState<TaskPriority>('sedang');
  const [dueDate, setDueDate] = useState(() => initialDate || getLocalDateString());
  const [dueTime, setDueTime] = useState('17:00');
  const [alarmEnabled, setAlarmEnabled] = useState(true);
  const [alarmTime, setAlarmTime] = useState('16:45');
  const [subtasksInput, setSubtasksInput] = useState<string[]>(['']);
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  // New Daily Alarm State
  const [newAlarmTime, setNewAlarmTime] = useState('07:00');
  const [newAlarmTitle, setNewAlarmTitle] = useState('');
  const [newAlarmSound, setNewAlarmSound] = useState<AlarmSound>('zen-bell');

  // React to prop changes from outside
  useEffect(() => {
    if (isAddingInitial) {
      setIsAddingTask(true);
    }
  }, [isAddingInitial]);

  useEffect(() => {
    if (initialDate) {
      setDueDate(initialDate);
    }
  }, [initialDate]);

  const todayStr = useMemo(() => getLocalDateString(), []);
  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return getLocalDateString(d);
  }, []);

  const handlePickContact = async () => {
    const res = await requestContactPicker();
    if (res.contacts && res.contacts.length > 0) {
      setContactName(res.contacts[0].name);
      setContactPhone(res.contacts[0].tel || '');
    }
  };

  const handleAddSubtaskField = () => {
    setSubtasksInput((prev) => [...prev, '']);
  };

  const handleSubtaskChange = (index: number, val: string) => {
    setSubtasksInput((prev) => {
      const copy = [...prev];
      copy[index] = val;
      return copy;
    });
  };

  const handleRemoveSubtaskField = (index: number) => {
    setSubtasksInput((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveNewTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const validSubtasks = subtasksInput
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s, idx) => ({
        id: `sub-${Date.now()}-${idx}`,
        title: s,
        completed: false,
      }));

    const newTask: TaskItem = {
      id: `task-${Date.now()}`,
      title: title.trim(),
      description: description.trim() || undefined,
      category,
      priority,
      dueDate,
      dueTime: dueTime || undefined,
      completed: false,
      alarmEnabled,
      alarmTime: alarmEnabled ? (alarmTime || dueTime) : undefined,
      contactName: contactName.trim() || undefined,
      contactPhone: contactPhone.trim() || undefined,
      subtasks: validSubtasks,
      createdAt: Date.now(),
    };

    onSaveTask(newTask);
    setTitle('');
    setDescription('');
    setContactName('');
    setContactPhone('');
    setSubtasksInput(['']);
    setIsAddingTask(false);
  };

  const handleToggleSubtask = (taskId: string, subId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const updated = {
      ...task,
      subtasks: task.subtasks.map((s) => (s.id === subId ? { ...s, completed: !s.completed } : s)),
    };
    onSaveTask(updated);
  };

  // Alarm Management
  const handleToggleAlarm = (alarmId: string) => {
    const updated = alarms.map((a) => (a.id === alarmId ? { ...a, enabled: !a.enabled } : a));
    onSaveAlarms(updated);
  };

  const handleDeleteAlarm = (alarmId: string) => {
    onSaveAlarms(alarms.filter((a) => a.id !== alarmId));
  };

  const handleAddAlarm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAlarmTitle.trim()) return;

    const newAlarm: DailyAlarm = {
      id: `alarm-${Date.now()}`,
      title: newAlarmTitle.trim(),
      time: newAlarmTime,
      enabled: true,
      days: [0, 1, 2, 3, 4, 5, 6],
      sound: newAlarmSound,
    };

    onSaveAlarms([...alarms, newAlarm]);
    setNewAlarmTitle('');
  };

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (selectedCategory !== 'all' && task.category !== selectedCategory) {
        return false;
      }
      if (filterTab === 'today') {
        return task.dueDate === todayStr && !task.completed;
      }
      if (filterTab === 'upcoming') {
        return task.dueDate > todayStr && !task.completed;
      }
      if (filterTab === 'completed') {
        return task.completed;
      }
      return true;
    });
  }, [tasks, filterTab, selectedCategory, todayStr]);

  const handleExportAllToIcs = () => {
    const ics = generateIcsFileContent(tasks);
    downloadFile(`aji-jadwal-tugas-${todayStr}.ics`, ics);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-stone-200">
        <div>
          <h1 className="font-serif-diary text-3xl font-semibold text-stone-900 tracking-tight">
            Daftar Tugas & Alarm Pengingat
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            Pantau pekerjaan harian, kelola alarm rutin, dan sinkronkan langsung ke kalender.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsManagingAlarms(!isManagingAlarms)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl border transition-colors cursor-pointer ${
              isManagingAlarms
                ? 'bg-stone-900 text-stone-50 border-stone-900 shadow-2xs'
                : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50 shadow-2xs'
            }`}
          >
            <BellRing className="w-3.5 h-3.5" />
            <span>Alarm Harian ({alarms.filter((a) => a.enabled).length})</span>
          </button>

          <button
            type="button"
            onClick={handleExportAllToIcs}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-white text-stone-700 border border-stone-200 hover:bg-stone-50 rounded-xl transition-colors shadow-2xs cursor-pointer"
            title="Ekspor seluruh daftar tugas ke berkas .ics (Google Calendar, Apple, Outlook)"
          >
            <CalendarCheck className="w-3.5 h-3.5 text-stone-700" />
            <span>Ekspor .ICS</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddingTask(true)}
            className="flex items-center gap-2 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-stone-50 text-xs sm:text-sm font-medium rounded-xl transition-all shadow-[0_1px_3px_rgba(0,0,0,0.1)] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tugas Baru</span>
          </button>
        </div>
      </div>

      {/* Notification banner */}
      {notificationPermission === 'default' && (
        <div className="flex items-center justify-between p-3.5 bg-amber-50/80 border border-amber-200/90 rounded-2xl text-xs text-amber-900">
          <div className="flex items-center gap-2.5">
            <Bell className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Aktifkan izin notifikasi peramban agar pengingat tugas berbunyi saat Anda sedang membuka aplikasi lain.
            </span>
          </div>
          <button
            type="button"
            onClick={onRequestNotificationPermission}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg transition-colors shrink-0 cursor-pointer shadow-2xs"
          >
            Izinkan Notifikasi
          </button>
        </div>
      )}

      {/* Daily Alarms Drawer */}
      {isManagingAlarms && (
        <div className="bg-white border border-stone-200/90 rounded-2xl p-5 sm:p-6 space-y-4 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2">
              <BellRing className="w-4 h-4 text-stone-800" />
              <h2 className="text-sm font-semibold text-stone-900">
                Pengaturan Alarm Harian Rutin
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setIsManagingAlarms(false)}
              className="text-stone-400 hover:text-stone-700 text-xs cursor-pointer"
            >
              Tutup
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {alarms.map((alarm) => (
              <div
                key={alarm.id}
                className="bg-stone-50/70 border border-stone-200/80 rounded-xl p-3.5 flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-lg font-bold text-stone-900">
                      {alarm.time}
                    </span>
                    <button
                      type="button"
                      onClick={() => playAlarmSound(alarm.sound)}
                      className="p-1 text-stone-500 hover:text-stone-800 rounded hover:bg-stone-200/60 cursor-pointer"
                      title="Tes suara bel alarm"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-xs text-stone-700 font-medium mt-0.5">{alarm.title}</p>
                  <p className="text-[11px] text-stone-400 mt-1">
                    Setiap hari · Suara: {alarm.sound}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleAlarm(alarm.id)}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                      alarm.enabled
                        ? 'bg-stone-900 text-stone-50 shadow-2xs'
                        : 'bg-stone-200/70 text-stone-500 hover:text-stone-700'
                    }`}
                  >
                    {alarm.enabled ? 'Aktif' : 'Mati'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteAlarm(alarm.id)}
                    className="p-1.5 text-stone-400 hover:text-rose-600 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <form
            onSubmit={handleAddAlarm}
            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2 border-t border-stone-100"
          >
            <input
              type="time"
              value={newAlarmTime}
              onChange={(e) => setNewAlarmTime(e.target.value)}
              className="text-xs font-mono bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-2 focus:outline-none"
              required
            />
            <input
              type="text"
              value={newAlarmTitle}
              onChange={(e) => setNewAlarmTitle(e.target.value)}
              placeholder="Contoh: Evaluasi pekerjaan harian..."
              className="flex-1 text-xs bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 focus:outline-none"
              required
            />
            <select
              value={newAlarmSound}
              onChange={(e) => setNewAlarmSound(e.target.value as AlarmSound)}
              className="text-xs bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-2 focus:outline-none cursor-pointer"
            >
              <option value="zen-bell">Zen Tibetan Bell</option>
              <option value="marimba">Warm Marimba</option>
              <option value="gentle-pulse">Gentle Pulse</option>
              <option value="digital-chime">Digital Chime</option>
            </select>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors shrink-0 cursor-pointer shadow-2xs"
            >
              Tambah Alarm
            </button>
          </form>
        </div>
      )}

      {/* Add Task Form */}
      {isAddingTask && (
        <div className="bg-white border border-stone-200/90 rounded-2xl p-6 sm:p-7 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)] animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-3 mb-5 border-b border-stone-100">
            <h2 className="text-sm font-semibold text-stone-900">Tambah Tugas Baru</h2>
            <button
              type="button"
              onClick={() => setIsAddingTask(false)}
              className="p-1 text-stone-400 hover:text-stone-700 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSaveNewTask} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Judul Tugas</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Apa yang ingin kamu selesaikan?"
                className="w-full text-sm bg-stone-50/70 border border-stone-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-stone-400 focus:bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">Catatan Tambahan (Opsional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Rincian, tautan referensi, atau instruksi..."
                rows={2}
                className="w-full text-xs text-stone-800 bg-stone-50/70 border border-stone-200 rounded-xl px-3.5 py-2 focus:outline-none focus:border-stone-400 focus:bg-white"
              />
            </div>

            {/* Quick date presets */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-400">Pilihan cepat:</span>
              <button
                type="button"
                onClick={() => setDueDate(todayStr)}
                className={`px-2.5 py-1 text-xs rounded-md border transition-colors cursor-pointer ${dueDate === todayStr ? 'bg-stone-900 text-white border-stone-900' : 'bg-stone-50 text-stone-600 border-stone-200'}`}
              >
                Hari Ini
              </button>
              <button
                type="button"
                onClick={() => setDueDate(tomorrowStr)}
                className={`px-2.5 py-1 text-xs rounded-md border transition-colors cursor-pointer ${dueDate === tomorrowStr ? 'bg-stone-900 text-white border-stone-900' : 'bg-stone-50 text-stone-600 border-stone-200'}`}
              >
                Besok
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Kategori</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as TaskCategory)}
                  className="w-full text-xs bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-2 focus:outline-none cursor-pointer"
                >
                  {Object.entries(CATEGORY_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Prioritas</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  className="w-full text-xs bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-2 focus:outline-none cursor-pointer"
                >
                  <option value="tinggi">🔴 Tinggi</option>
                  <option value="sedang">🟡 Sedang</option>
                  <option value="rendah">⚪ Rendah</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Tenggat Tanggal</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full text-xs font-mono bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-2 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Waktu Selesai</label>
                <input
                  type="time"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                  className="w-full text-xs font-mono bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-2 focus:outline-none"
                />
              </div>
            </div>

            {/* Alarm Reminder Toggle */}
            <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="alarm-check"
                  checked={alarmEnabled}
                  onChange={(e) => setAlarmEnabled(e.target.checked)}
                  className="w-4 h-4 rounded border-stone-300 text-stone-900 cursor-pointer"
                />
                <label htmlFor="alarm-check" className="text-xs font-medium text-stone-800 cursor-pointer">
                  Nyalakan Alarm Pengingat Audio & Notifikasi
                </label>
              </div>

              {alarmEnabled && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-stone-500">Bunyikan pukul:</span>
                  <input
                    type="time"
                    value={alarmTime}
                    onChange={(e) => setAlarmTime(e.target.value)}
                    className="text-xs font-mono bg-white border border-stone-200 rounded-md px-2 py-1 focus:outline-none"
                  />
                </div>
              )}
            </div>

            {/* Link device contact */}
            <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-xs font-medium text-stone-700">
                  <Users className="w-3.5 h-3.5 text-stone-600" />
                  <span>Tautkan Kontak Rekan / Keluarga (Opsional)</span>
                </label>
                <button
                  type="button"
                  onClick={handlePickContact}
                  className="text-[11px] font-medium text-stone-700 bg-white hover:bg-stone-100 border border-stone-200 px-2 py-1 rounded-md transition-colors cursor-pointer"
                  title="Pilih langsung dari kontak HP jika didukung peramban"
                >
                  Pilih dari Buku HP
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Nama kontak rekan..."
                  className="w-full text-xs bg-white border border-stone-200 rounded-lg px-3 py-2 focus:outline-none"
                />
                <input
                  type="text"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="Nomor HP / WA (opsional)..."
                  className="w-full text-xs font-mono bg-white border border-stone-200 rounded-lg px-3 py-2 focus:outline-none"
                />
              </div>
            </div>

            {/* Subtasks checklist */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-stone-700">
                  Daftar Subtugas / Langkah Pengerjaan
                </label>
                <button
                  type="button"
                  onClick={handleAddSubtaskField}
                  className="text-xs text-stone-600 hover:text-stone-900 flex items-center gap-1 cursor-pointer font-medium"
                >
                  <ListPlus className="w-3.5 h-3.5" />
                  <span>Tambah Baris</span>
                </button>
              </div>
              <div className="space-y-1.5">
                {subtasksInput.map((sub, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="text-xs text-stone-400 font-mono w-4">{index + 1}.</span>
                    <input
                      type="text"
                      value={sub}
                      onChange={(e) => handleSubtaskChange(index, e.target.value)}
                      placeholder="Langkah atau checklist..."
                      className="flex-1 text-xs bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:bg-white"
                    />
                    {subtasksInput.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSubtaskField(index)}
                        className="text-stone-400 hover:text-rose-500 p-1 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setIsAddingTask(false)}
                className="px-4 py-2 text-xs font-medium text-stone-600 hover:text-stone-900 rounded-lg hover:bg-stone-100 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-6 py-2 text-xs font-medium bg-stone-900 text-white rounded-xl hover:bg-stone-800 transition-colors shadow-2xs cursor-pointer"
              >
                Simpan Tugas
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter Tabs & Category Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Status Tab buttons */}
        <div className="flex items-center p-1 bg-stone-200/60 rounded-xl overflow-x-auto">
          <button
            type="button"
            onClick={() => setFilterTab('today')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              filterTab === 'today'
                ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Hari Ini ({tasks.filter((t) => t.dueDate === todayStr && !t.completed).length})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('upcoming')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              filterTab === 'upcoming'
                ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Mendatang ({tasks.filter((t) => t.dueDate > todayStr && !t.completed).length})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('completed')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              filterTab === 'completed'
                ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Selesai ({tasks.filter((t) => t.completed).length})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              filterTab === 'all'
                ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Semua ({tasks.length})
          </button>
        </div>

        {/* Category filter select */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-400">Kategori:</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs bg-white border border-stone-200 rounded-xl px-3 py-1.5 focus:outline-none cursor-pointer"
          >
            <option value="all">Semua Kategori</option>
            {Object.entries(CATEGORY_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Task Items List */}
      {filteredTasks.length === 0 ? (
        <div className="text-center py-16 bg-white border border-dashed border-stone-200 rounded-2xl">
          <CheckCircle2 className="w-8 h-8 mx-auto text-stone-300 mb-2" />
          <p className="text-sm font-medium text-stone-600">Tidak ada tugas pada filter ini</p>
          <p className="text-xs text-stone-400 mt-1">
            Tekan "Tugas Baru" untuk menambahkan pekerjaan harimu.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredTasks.map((task) => {
            const isToday = task.dueDate === todayStr;
            const isExpanded = expandedTaskId === task.id;
            const completedSubtasks = task.subtasks.filter((s) => s.completed).length;

            return (
              <div
                key={task.id}
                className={`bg-white border rounded-xl p-4 transition-all shadow-[0_1px_3px_rgba(0,0,0,0.02)] ${
                  task.completed ? 'border-stone-200/60 bg-stone-50/50 opacity-75' : 'border-stone-200/90 hover:border-stone-300'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Checkbox & Title */}
                  <div className="flex items-start gap-3 flex-1">
                    <button
                      type="button"
                      onClick={() => onToggleTask(task.id)}
                      className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                        task.completed
                          ? 'bg-stone-900 border-stone-900 text-white'
                          : 'border-stone-300 hover:border-stone-500 bg-white'
                      }`}
                    >
                      {task.completed && <Check className="w-3.5 h-3.5" />}
                    </button>

                    <div className="flex-1">
                      <span
                        className={`text-sm font-medium transition-all ${
                          task.completed ? 'line-through text-stone-400' : 'text-stone-900 font-semibold'
                        }`}
                      >
                        {task.title}
                      </span>

                      {task.description && (
                        <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                          {task.description}
                        </p>
                      )}

                      {/* Clean Unboxed Metadata with Typographic Separators */}
                      <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500 mt-2">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              PRIORITY_LABELS[task.priority].dotColor
                            }`}
                          />
                          <span>{PRIORITY_LABELS[task.priority].label}</span>
                        </div>
                        <span aria-hidden="true" className="text-stone-300">·</span>
                        <span>{CATEGORY_LABELS[task.category]}</span>
                        <span aria-hidden="true" className="text-stone-300">·</span>
                        <span className={`font-mono ${isToday ? 'font-semibold text-stone-800' : ''}`}>
                          {new Date(task.dueDate).toLocaleDateString('id-ID', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                        {task.dueTime && (
                          <>
                            <span aria-hidden="true" className="text-stone-300">·</span>
                            <span className="font-mono">{task.dueTime}</span>
                          </>
                        )}
                        {task.alarmEnabled && task.alarmTime && (
                          <>
                            <span aria-hidden="true" className="text-stone-300">·</span>
                            <span className="flex items-center gap-1 text-stone-700">
                              <Bell className="w-3 h-3 text-amber-600" />
                              <span className="font-mono text-[11px]">{task.alarmTime}</span>
                            </span>
                          </>
                        )}
                        {task.subtasks.length > 0 && (
                          <>
                            <span aria-hidden="true" className="text-stone-300">·</span>
                            <span>
                              {completedSubtasks}/{task.subtasks.length} Subtugas
                            </span>
                          </>
                        )}
                        {task.contactName && (
                          <>
                            <span aria-hidden="true" className="text-stone-300">·</span>
                            <span className="flex items-center gap-1 text-stone-700">
                              <Users className="w-3 h-3 text-stone-500" />
                              <span>{task.contactName}</span>
                            </span>
                          </>
                        )}
                      </div>

                      {/* Subtasks checklist accordion */}
                      {task.subtasks.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-stone-100">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedTaskId(isExpanded ? null : task.id)
                            }
                            className="flex items-center gap-1 text-xs text-stone-600 hover:text-stone-900 font-medium cursor-pointer"
                          >
                            <span>Subtugas ({completedSubtasks}/{task.subtasks.length})</span>
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {isExpanded && (
                            <div className="mt-2 space-y-1.5 pl-2">
                              {task.subtasks.map((sub) => (
                                <div
                                  key={sub.id}
                                  onClick={() => handleToggleSubtask(task.id, sub.id)}
                                  className="flex items-center gap-2 cursor-pointer text-xs group"
                                >
                                  {sub.completed ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-stone-700 shrink-0" />
                                  ) : (
                                    <Circle className="w-3.5 h-3.5 text-stone-300 group-hover:text-stone-500 shrink-0" />
                                  )}
                                  <span
                                    className={
                                      sub.completed
                                        ? 'line-through text-stone-400'
                                        : 'text-stone-700'
                                    }
                                  >
                                    {sub.title}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions: Sync to Google Calendar & Delete */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <a
                      href={generateGoogleCalendarUrl(task)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200/80 rounded-lg transition-colors cursor-pointer"
                      title="Sinkronkan tugas ini langsung ke Google Kalender"
                    >
                      <CalendarPlus className="w-3.5 h-3.5 text-stone-700" />
                      <span className="hidden sm:inline">Google Kalender</span>
                    </a>

                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('Hapus tugas ini?')) {
                          onDeleteTask(task.id);
                        }
                      }}
                      className="p-1.5 text-stone-300 hover:text-rose-600 rounded-md hover:bg-stone-100 transition-colors cursor-pointer"
                      title="Hapus tugas"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
