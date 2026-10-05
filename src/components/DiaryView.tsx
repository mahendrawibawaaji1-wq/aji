import { useState, useMemo, useEffect, useRef } from 'react';
import { DiaryEntry, MoodType } from '../types';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  HelpCircle, 
  Printer, 
  Calendar, 
  Heart, 
  X, 
  FileText, 
  Clock, 
  BookOpen, 
  Share2, 
  Check,
  Camera,
  MapPin,
  Image as ImageIcon
} from 'lucide-react';
import { requestLocationPermission } from '../utils/devicePermissions';
import { compressImageFile } from '../utils/imageCompressor';
import { getLocalDateString } from '../utils/calendarSync';

interface DiaryViewProps {
  entries: DiaryEntry[];
  onSaveEntry: (entry: DiaryEntry) => void;
  onDeleteEntry: (id: string) => void;
  initialDate?: string;
  isWritingInitial?: boolean;
}

const MOOD_CONFIG: Record<MoodType, { label: string; icon: string }> = {
  senang: { label: 'Senang', icon: '☀️' },
  tenang: { label: 'Tenang', icon: '🍃' },
  produktif: { label: 'Produktif', icon: '⚡' },
  bersyukur: { label: 'Bersyukur', icon: '🙏' },
  lelah: { label: 'Lelah', icon: '🌙' },
  cemas: { label: 'Cemas', icon: '🌧️' },
};

// Human-curated philosophical self-reflection prompts (Strictly NO AI)
const CURATED_REFLECTIONS = [
  'Apa hal sederhana atau momen kecil yang membuatmu tersenyum hari ini?',
  'Tantangan apa yang paling menyita energimu hari ini, dan bagaimana caramu meresponnya?',
  'Pelajaran hidup atau wawasan berharga apa yang kamu petik hari ini?',
  'Bagaimana kondisi batin dan tubuhmu saat ini? Hal apa yang paling kamu butuhkan?',
  'Satu pencapaian atau progres kecil yang patut kamu apresiasi pada dirimu sendiri:',
  'Percakapan atau interaksi hangat apa yang paling berkesan sepanjang hari ini?',
];

