import { useRef, useState, useEffect, useCallback } from 'react';
import { 
  Download, 
  Upload, 
  RotateCcw, 
  X, 
  ShieldCheck, 
  Check, 
  Cloud, 
  CloudUpload, 
  RefreshCw, 
  Trash2, 
  AlertCircle,
  FileText
} from 'lucide-react';
import { User } from 'firebase/auth';
import { DiaryEntry, TaskItem, FinanceRecord, DailyAlarm } from '../types';
import { initialAlarms, initialDiaryEntries, initialFinanceRecords, initialTasks } from '../utils/dummyData';
import { downloadFile, getLocalDateString } from '../utils/calendarSync';
import {
  initAuth,
  googleSignIn,
  logout,
  uploadBackupToDrive,
  listDriveBackups,
  downloadBackupFromDrive,
  deleteBackupFromDrive,
  DriveBackupFile,
  getAccessToken
} from '../utils/googleDrive';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  diaryEntries: DiaryEntry[];
  tasks: TaskItem[];
  financeRecords: FinanceRecord[];
  alarms: DailyAlarm[];
  onRestoreData: (data: {
    diaryEntries: DiaryEntry[];
    tasks: TaskItem[];
    financeRecords: FinanceRecord[];
    alarms: DailyAlarm[];
  }) => void;
}

