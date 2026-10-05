import { useState, useMemo, useEffect, useRef } from 'react';
import { FinanceRecord, ExpenseCategory, IncomeCategory, TransactionType } from '../types';
import { 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Trash2, 
  Search, 
  PieChart as PieIcon, 
  BarChart3, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight, 
  ChevronLeft, 
  ChevronRight, 
  Edit2, 
  X,
  Camera,
  MapPin,
  Image as ImageIcon
} from 'lucide-react';
import { formatRupiah, getLocalDateString } from '../utils/calendarSync';
import { requestLocationPermission } from '../utils/devicePermissions';
import { compressImageFile } from '../utils/imageCompressor';

interface FinanceViewProps {
  records: FinanceRecord[];
  onAddRecord: (record: FinanceRecord) => void;
  onDeleteRecord: (id: string) => void;
  monthlyBudget: number;
  onUpdateMonthlyBudget: (budget: number) => void;
  initialDate?: string;
  isAddingInitial?: boolean;
}

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Makanan & Minuman',
  'Transportasi',
  'Belanja Kebutuhan',
  'Tagihan & Utilitas',
  'Hiburan & Hobi',
  'Tabungan & Investasi',
  'Kesehatan',
  'Pendidikan',
  'Lainnya',
];

const INCOME_CATEGORIES: IncomeCategory[] = [
  'Gaji Pokok',
  'Freelance / Bisnis',
  'Investasi',
  'Hadiah & Bonus',
  'Lainnya',
];

const CATEGORY_COLORS: Record<string, string> = {
  'Makanan & Minuman': '#ea580c', // orange-600
  'Transportasi': '#0891b2', // cyan-600
  'Belanja Kebutuhan': '#2563eb', // blue-600
  'Tagihan & Utilitas': '#4f46e5', // indigo-600
  'Hiburan & Hobi': '#db2777', // pink-600
  'Tabungan & Investasi': '#059669', // emerald-600
  'Kesehatan': '#dc2626', // red-600
  'Pendidikan': '#7c3aed', // purple-600
  'Lainnya': '#57534e', // stone-600
};

const PAYMENT_METHODS = ['Tunai', 'Transfer Bank', 'E-Wallet', 'Kartu'] as const;
const QUICK_AMOUNTS = [25000, 50000, 100000, 250000, 500000, 1000000];