export function DiaryView({ 
  entries, 
  onSaveEntry, 
  onDeleteEntry,
  initialDate,
  isWritingInitial = false
}: DiaryViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMoodFilter, setSelectedMoodFilter] = useState<string>('all');
  const [isWriting, setIsWriting] = useState(isWritingInitial);
  const [activeEntry, setActiveEntry] = useState<DiaryEntry | null>(null);
  const [readingEntry, setReadingEntry] = useState<DiaryEntry | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [date, setDate] = useState(() => initialDate || getLocalDateString());
  const [time, setTime] = useState(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });
  const [mood, setMood] = useState<MoodType>('tenang');
  const [tagsInput, setTagsInput] = useState('');
  const [gratitude, setGratitude] = useState('');
  const [weather, setWeather] = useState('Cerah');
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(undefined);
  const [location, setLocation] = useState<string | undefined>(undefined);
  const [isLocating, setIsLocating] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // React to prop changes from outside (e.g. from Glance or Calendar)
  useEffect(() => {
    if (isWritingInitial) {
      setIsWriting(true);
    }
  }, [isWritingInitial]);

  useEffect(() => {
    if (initialDate) {
      setDate(initialDate);
    }
  }, [initialDate]);

  const startNewEntry = (targetDate?: string) => {
    setActiveEntry(null);
    setTitle('');
    setContent('');
    setDate(targetDate || getLocalDateString());
    const d = new Date();
    setTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
    setMood('tenang');
    setTagsInput('');
    setGratitude('');
    setWeather('Cerah');
    setPhotoUrl(undefined);
    setLocation(undefined);
    setIsWriting(true);
    setReadingEntry(null);
  };

  const editEntry = (entry: DiaryEntry) => {
    setActiveEntry(entry);
    setTitle(entry.title);
    setContent(entry.content);
    setDate(entry.date);
    setTime(entry.time);
    setMood(entry.mood);
    setTagsInput(entry.tags.join(', '));
    setGratitude(entry.gratitude || '');
    setWeather(entry.weather || 'Cerah');
    setPhotoUrl(entry.photoUrl);
    setLocation(entry.location);
    setIsWriting(true);
    setReadingEntry(null);
  };

  const [locationFeedback, setLocationFeedback] = useState<string | null>(null);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImageFile(file);
        setPhotoUrl(compressed);
      } catch (err) {
        console.error('Failed to compress image', err);
      }
    }
  };

  const handleGetLocation = async () => {
    setIsLocating(true);
    setLocationFeedback(null);
    try {
      const res = await requestLocationPermission();
      if (res.state === 'granted' && res.coords) {
        setLocation(`GPS: ${res.coords.latitude}, ${res.coords.longitude}`);
        setLocationFeedback('Lokasi berhasil disematkan.');
      } else {
        setLocationFeedback(res.error || 'Izin lokasi HP belum aktif.');
      }
    } finally {
      setIsLocating(false);
      setTimeout(() => setLocationFeedback(null), 3500);
    }
  };

  const handleApplyCuratedPrompt = () => {
    const prompt = CURATED_REFLECTIONS[Math.floor(Math.random() * CURATED_REFLECTIONS.length)];
    setContent((prev) => {
      const prefix = prev.trim() ? `${prev}\n\n` : '';
      return `${prefix}💬 *${prompt}*\n`;
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() && !content.trim()) return;

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0);

    const newEntry: DiaryEntry = {
      id: activeEntry ? activeEntry.id : `diary-${Date.now()}`,
      title: title.trim() || 'Catatan Refleksi',
      content: content.trim(),
      date,
      time,
      mood,
      tags,
      gratitude: gratitude.trim() || undefined,
      weather: weather.trim() || undefined,
      photoUrl: photoUrl || undefined,
      location: location || undefined,
      updatedAt: Date.now(),
    };

    onSaveEntry(newEntry);
    setIsWriting(false);
  };

  const handleCopyText = (entry: DiaryEntry) => {
    const text = `${entry.title}\n${entry.date} · ${entry.time}\n\n${entry.content}${entry.gratitude ? `\n\nHal yang disyukuri: ${entry.gratitude}` : ''}`;
    navigator.clipboard.writeText(text);
    setCopiedId(entry.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Filtered entries
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const matchSearch =
        entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchMood = selectedMoodFilter === 'all' || entry.mood === selectedMoodFilter;
      return matchSearch && matchMood;
    });
  }, [entries, searchQuery, selectedMoodFilter]);

  // Statistics
  const totalWords = useMemo(() => {
    return entries.reduce((acc, curr) => acc + curr.content.split(/\s+/).filter(Boolean).length, 0);
  }, [entries]);

  const uniqueDaysCount = useMemo(() => {
    return new Set(entries.map((e) => e.date)).size;
  }, [entries]);

  return (
    <div className="space-y-6">
      {/* Title & Top Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-stone-200">
        <div>
          <h1 className="font-serif-diary text-3xl font-semibold text-stone-900 tracking-tight">
            Diary & Jurnal Harian
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            Ruang privat untuk mencatat perjalanan rasa, perenungan, dan hal-hal yang kamu syukuri.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => startNewEntry()}
            className="flex items-center gap-2 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-stone-50 text-xs sm:text-sm font-medium rounded-xl transition-all shadow-[0_1px_3px_rgba(0,0,0,0.1)] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tulis Catatan Baru</span>
          </button>
        </div>
      </div>

      {/* Reading Modal View if user clicks to read comfortably */}
      {readingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl border border-stone-200 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100 mb-6">
              <div className="flex items-center gap-2 text-xs text-stone-500 font-mono">
                <span>{new Date(readingEntry.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
                <span aria-hidden="true">·</span>
                <span>{readingEntry.time}</span>
                <span aria-hidden="true">·</span>
                <span>{MOOD_CONFIG[readingEntry.mood].icon} {MOOD_CONFIG[readingEntry.mood].label}</span>
                {readingEntry.location && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="flex items-center gap-1 text-stone-600">
                      <MapPin className="w-3 h-3 text-rose-500" />
                      <span>{readingEntry.location}</span>
                    </span>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={() => setReadingEntry(null)}
                className="p-1 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <h2 className="font-serif-diary text-3xl font-bold text-stone-900 mb-4 leading-tight">
              {readingEntry.title}
            </h2>

            <div className="font-serif-diary text-lg text-stone-800 leading-relaxed whitespace-pre-line space-y-4 mb-6">
              {readingEntry.content}
            </div>

            {readingEntry.photoUrl && (
              <div className="mb-6 rounded-2xl overflow-hidden border border-stone-200">
                <img
                  src={readingEntry.photoUrl}
                  alt={readingEntry.title}
                  className="w-full max-h-[420px] object-cover"
                />
              </div>
            )}

            {readingEntry.gratitude && (
              <div className="p-4 bg-stone-50 border-l-2 border-stone-400 rounded-r-xl my-6">
                <p className="text-xs font-semibold text-stone-600 mb-1">Rasa syukur hari ini:</p>
                <p className="font-serif-diary text-stone-900 italic text-base">"{readingEntry.gratitude}"</p>
              </div>
            )}

            {readingEntry.tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-stone-500 pt-4 border-t border-stone-100">
                <span className="text-stone-400">Topik:</span>
                {readingEntry.tags.map((t) => (
                  <span key={t} className="font-mono text-stone-700">#{t}</span>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between pt-6 border-t border-stone-100 mt-6">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyText(readingEntry)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200/80 rounded-lg transition-colors cursor-pointer"
                >
                  {copiedId === readingEntry.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Salin Teks</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200/80 rounded-lg transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => editEntry(readingEntry)}
                  className="px-4 py-1.5 text-xs font-medium bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors"
                >
                  Sunting
                </button>
                <button
                  type="button"
                  onClick={() => setReadingEntry(null)}
                  className="px-4 py-1.5 text-xs font-medium text-stone-600 hover:text-stone-900 rounded-lg"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Writing / Editing Panel */}
      {isWriting && (
        <div className="bg-white border border-stone-200/90 rounded-2xl p-6 sm:p-8 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] transition-all animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-4 mb-6 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-stone-700" />
              <h2 className="text-base font-semibold text-stone-900">
                {activeEntry ? 'Sunting Catatan Diary' : 'Lembar Jurnal Baru'}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setIsWriting(false)}
              className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-5">
            {/* Metadata Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-stone-50/70 p-3.5 rounded-xl border border-stone-200/60">
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Tanggal</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full text-xs font-mono bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-stone-400"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Waktu</label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full text-xs font-mono bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-stone-400"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Cuaca</label>
                <input
                  type="text"
                  value={weather}
                  onChange={(e) => setWeather(e.target.value)}
                  placeholder="Cerah / Hujan sejuk"
                  className="w-full text-xs bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-stone-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Suasana Hati</label>
                <select
                  value={mood}
                  onChange={(e) => setMood(e.target.value as MoodType)}
                  className="w-full text-xs bg-white border border-stone-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-stone-400 cursor-pointer"
                >
                  <option value="tenang">🍃 Tenang</option>
                  <option value="senang">☀️ Senang</option>
                  <option value="produktif">⚡ Produktif</option>
                  <option value="bersyukur">🙏 Bersyukur</option>
                  <option value="lelah">🌙 Lelah</option>
                  <option value="cemas">🌧️ Cemas</option>
                </select>
              </div>
            </div>

            {/* Title */}
            <div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Judul catatan atau intisari hari ini..."
                className="w-full font-serif-diary text-2xl sm:text-3xl font-bold text-stone-900 placeholder:text-stone-300 border-0 border-b border-stone-200 pb-2 focus:ring-0 focus:outline-none focus:border-stone-600 transition-colors"
              />
            </div>

            {/* Curated Prompt Helper */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-stone-400">
                Gunakan pertanyaan refleksi untuk memandu tulisanmu jika sedang buntu
              </span>
              <button
                type="button"
                onClick={handleApplyCuratedPrompt}
                className="flex items-center gap-1.5 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200/90 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5 text-stone-600" />
                <span>Pertanyaan Refleksi</span>
              </button>
            </div>

            {/* Content Body */}
            <div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Tuliskan apa yang kamu alami, rasakan, dan renungkan dengan jujur..."
                rows={11}
                className="w-full font-serif-diary text-base sm:text-lg leading-relaxed text-stone-800 placeholder:text-stone-300 p-4 bg-stone-50/40 rounded-xl border border-stone-200 focus:outline-none focus:border-stone-400 focus:bg-white transition-all"
                required
              />
            </div>

            {/* Gratitude Box */}
            <div className="bg-stone-50 p-4 rounded-xl border border-stone-200/70">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-stone-700 mb-1.5">
                <Heart className="w-3.5 h-3.5 text-rose-500" />
                <span>Rasa syukur hari ini:</span>
              </label>
              <input
                type="text"
                value={gratitude}
                onChange={(e) => setGratitude(e.target.value)}
                placeholder="Contoh: Secangkir kopi hangat di pagi hari, udara segar, atau canda tawa keluarga..."
                className="w-full text-xs sm:text-sm bg-white border border-stone-200 rounded-lg px-3 py-2 focus:outline-none focus:border-stone-400"
              />
            </div>

            {/* Tags Input */}
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">
                Topik / Label (pisahkan dengan koma):
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="kerja, mindfulness, keluarga, target"
                className="w-full text-xs bg-white border border-stone-200 rounded-lg px-3 py-2 focus:outline-none focus:border-stone-400"
              />
            </div>

            {/* Device Integration Toolbar: Photo & GPS Location */}
            <div className="pt-2 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>{photoUrl ? 'Ganti Foto HP' : 'Sematkan Foto HP'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleGetLocation}
                  disabled={isLocating}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
                >
                  <MapPin className="w-3.5 h-3.5 text-rose-500" />
                  <span>{isLocating ? 'Mencari...' : location ? 'Perbarui Lokasi' : 'Sematkan Lokasi GPS'}</span>
                </button>
                {locationFeedback && (
                  <span className="text-[11px] text-stone-500 animate-in fade-in">
                    {locationFeedback}
                  </span>
                )}
              </div>

              {location && (
                <div className="flex items-center gap-1.5 text-xs text-stone-600 font-mono bg-stone-100 px-2 py-1 rounded-md">
                  <span>{location}</span>
                  <button
                    type="button"
                    onClick={() => setLocation(undefined)}
                    className="text-stone-400 hover:text-rose-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            {/* Photo preview thumbnail in form */}
            {photoUrl && (
              <div className="relative inline-block mt-2">
                <img
                  src={photoUrl}
                  alt="Lampiran diary"
                  className="w-32 h-24 object-cover rounded-xl border border-stone-200 shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setPhotoUrl(undefined)}
                  className="absolute -top-1.5 -right-1.5 p-1 bg-stone-900 text-white rounded-full hover:bg-rose-600 transition-colors shadow-xs"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setIsWriting(false)}
                className="px-4 py-2 text-xs font-medium text-stone-600 hover:text-stone-900 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-6 py-2 text-xs font-medium bg-stone-900 hover:bg-stone-800 text-white rounded-xl transition-all shadow-xs cursor-pointer"
              >
                Simpan Catatan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari catatan atau topik..."
            className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-white border border-stone-200 rounded-xl focus:outline-none focus:border-stone-400"
          />
        </div>

        {/* Mood filter segmented buttons (Anti-slop compliant) */}
        <div className="flex items-center gap-1 overflow-x-auto p-1 bg-stone-200/60 rounded-xl">
          <button
            type="button"
            onClick={() => setSelectedMoodFilter('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              selectedMoodFilter === 'all'
                ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Semua ({entries.length})
          </button>
          {(Object.keys(MOOD_CONFIG) as MoodType[]).map((m) => {
            const count = entries.filter((e) => e.mood === m).length;
            if (count === 0 && selectedMoodFilter !== m) return null;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setSelectedMoodFilter(m)}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap flex items-center gap-1 cursor-pointer ${
                  selectedMoodFilter === m
                    ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <span>{MOOD_CONFIG[m].icon}</span>
                <span>{MOOD_CONFIG[m].label}</span>
                <span className="text-[10px] text-stone-400">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Entries List */}
      {filteredEntries.length === 0 ? (
        <div className="text-center py-16 bg-white border border-dashed border-stone-200 rounded-2xl">
          <FileText className="w-8 h-8 mx-auto text-stone-300 mb-2" />
          <p className="text-sm font-medium text-stone-600">Belum ada catatan diary</p>
          <p className="text-xs text-stone-400 mt-1">
            Mulailah menulis catatan harian untuk merekam perjalanan hidupmu.
          </p>
          <button
            type="button"
            onClick={() => startNewEntry()}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-stone-900 text-stone-50 rounded-xl hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Mulai Menulis</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredEntries.map((entry) => {
            const wordCount = entry.content.split(/\s+/).filter(Boolean).length;
            const moodInfo = MOOD_CONFIG[entry.mood] || MOOD_CONFIG.tenang;

            return (
              <article
                key={entry.id}
                className="bg-white border border-stone-200/90 rounded-2xl p-5 sm:p-6 hover:border-stone-300 hover:shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)] transition-all shadow-[0_1px_3px_rgba(0,0,0,0.02)]"
              >
                {/* Header Metadata (Clean unboxed typography) */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-stone-500 mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-stone-700 font-semibold">
                      {new Date(entry.date).toLocaleDateString('id-ID', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                    <span aria-hidden="true" className="text-stone-300">·</span>
                    <span className="font-mono">{entry.time}</span>
                    <span aria-hidden="true" className="text-stone-300">·</span>
                    <span className="flex items-center gap-1">
                      <span>{moodInfo.icon}</span>
                      <span>{moodInfo.label}</span>
                    </span>
                    {entry.weather && (
                      <>
                        <span aria-hidden="true" className="text-stone-300">·</span>
                        <span>{entry.weather}</span>
                      </>
                    )}
                    {entry.location && (
                      <>
                        <span aria-hidden="true" className="text-stone-300">·</span>
                        <span className="flex items-center gap-0.5 text-stone-600">
                          <MapPin className="w-3 h-3 text-rose-500" />
                          <span>{entry.location}</span>
                        </span>
                      </>
                    )}
                    <span aria-hidden="true" className="text-stone-300">·</span>
                    <span>{wordCount} kata</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setReadingEntry(entry)}
                      className="p-1.5 text-stone-500 hover:text-stone-900 rounded-md hover:bg-stone-100 transition-colors cursor-pointer"
                      title="Baca selengkapnya"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopyText(entry)}
                      className="p-1.5 text-stone-500 hover:text-stone-900 rounded-md hover:bg-stone-100 transition-colors cursor-pointer"
                      title="Salin teks catatan"
                    >
                      {copiedId === entry.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => editEntry(entry)}
                      className="p-1.5 text-stone-500 hover:text-stone-900 rounded-md hover:bg-stone-100 transition-colors cursor-pointer"
                      title="Sunting catatan"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('Hapus catatan diary ini?')) {
                          onDeleteEntry(entry.id);
                        }
                      }}
                      className="p-1.5 text-stone-400 hover:text-rose-600 rounded-md hover:bg-stone-100 transition-colors cursor-pointer"
                      title="Hapus catatan"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Entry Title */}
                <h3 
                  onClick={() => setReadingEntry(entry)}
                  className="font-serif-diary text-xl sm:text-2xl font-semibold text-stone-900 mb-2 leading-snug cursor-pointer hover:text-stone-700 transition-colors"
                >
                  {entry.title}
                </h3>

                {/* Entry Content snippet */}
                <p className="font-serif-diary text-sm sm:text-base text-stone-700 leading-relaxed whitespace-pre-line mb-3 line-clamp-4">
                  {entry.content}
                </p>

                {/* Attached Photo */}
                {entry.photoUrl && (
                  <div className="mb-4">
                    <img
                      src={entry.photoUrl}
                      alt={entry.title}
                      className="max-h-64 rounded-xl object-cover border border-stone-200 shadow-2xs"
                    />
                  </div>
                )}

                {/* Gratitude highlight if exists */}
                {entry.gratitude && (
                  <div className="bg-stone-50/80 border-l-2 border-stone-400 px-3.5 py-2.5 my-3 rounded-r-xl">
                    <p className="text-xs text-stone-500 font-medium">Syukur hari ini:</p>
                    <p className="font-serif-diary text-xs sm:text-sm text-stone-800 italic mt-0.5">"{entry.gratitude}"</p>
                  </div>
                )}

                {/* Footer Tags (Unboxed text with bullet separators) */}
                {entry.tags.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-3 border-t border-stone-100 text-xs text-stone-400">
                    <span>Label:</span>
                    {entry.tags.map((tag, idx) => (
                      <span key={tag} className="text-stone-600 font-mono text-[11px]">
                        #{tag}
                        {idx < entry.tags.length - 1 && <span className="text-stone-300 ml-1">·</span>}
                      </span>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Summary Stats Footer */}
      <div className="pt-4 border-t border-stone-200 flex flex-wrap items-center justify-between text-xs text-stone-500 gap-2">
        <div className="flex items-center gap-3">
          <span>{entries.length} Catatan tersimpan</span>
          <span aria-hidden="true" className="text-stone-300">·</span>
          <span>{uniqueDaysCount} Hari terekam</span>
          <span aria-hidden="true" className="text-stone-300">·</span>
          <span>{totalWords.toLocaleString('id-ID')} Total kata</span>
        </div>
      </div>
    </div>
  );
}