export function BackupModal({
  isOpen,
  onClose,
  diaryEntries,
  tasks,
  financeRecords,
  alarms,
  onRestoreData,
}: BackupModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Google Drive Authentication & State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isBackingUpToDrive, setIsBackingUpToDrive] = useState(false);
  const [driveBackups, setDriveBackups] = useState<DriveBackupFile[]>([]);
  const [isLoadingDriveList, setIsLoadingDriveList] = useState(false);

  // Destructive Confirmation Modal State
  const [pendingAction, setPendingAction] = useState<{
    type: 'restore' | 'delete' | 'reset-demo';
    file?: DriveBackupFile;
  } | null>(null);

  const fetchDriveBackups = useCallback(async (token: string) => {
    setIsLoadingDriveList(true);
    try {
      const files = await listDriveBackups(token);
      setDriveBackups(files);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal memuat daftar cadangan dari Google Drive';
      console.warn('Could not load drive backups:', message);
    } finally {
      setIsLoadingDriveList(false);
    }
  }, []);

  // Listen to Auth State
  useEffect(() => {
    if (!isOpen) return;

    const unsubscribe = initAuth(
      (user, token) => {
        setCurrentUser(user);
        setAccessToken(token);
        fetchDriveBackups(token);
      },
      () => {
        setCurrentUser(null);
        setAccessToken(null);
        setDriveBackups([]);
      }
    );

    // Also check current memory token if already logged in
    getAccessToken().then((token) => {
      if (token) {
        setAccessToken(token);
        fetchDriveBackups(token);
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [isOpen, fetchDriveBackups]);

  if (!isOpen) return null;

  const handleConnectDrive = async () => {
    setIsConnecting(true);
    setErrorMsg(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setCurrentUser(result.user);
        setAccessToken(result.accessToken);
        setSuccessMsg('Terhubung ke Google Drive!');
        setTimeout(() => setSuccessMsg(null), 3000);
        fetchDriveBackups(result.accessToken);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal menghubungkan Google Drive.';
      setErrorMsg(message);
      setTimeout(() => setErrorMsg(null), 5000);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnectDrive = async () => {
    try {
      await logout();
      setCurrentUser(null);
      setAccessToken(null);
      setDriveBackups([]);
      setSuccessMsg('Koneksi Google Drive diputus.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const prepareBackupPayload = () => {
    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      appName: 'AJI Personal Daily App',
      data: {
        diaryEntries,
        tasks,
        financeRecords,
        alarms,
      },
    };
  };

  const handleBackupToDrive = async () => {
    if (!accessToken) {
      setErrorMsg('Silakan hubungkan akun Google terlebih dahulu.');
      return;
    }

    setIsBackingUpToDrive(true);
    setErrorMsg(null);
    try {
      const payload = prepareBackupPayload();
      const localDate = getLocalDateString();
      const filename = `aji_backup_${localDate}_${new Date().toLocaleTimeString('id-ID').replace(/:/g, '-')}.json`;
      
      await uploadBackupToDrive(accessToken, payload, filename);
      setSuccessMsg('Data berhasil dicadangkan ke Google Drive!');
      setTimeout(() => setSuccessMsg(null), 3500);
      fetchDriveBackups(accessToken);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal mengunggah cadangan ke Google Drive.';
      setErrorMsg(message);
      setTimeout(() => setErrorMsg(null), 5000);
    } finally {
      setIsBackingUpToDrive(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!pendingAction) return;

    if (pendingAction.type === 'reset-demo') {
      onRestoreData({
        diaryEntries: initialDiaryEntries,
        tasks: initialTasks,
        financeRecords: initialFinanceRecords,
        alarms: initialAlarms,
      });
      setSuccessMsg('Data telah disetel ulang ke kondisi awal.');
      setTimeout(() => setSuccessMsg(null), 3000);
      setPendingAction(null);
      return;
    }

    if (!accessToken || !pendingAction.file) {
      setPendingAction(null);
      return;
    }

    const file = pendingAction.file;
    if (pendingAction.type === 'restore') {
      try {
        const parsed = await downloadBackupFromDrive(accessToken, file.id);
        if (parsed?.data) {
          onRestoreData({
            diaryEntries: parsed.data.diaryEntries || [],
            tasks: parsed.data.tasks || [],
            financeRecords: parsed.data.financeRecords || [],
            alarms: parsed.data.alarms || [],
          });
          setSuccessMsg(`Data berhasil dipulihkan dari cadangan Drive (${file.name})!`);
          setTimeout(() => setSuccessMsg(null), 3500);
        } else {
          setErrorMsg('Format berkas cadangan Google Drive tidak valid.');
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Gagal memulihkan dari Google Drive.';
        setErrorMsg(message);
      } finally {
        setPendingAction(null);
      }
    } else if (pendingAction.type === 'delete') {
      try {
        await deleteBackupFromDrive(accessToken, file.id);
        setSuccessMsg(`Berkas cadangan '${file.name}' telah dihapus dari Google Drive.`);
        setTimeout(() => setSuccessMsg(null), 3000);
        fetchDriveBackups(accessToken);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Gagal menghapus berkas cadangan di Google Drive.';
        setErrorMsg(message);
      } finally {
        setPendingAction(null);
      }
    }
  };

  const handleExportJson = () => {
    const backupData = prepareBackupPayload();
    const str = JSON.stringify(backupData, null, 2);
    downloadFile(
      `aji-cadangan-data-${getLocalDateString()}.json`,
      str,
      'application/json'
    );
    setSuccessMsg('Berkas cadangan lokal (.json) berhasil diunduh!');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed?.data) {
          onRestoreData({
            diaryEntries: parsed.data.diaryEntries || [],
            tasks: parsed.data.tasks || [],
            financeRecords: parsed.data.financeRecords || [],
            alarms: parsed.data.alarms || [],
          });
          setSuccessMsg('Data berhasil dipulihkan dari berkas cadangan lokal!');
          setTimeout(() => setSuccessMsg(null), 3000);
        } else {
          setErrorMsg('Format berkas cadangan tidak sesuai.');
        }
      } catch {
        setErrorMsg('Gagal membaca berkas cadangan JSON.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col p-4 sm:p-6 shadow-xl border border-stone-200 animate-in fade-in duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-100 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-stone-100 rounded-lg text-stone-800">
              <ShieldCheck className="w-5 h-5 text-stone-800" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900">
                Setelan Penyimpanan & Cadangan
              </h2>
              <p className="text-[11px] text-stone-400">
                Google Drive & Berkas Lokal
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-100 cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto space-y-4 py-3 pr-1">
          {successMsg && (
            <div className="flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="flex items-center gap-2 p-2.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section: Google Drive Storage */}
          <div className="bg-stone-50/80 rounded-2xl p-4 border border-stone-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cloud className="w-4 h-4 text-stone-800" />
                <h3 className="text-xs font-bold text-stone-900">
                  Penyimpanan Google Drive
                </h3>
              </div>
              {currentUser && (
                <span className="text-[11px] font-mono text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full font-semibold">
                  Terhubung
                </span>
              )}
            </div>

            <p className="text-xs text-stone-500 leading-relaxed">
              Sinkronkan dan simpan salinan lengkap diary, tugas, dan keuanganmu ke Google Drive pribadi agar data tidak hilang saat ganti perangkat.
            </p>

            {!currentUser ? (
              /* Google Sign-in button */
              <button
                type="button"
                onClick={handleConnectDrive}
                disabled={isConnecting}
                className="w-full flex items-center justify-center gap-3 px-4 py-2.5 bg-white border border-stone-300 hover:bg-stone-50 text-stone-800 text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-all cursor-pointer min-h-[44px]"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                <span>{isConnecting ? 'Menghubungkan ke Google...' : 'Hubungkan Akun Google Drive'}</span>
              </button>
            ) : (
              /* Connected State */
              <div className="space-y-3">
                <div className="flex items-center justify-between p-2.5 bg-white border border-stone-200 rounded-xl text-xs">
                  <div className="truncate pr-2">
                    <p className="font-semibold text-stone-900 truncate">
                      {currentUser.displayName || 'Akun Google'}
                    </p>
                    <p className="text-[11px] text-stone-500 font-mono truncate">
                      {currentUser.email}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDisconnectDrive}
                    className="px-2.5 py-1 text-[11px] font-semibold text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                  >
                    Putuskan
                  </button>
                </div>

                {/* Backup Now to Drive Button */}
                <button
                  type="button"
                  onClick={handleBackupToDrive}
                  disabled={isBackingUpToDrive}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer min-h-[42px] shadow-xs"
                >
                  <CloudUpload className="w-4 h-4" />
                  <span>
                    {isBackingUpToDrive ? 'Mengunggah ke Drive...' : 'Cadangkan ke Google Drive Sekarang'}
                  </span>
                </button>

                {/* Drive Backups List */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-xs text-stone-500">
                    <span className="font-semibold text-stone-700">
                      Cadangan Tersimpan di Drive ({driveBackups.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => accessToken && fetchDriveBackups(accessToken)}
                      disabled={isLoadingDriveList}
                      className="p-1 hover:text-stone-900 rounded cursor-pointer"
                      title="Segarkan daftar dari Drive"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDriveList ? 'animate-spin' : ''}`} />
                    </button>
                  </div>

                  {isLoadingDriveList ? (
                    <div className="p-3 text-center text-xs text-stone-400">
                      Memuat daftar dari Google Drive...
                    </div>
                  ) : driveBackups.length === 0 ? (
                    <div className="p-3 text-center text-xs text-stone-400 bg-white rounded-xl border border-stone-200/60">
                      Belum ada cadangan di Google Drive. Klik tombol di atas untuk membuat cadangan pertamamu.
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {driveBackups.map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center justify-between p-2.5 bg-white border border-stone-200/80 rounded-xl hover:border-stone-300 transition-colors"
                        >
                          <div className="truncate pr-2">
                            <div className="flex items-center gap-1.5">
                              <FileText className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                              <span className="text-xs font-medium text-stone-800 truncate">
                                {file.name.replace('.json', '')}
                              </span>
                            </div>
                            <span className="text-[10px] text-stone-400 font-mono">
                              {file.createdTime ? new Date(file.createdTime).toLocaleString('id-ID') : '-'}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {/* Restore Button */}
                            <button
                              type="button"
                              onClick={() => setPendingAction({ type: 'restore', file })}
                              className="px-2 py-1 text-[11px] font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
                              title="Pulihkan data dari cadangan ini"
                            >
                              Pulihkan
                            </button>
                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={() => setPendingAction({ type: 'delete', file })}
                              className="p-1 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Hapus cadangan dari Drive"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Section: Local File Backup */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-stone-700 uppercase tracking-wider">
              Cadangan Berkas Lokal (.json)
            </h3>

            {/* Export JSON */}
            <button
              type="button"
              onClick={handleExportJson}
              className="w-full flex items-center justify-between p-3 border border-stone-200 hover:border-stone-300 rounded-xl text-left hover:bg-stone-50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-stone-100 rounded-lg text-stone-700">
                  <Download className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-stone-900">
                    Unduh Berkas Cadangan (.json)
                  </p>
                  <p className="text-[11px] text-stone-500">
                    Simpan salinan utuh seluruh catatanmu ke perangkat ini.
                  </p>
                </div>
              </div>
            </button>

            {/* Import JSON */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-between p-3 border border-stone-200 hover:border-stone-300 rounded-xl text-left hover:bg-stone-50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-stone-100 rounded-lg text-stone-700">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-stone-900">
                    Pulihkan dari Berkas Cadangan (.json)
                  </p>
                  <p className="text-[11px] text-stone-500">
                    Muat kembali catatan dari berkas JSON di komputermu.
                  </p>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportFile}
                className="hidden"
              />
            </div>

            {/* Reset to demo */}
            <button
              type="button"
              onClick={() => setPendingAction({ type: 'reset-demo' })}
              className="w-full flex items-center justify-between p-3 border border-stone-200 hover:border-stone-300 rounded-xl text-left hover:bg-stone-50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-stone-100 rounded-lg text-stone-600">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-stone-800">
                    Muat Ulang Contoh Data Awal
                  </p>
                  <p className="text-[11px] text-stone-400">
                    Kembalikan isi aplikasi ke contoh data panduan awal.
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-stone-100 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-stone-400">
            AJI v1.2 · Privasi Utama
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold bg-stone-900 text-white rounded-xl hover:bg-stone-800 transition-colors cursor-pointer min-h-[38px]"
          >
            Tutup
          </button>
        </div>
      </div>

      {/* Confirmation Modal for Destructive Operations */}
      {pendingAction && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-stone-900/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl border border-stone-200">
            <div className="flex items-center gap-2.5 text-stone-900">
              <AlertCircle className={`w-5 h-5 ${pendingAction.type === 'delete' ? 'text-rose-600' : 'text-amber-600'}`} />
              <h4 className="text-sm font-bold">
                {pendingAction.type === 'delete'
                  ? 'Hapus Cadangan di Drive?'
                  : pendingAction.type === 'restore'
                  ? 'Pulihkan Data dari Drive?'
                  : 'Setel Ulang ke Data Contoh?'}
              </h4>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              {pendingAction.type === 'delete'
                ? `Apakah kamu yakin ingin menghapus berkas "${pendingAction.file?.name}" secara permanen dari Google Drive? Tindakan ini tidak dapat dibatalkan.`
                : pendingAction.type === 'restore'
                ? `Tindakan ini akan menimpa catatan diary, tugas, dan keuangan yang ada di aplikasi dengan isi berkas "${pendingAction.file?.name}". Pastikan kamu telah mencadangkan data terkini jika perlu.`
                : 'Catatan, tugas, dan transaksi yang baru saja kamu buat akan digantikan dengan contoh data awal.'}
            </p>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPendingAction(null)}
                className="px-3 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors cursor-pointer min-h-[38px]"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                className={`px-4 py-2 text-xs font-semibold text-white rounded-xl transition-colors cursor-pointer min-h-[38px] ${
                  pendingAction.type === 'delete'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-stone-900 hover:bg-stone-800'
                }`}
              >
                {pendingAction.type === 'delete'
                  ? 'Hapus Permanen'
                  : pendingAction.type === 'restore'
                  ? 'Ya, Pulihkan Data'
                  : 'Setel Ulang'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
