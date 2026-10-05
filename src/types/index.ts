export type MoodType = 'senang' | 'tenang' | 'produktif' | 'lelah' | 'cemas' | 'bersyukur';

export interface DiaryEntry {
  id: string;
  title: string;
  content: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  mood: MoodType;
  tags: string[];
  gratitude?: string;
  weather?: string;
  photoUrl?: string; // Foto dari kamera atau galeri HP
  location?: string; // Lokasi / GPS saat mencatat
  updatedAt: number;
}

export type TaskPriority = 'tinggi' | 'sedang' | 'rendah';
export type TaskCategory = 'kerja' | 'pribadi' | 'belajar' | 'kesehatan' | 'keuangan' | 'rumah';

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

export interface TaskItem {
  id: string;
  title: string;
  description?: string;
  category: TaskCategory;
  priority: TaskPriority;
  dueDate: string; // YYYY-MM-DD
  dueTime?: string; // HH:mm
  completed: boolean;
  completedAt?: string;
  alarmEnabled: boolean;
  alarmTime?: string; // HH:mm
  contactName?: string; // Kontak yang ditautkan dari HP
  contactPhone?: string;
  subtasks: SubTask[];
  createdAt: number;
}

export type AlarmSound = 'zen-bell' | 'marimba' | 'gentle-pulse' | 'digital-chime';

export interface DailyAlarm {
  id: string;
  title: string;
  time: string; // HH:mm
  enabled: boolean;
  days: number[]; // 0 = Minggu, 1 = Senin, ..., 6 = Sabtu
  sound: AlarmSound;
}

export type TransactionType = 'expense' | 'income';

export type ExpenseCategory =
  | 'Makanan & Minuman'
  | 'Transportasi'
  | 'Belanja Kebutuhan'
  | 'Tagihan & Utilitas'
  | 'Hiburan & Hobi'
  | 'Tabungan & Investasi'
  | 'Kesehatan'
  | 'Pendidikan'
  | 'Lainnya';

export type IncomeCategory =
  | 'Gaji Pokok'
  | 'Freelance / Bisnis'
  | 'Investasi'
  | 'Hadiah & Bonus'
  | 'Lainnya';

export interface FinanceRecord {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  date: string; // YYYY-MM-DD
  notes?: string;
  paymentMethod?: 'Tunai' | 'Transfer Bank' | 'E-Wallet' | 'Kartu';
  receiptPhoto?: string; // Foto struk belanja dari kamera/galeri
  location?: string; // Lokasi tempat belanja
  createdAt: number;
}

export interface MonthlyBudget {
  month: string; // YYYY-MM
  amount: number;
}

export type PermissionState = 'granted' | 'denied' | 'prompt';

export interface DevicePermissionsState {
  camera: PermissionState;
  contacts: PermissionState;
  location: PermissionState;
  calendar: PermissionState;
  notifications: PermissionState;
  photos: PermissionState;
  clock: PermissionState;
  files: PermissionState;
}