export function FinanceView({
  records,
  onAddRecord,
  onDeleteRecord,
  monthlyBudget,
  onUpdateMonthlyBudget,
  initialDate,
  isAddingInitial = false,
}: FinanceViewProps) {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    if (initialDate) return initialDate.slice(0, 7);
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [isAdding, setIsAdding] = useState(isAddingInitial);
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState(monthlyBudget.toString());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'expense' | 'income'>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  // Form State
  const [transType, setTransType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [transDate, setTransDate] = useState(() => initialDate || getLocalDateString());
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Tunai' | 'Transfer Bank' | 'E-Wallet' | 'Kartu'>('Transfer Bank');
  const [receiptPhoto, setReceiptPhoto] = useState<string | undefined>(undefined);
  const [receiptLocation, setReceiptLocation] = useState<string | undefined>(undefined);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationFeedback, setLocationFeedback] = useState<string | null>(null);
  const [selectedReceiptImage, setSelectedReceiptImage] = useState<string | null>(null);
  const receiptFileRef = useRef<HTMLInputElement>(null);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImageFile(file);
        setReceiptPhoto(compressed);
      } catch (err) {
        console.error('Failed to compress receipt image', err);
      }
    }
  };

  const handleGetLocation = async () => {
    setIsGettingLocation(true);
    setLocationFeedback(null);
    try {
      const res = await requestLocationPermission();
      if (res.state === 'granted' && res.coords) {
        setReceiptLocation(`GPS: ${res.coords.latitude}, ${res.coords.longitude}`);
        setLocationFeedback('Lokasi belanja tercatat.');
      } else {
        setLocationFeedback(res.error || 'Izin lokasi belum aktif.');
      }
    } finally {
      setIsGettingLocation(false);
      setTimeout(() => setLocationFeedback(null), 3500);
    }
  };

  // React to prop changes from outside
  useEffect(() => {
    if (isAddingInitial) {
      setIsAdding(true);
    }
  }, [isAddingInitial]);

  useEffect(() => {
    if (initialDate) {
      setTransDate(initialDate);
      setSelectedMonth(initialDate.slice(0, 7));
    }
  }, [initialDate]);

  // Month navigation
  const handlePrevMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const prevDate = new Date(y, m - 2, 1);
    setSelectedMonth(`${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const nextDate = new Date(y, m, 1);
    setSelectedMonth(`${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`);
  };

  const monthLabel = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString('id-ID', {
      month: 'long',
      year: 'numeric',
    });
  }, [selectedMonth]);

  // Monthly Records
  const monthlyRecords = useMemo(() => {
    return records.filter((r) => r.date.startsWith(selectedMonth));
  }, [records, selectedMonth]);

  // Calculations
  const totalExpense = useMemo(() => {
    return monthlyRecords
      .filter((r) => r.type === 'expense')
      .reduce((sum, r) => sum + r.amount, 0);
  }, [monthlyRecords]);

  const totalIncome = useMemo(() => {
    return monthlyRecords
      .filter((r) => r.type === 'income')
      .reduce((sum, r) => sum + r.amount, 0);
  }, [monthlyRecords]);

  const netBalance = totalIncome - totalExpense;

  const daysInMonth = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number);
    return new Date(y, m, 0).getDate();
  }, [selectedMonth]);

  // Daily Expense Distribution
  const dailyExpenses = useMemo(() => {
    const days: { day: number; amount: number; count: number; dateStr: string }[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = `${selectedMonth}-${String(d).padStart(2, '0')}`;
      const recs = monthlyRecords.filter((r) => r.type === 'expense' && r.date === dayStr);
      const dayTotal = recs.reduce((sum, r) => sum + r.amount, 0);
      days.push({ day: d, amount: dayTotal, count: recs.length, dateStr: dayStr });
    }
    return days;
  }, [monthlyRecords, selectedMonth, daysInMonth]);

  const maxDailyExpense = useMemo(() => {
    return Math.max(...dailyExpenses.map((d) => d.amount), 1);
  }, [dailyExpenses]);

  // Category Breakdown for Expenses
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {};
    monthlyRecords
      .filter((r) => r.type === 'expense')
      .forEach((r) => {
        if (!map[r.category]) {
          map[r.category] = { total: 0, count: 0 };
        }
        map[r.category].total += r.amount;
        map[r.category].count += 1;
      });

    return Object.entries(map)
      .map(([cat, val]) => ({
        category: cat,
        total: val.total,
        count: val.count,
        percentage: totalExpense > 0 ? (val.total / totalExpense) * 100 : 0,
        color: CATEGORY_COLORS[cat] || '#57534e',
      }))
      .sort((a, b) => b.total - a.total);
  }, [monthlyRecords, totalExpense]);

  // Average daily expense
  const avgDailyExpense = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const isCurrentMonth = today.startsWith(selectedMonth);
    const dayCount = isCurrentMonth ? Math.min(new Date().getDate(), daysInMonth) : daysInMonth;
    return dayCount > 0 ? Math.round(totalExpense / dayCount) : 0;
  }, [totalExpense, selectedMonth, daysInMonth]);

  // Remaining budget and safe daily spend
  const remainingBudget = Math.max(0, monthlyBudget - totalExpense);
  const remainingDays = useMemo(() => {
    const today = getLocalDateString();
    if (today.startsWith(selectedMonth)) {
      return Math.max(1, daysInMonth - new Date().getDate() + 1);
    }
    return 1;
  }, [selectedMonth, daysInMonth]);

  const safeDailySpend = Math.round(remainingBudget / remainingDays);

  // Filtered record list
  const filteredList = useMemo(() => {
    return monthlyRecords.filter((rec) => {
      const matchType = filterType === 'all' || rec.type === filterType;
      const matchCategory = selectedCategoryFilter === 'all' || rec.category === selectedCategoryFilter;
      const matchSearch =
        rec.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (rec.notes && rec.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (rec.paymentMethod && rec.paymentMethod.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchType && matchCategory && matchSearch;
    }).sort((a, b) => (b.date > a.date ? 1 : -1));
  }, [monthlyRecords, filterType, selectedCategoryFilter, searchQuery]);

  const handleSaveTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount.replace(/[^0-9]/g, ''));
    if (!numAmount || isNaN(numAmount)) return;

    const newRecord: FinanceRecord = {
      id: `fin-${Date.now()}`,
      type: transType,
      amount: numAmount,
      category,
      date: transDate,
      notes: notes.trim() || undefined,
      paymentMethod,
      receiptPhoto: receiptPhoto || undefined,
      location: receiptLocation || undefined,
      createdAt: Date.now(),
    };

    onAddRecord(newRecord);
    setAmount('');
    setNotes('');
    setReceiptPhoto(undefined);
    setReceiptLocation(undefined);
    setIsAdding(false);
  };

  const handleSaveBudget = (e: React.FormEvent) => {
    e.preventDefault();
    const b = parseFloat(budgetInput.replace(/[^0-9]/g, ''));
    if (!isNaN(b) && b >= 0) {
      onUpdateMonthlyBudget(b);
      setIsEditingBudget(false);
    }
  };

  const budgetUsagePercent = monthlyBudget > 0 ? Math.min(Math.round((totalExpense / monthlyBudget) * 100), 100) : 0;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-stone-200">
        <div>
          <h1 className="font-serif-diary text-3xl font-semibold text-stone-900 tracking-tight">
            Catatan Keuangan & Grafik Pengeluaran
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            Analisis arus kas harian dan alokasi anggaran bulanan secara jernih dan teratur.
          </p>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white border border-stone-200/90 rounded-xl p-1 shadow-2xs">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 text-stone-600 hover:text-stone-900 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
              title="Bulan sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-xs font-bold px-3 text-stone-900 capitalize">
              {monthLabel}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 text-stone-600 hover:text-stone-900 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
              title="Bulan selanjutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-stone-50 text-xs sm:text-sm font-medium rounded-xl transition-all shadow-[0_1px_3px_rgba(0,0,0,0.1)] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Catat Transaksi</span>
          </button>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Pengeluaran */}
        <div className="bg-white border border-stone-200/90 rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between text-xs text-stone-500">
            <span className="font-medium">Total Pengeluaran</span>
            <ArrowDownRight className="w-4 h-4 text-rose-500" />
          </div>
          <p className="font-mono text-2xl font-bold text-stone-900 mt-2">
            {formatRupiah(totalExpense)}
          </p>
          <div className="flex items-center justify-between text-xs text-stone-500 mt-2.5 pt-2 border-t border-stone-100">
            <span>Rata-rata belanja/hari</span>
            <span className="font-mono text-stone-800 font-semibold">{formatRupiah(avgDailyExpense)}</span>
          </div>
        </div>

        {/* Total Pemasukan */}
        <div className="bg-white border border-stone-200/90 rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between text-xs text-stone-500">
            <span className="font-medium">Total Pemasukan</span>
            <ArrowUpRight className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="font-mono text-2xl font-bold text-stone-900 mt-2">
            {formatRupiah(totalIncome)}
          </p>
          <div className="flex items-center justify-between text-xs text-stone-500 mt-2.5 pt-2 border-t border-stone-100">
            <span>Saldo Bersih</span>
            <span
              className={`font-mono font-bold ${
                netBalance >= 0 ? 'text-emerald-700' : 'text-rose-600'
              }`}
            >
              {formatRupiah(netBalance)}
            </span>
          </div>
        </div>

        {/* Anggaran & Batas Aman */}
        <div className="bg-white border border-stone-200/90 rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between text-xs text-stone-500">
            <span className="font-medium">Batas Anggaran Bulanan</span>
            <button
              type="button"
              onClick={() => setIsEditingBudget(true)}
              className="text-stone-400 hover:text-stone-800 p-0.5 cursor-pointer"
              title="Ubah Anggaran"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="font-mono text-2xl font-bold text-stone-900 mt-2">
            {formatRupiah(monthlyBudget)}
          </p>
          <div className="mt-2.5 pt-2 border-t border-stone-100">
            <div className="flex items-center justify-between text-[11px] text-stone-500 mb-1 font-mono">
              <span>Terpakai {budgetUsagePercent}%</span>
              <span>Sisa {formatRupiah(remainingBudget)}</span>
            </div>
            <div className="w-full bg-stone-100 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  budgetUsagePercent > 90
                    ? 'bg-rose-500'
                    : budgetUsagePercent > 75
                    ? 'bg-amber-500'
                    : 'bg-stone-900'
                }`}
                style={{ width: `${budgetUsagePercent}%` }}
              />
            </div>
            <p className="text-[10px] text-stone-400 mt-1.5">
              Batas belanja aman: <span className="font-mono font-semibold text-stone-700">{formatRupiah(safeDailySpend)}</span>/hari
            </p>
          </div>
        </div>
      </div>

      {/* Edit Budget Form Modal Inline */}
      {isEditingBudget && (
        <form
          onSubmit={handleSaveBudget}
          className="bg-white p-4 border border-stone-200 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shadow-2xs animate-in fade-in"
        >
          <span className="text-xs font-semibold text-stone-800">Atur Anggaran Bulanan (Rp):</span>
          <input
            type="number"
            value={budgetInput}
            onChange={(e) => setBudgetInput(e.target.value)}
            className="text-xs font-mono bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 focus:outline-none flex-1"
            placeholder="6000000"
            required
          />
          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
            >
              Simpan
            </button>
            <button
              type="button"
              onClick={() => setIsEditingBudget(false)}
              className="px-3 py-2 text-xs font-medium text-stone-600 hover:text-stone-900 rounded-lg cursor-pointer"
            >
              Batal
            </button>
          </div>
        </form>
      )}

      {/* Transaction Entry Form */}
      {isAdding && (
        <div className="bg-white border border-stone-200/90 rounded-2xl p-6 sm:p-7 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)] animate-in fade-in">
          <div className="flex items-center justify-between pb-3 mb-5 border-b border-stone-100">
            <h2 className="text-sm font-semibold text-stone-900">Catat Transaksi Keuangan</h2>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-xs text-stone-400 hover:text-stone-700 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSaveTransaction} className="space-y-4">
            {/* Type selector */}
            <div className="flex items-center p-1 bg-stone-200/60 rounded-xl max-w-xs">
              <button
                type="button"
                onClick={() => {
                  setTransType('expense');
                  setCategory(EXPENSE_CATEGORIES[0]);
                }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  transType === 'expense'
                    ? 'bg-rose-500 text-white shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Pengeluaran
              </button>
              <button
                type="button"
                onClick={() => {
                  setTransType('income');
                  setCategory(INCOME_CATEGORIES[0]);
                }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  transType === 'income'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Pemasukan
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Nominal (Rp)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Contoh: 150000"
                className="w-full text-lg font-mono font-semibold bg-stone-50/70 border border-stone-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-stone-400 focus:bg-white"
                required
              />

              {/* Quick nominal buttons */}
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className="text-[11px] text-stone-400 mr-1">Cepat:</span>
                {QUICK_AMOUNTS.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => {
                      const current = parseFloat(amount.replace(/[^0-9]/g, '')) || 0;
                      setAmount((current + amt).toString());
                    }}
                    className="text-[11px] font-mono font-medium px-2 py-0.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-md transition-colors cursor-pointer"
                  >
                    +{formatRupiah(amt)}
                  </button>
                ))}
                {amount && (
                  <button
                    type="button"
                    onClick={() => setAmount('')}
                    className="text-[11px] text-stone-400 hover:text-stone-700 underline ml-1 cursor-pointer"
                  >
                    Hapus
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Kategori</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full text-xs bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 focus:outline-none cursor-pointer"
                >
                  {(transType === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Tanggal</label>
                <input
                  type="date"
                  value={transDate}
                  onChange={(e) => setTransDate(e.target.value)}
                  className="w-full text-xs font-mono bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Metode Pembayaran</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full text-xs bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 focus:outline-none cursor-pointer"
                >
                  {PAYMENT_METHODS.map((pm) => (
                    <option key={pm} value={pm}>
                      {pm}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">
                Keterangan / Catatan Belanja
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Rincian belanja atau sumber pemasukan..."
                className="w-full text-xs bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:bg-white"
              />
            </div>

            {/* Device integration: Receipt photo & Location */}
            <div className="pt-2 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <input
                  ref={receiptFileRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => receiptFileRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>{receiptPhoto ? 'Ganti Foto Struk' : 'Foto Struk Belanja'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleGetLocation}
                  disabled={isGettingLocation}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
                >
                  <MapPin className="w-3.5 h-3.5 text-rose-500" />
                  <span>{isGettingLocation ? 'Mencari...' : receiptLocation ? 'Perbarui Lokasi' : 'Lokasi Belanja (GPS)'}</span>
                </button>
              </div>

              {receiptLocation && (
                <div className="flex items-center gap-1.5 text-xs text-stone-600 font-mono bg-stone-100 px-2 py-1 rounded-md">
                  <span>{receiptLocation}</span>
                  <button
                    type="button"
                    onClick={() => setReceiptLocation(undefined)}
                    className="text-stone-400 hover:text-rose-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            {receiptPhoto && (
              <div className="relative inline-block mt-1">
                <img
                  src={receiptPhoto}
                  alt="Struk belanja"
                  className="w-24 h-24 object-cover rounded-xl border border-stone-200 shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setReceiptPhoto(undefined)}
                  className="absolute -top-1.5 -right-1.5 p-1 bg-stone-900 text-white rounded-full hover:bg-rose-600 transition-colors shadow-xs"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-4 py-2 text-xs font-medium text-stone-600 hover:text-stone-900 rounded-lg cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-6 py-2 text-xs font-medium bg-stone-900 text-white rounded-xl hover:bg-stone-800 transition-colors shadow-2xs cursor-pointer"
              >
                Simpan Transaksi
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Visual Analytics Chart Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Expense Bar Chart */}
        <div className="lg:col-span-2 bg-white border border-stone-200/90 rounded-2xl p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-stone-800" />
                <h3 className="text-sm font-semibold text-stone-900">
                  Grafik Pengeluaran Harian · {monthLabel}
                </h3>
              </div>
              <span className="text-xs font-mono text-stone-500">
                Puncak: <strong className="text-stone-800">{formatRupiah(maxDailyExpense > 1 ? maxDailyExpense : 0)}</strong>
              </span>
            </div>

            {/* Interactive SVG / Bar Chart with subtle grid */}
            <div className="pt-4 pb-2">
              <div className="h-48 flex items-end gap-1 sm:gap-1.5 px-1 border-b border-stone-200 relative">
                {/* Average reference line */}
                {avgDailyExpense > 0 && maxDailyExpense > 0 && (
                  <div
                    className="absolute left-0 right-0 border-b border-dashed border-stone-300 pointer-events-none z-10"
                    style={{ bottom: `${Math.min((avgDailyExpense / maxDailyExpense) * 100, 95)}%` }}
                  >
                    <span className="absolute right-0 -top-4 text-[9px] font-mono text-stone-400 bg-white/90 px-1 rounded">
                      Rata-rata: {formatRupiah(avgDailyExpense)}
                    </span>
                  </div>
                )}

                {dailyExpenses.map((item) => {
                  const heightPercent = maxDailyExpense > 0 ? (item.amount / maxDailyExpense) * 100 : 0;
                  const isCurrentDay = item.dateStr === new Date().toISOString().split('T')[0];
                  const isHovered = hoveredDay === item.day;

                  return (
                    <div
                      key={item.day}
                      onMouseEnter={() => setHoveredDay(item.day)}
                      onMouseLeave={() => setHoveredDay(null)}
                      className="flex-1 flex flex-col items-center justify-end h-full relative cursor-pointer group"
                    >
                      {/* Floating tooltip */}
                      {isHovered && (
                        <div className="absolute bottom-full mb-2 flex flex-col items-center z-30 pointer-events-none animate-in fade-in duration-100">
                          <div className="bg-stone-900 text-white text-[11px] font-mono py-1.5 px-2.5 rounded-lg shadow-xl whitespace-nowrap text-center">
                            <p className="font-bold">Tanggal {item.day}</p>
                            <p className="text-stone-300">{formatRupiah(item.amount)}</p>
                            <p className="text-[10px] text-stone-400">{item.count} transaksi</p>
                          </div>
                          <div className="w-1.5 h-1.5 bg-stone-900 rotate-45 -mt-0.5" />
                        </div>
                      )}

                      {/* Bar Pillar */}
                      <div
                        className={`w-full rounded-t transition-all duration-200 ${
                          item.amount > 0
                            ? isHovered
                              ? 'bg-rose-600 scale-y-105'
                              : isCurrentDay
                              ? 'bg-rose-500'
                              : item.amount > avgDailyExpense
                              ? 'bg-stone-800'
                              : 'bg-stone-600'
                            : 'bg-stone-100 hover:bg-stone-200'
                        }`}
                        style={{ height: `${Math.max(heightPercent, item.amount > 0 ? 5 : 2)}%` }}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Day numbers labels */}
              <div className="flex items-center justify-between text-[10px] font-mono text-stone-400 mt-2 px-1">
                <span>1</span>
                <span>5</span>
                <span>10</span>
                <span>15</span>
                <span>20</span>
                <span>25</span>
                <span>{daysInMonth}</span>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-stone-400 pt-3 border-t border-stone-100 mt-2 flex items-center justify-between">
            <span>Arahkan kursor pada batang untuk melihat nominal harian.</span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-xs bg-rose-500" /> Hari ini
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-xs bg-stone-800" /> Di atas rata-rata
              </span>
            </div>
          </div>
        </div>

        {/* Category Breakdown & Distribution */}
        <div className="bg-white border border-stone-200/90 rounded-2xl p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-stone-800" />
                <h3 className="text-sm font-semibold text-stone-900">
                  Distribusi Kategori
                </h3>
              </div>
              {selectedCategoryFilter !== 'all' && (
                <button
                  type="button"
                  onClick={() => setSelectedCategoryFilter('all')}
                  className="text-[11px] text-stone-500 hover:text-stone-900 underline cursor-pointer"
                >
                  Reset Filter
                </button>
              )}
            </div>

            {/* Visual Multi-segment Progress Bar */}
            <div className="h-3 w-full bg-stone-100 rounded-full flex overflow-hidden mb-4">
              {categoryBreakdown.map((cat) => (
                <div
                  key={cat.category}
                  title={`${cat.category}: ${cat.percentage.toFixed(1)}%`}
                  style={{
                    width: `${cat.percentage}%`,
                    backgroundColor: cat.color,
                  }}
                  className="h-full transition-all cursor-pointer hover:opacity-80"
                  onClick={() => setSelectedCategoryFilter(cat.category)}
                />
              ))}
            </div>

            {/* Category breakdown item list */}
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {categoryBreakdown.length === 0 ? (
                <p className="text-xs text-stone-400 py-6 text-center">
                  Belum ada pengeluaran di bulan ini.
                </p>
              ) : (
                categoryBreakdown.map((cat) => {
                  const isSelected = selectedCategoryFilter === cat.category;

                  return (
                    <div
                      key={cat.category}
                      onClick={() =>
                        setSelectedCategoryFilter(isSelected ? 'all' : cat.category)
                      }
                      className={`flex items-center justify-between text-xs p-1.5 rounded-lg cursor-pointer transition-colors ${
                        isSelected ? 'bg-stone-100 font-semibold' : 'hover:bg-stone-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-xs shrink-0"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="text-stone-700 truncate max-w-[130px]">
                          {cat.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-stone-400 text-[11px]">
                          {cat.percentage.toFixed(0)}%
                        </span>
                        <span className="font-semibold text-stone-900">
                          {formatRupiah(cat.total)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {categoryBreakdown.length > 0 && (
            <div className="pt-3 border-t border-stone-100 text-[11px] text-stone-500 mt-2">
              Kategori tertinggi: <strong className="text-stone-900">{categoryBreakdown[0].category}</strong> ({categoryBreakdown[0].percentage.toFixed(1)}%)
            </div>
          )}
        </div>
      </div>

      {/* Transaction History & Records List */}
      <div className="bg-white border border-stone-200/90 rounded-2xl p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-stone-800" />
            <h3 className="text-sm font-semibold text-stone-900">
              Riwayat Transaksi ({filteredList.length})
            </h3>
            {selectedCategoryFilter !== 'all' && (
              <span className="text-xs text-stone-500 font-normal">
                · Filter: {selectedCategoryFilter}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filter type buttons */}
            <div className="flex items-center p-0.5 bg-stone-200/60 rounded-lg">
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  filterType === 'all'
                    ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => setFilterType('expense')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  filterType === 'expense'
                    ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Pengeluaran
              </button>
              <button
                type="button"
                onClick={() => setFilterType('income')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  filterType === 'income'
                    ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Pemasukan
              </button>
            </div>

            {/* Search input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari transaksi..."
                className="pl-8 pr-3 py-1 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:bg-white"
              />
            </div>
          </div>
        </div>

        {filteredList.length === 0 ? (
          <p className="text-xs text-stone-400 py-8 text-center">
            Tidak ada transaksi yang cocok untuk periode ini.
          </p>
        ) : (
          <div className="divide-y divide-stone-100">
            {filteredList.map((rec) => {
              const isExpense = rec.type === 'expense';

              return (
                <div
                  key={rec.id}
                  className="py-3 flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        isExpense ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
                      }`}
                    >
                      {isExpense ? (
                        <ArrowDownRight className="w-4 h-4" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-stone-900">
                          {rec.category}
                        </span>
                        {rec.paymentMethod && (
                          <span className="text-[11px] text-stone-400 font-mono">
                            · {rec.paymentMethod}
                          </span>
                        )}
                      </div>
                      {rec.notes && (
                        <p className="text-[11px] text-stone-500 mt-0.5">{rec.notes}</p>
                      )}
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] font-mono text-stone-400">
                        <span>
                          {new Date(rec.date).toLocaleDateString('id-ID', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                        {rec.location && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="flex items-center gap-0.5 text-stone-500">
                              <MapPin className="w-2.5 h-2.5 text-rose-500" />
                              <span>{rec.location}</span>
                            </span>
                          </>
                        )}
                        {rec.receiptPhoto && (
                          <>
                            <span aria-hidden="true">·</span>
                            <button
                              type="button"
                              onClick={() => setSelectedReceiptImage(rec.receiptPhoto || null)}
                              className="flex items-center gap-1 text-stone-700 font-semibold hover:text-stone-900 bg-stone-100 hover:bg-stone-200 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                            >
                              <Camera className="w-2.5 h-2.5 text-stone-700" />
                              <span>Lihat Struk</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`font-mono text-xs sm:text-sm font-bold ${
                        isExpense ? 'text-stone-900' : 'text-emerald-600'
                      }`}
                    >
                      {isExpense ? '-' : '+'} {formatRupiah(rec.amount)}
                    </span>

                    <button
                      type="button"
                      onClick={() => onDeleteRecord(rec.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-stone-300 hover:text-rose-600 transition-opacity cursor-pointer"
                      title="Hapus transaksi"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Fullscreen Receipt Lightbox Modal */}
      {selectedReceiptImage && (
        <div 
          onClick={() => setSelectedReceiptImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/80 backdrop-blur-xs cursor-pointer animate-in fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-lg w-full p-4 sm:p-5 shadow-2xl space-y-3 cursor-default"
          >
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <span className="text-xs font-semibold text-stone-800">Bukti Struk Belanja</span>
              <button
                type="button"
                onClick={() => setSelectedReceiptImage(null)}
                className="p-1 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="rounded-xl overflow-hidden bg-stone-100 flex items-center justify-center max-h-[75vh]">
              <img
                src={selectedReceiptImage}
                alt="Bukti struk"
                className="w-full h-auto object-contain max-h-[70vh]"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
