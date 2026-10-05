import { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  Users, 
  MapPin, 
  Calendar, 
  Bell, 
  Image as ImageIcon, 
  Clock, 
  FolderArchive, 
  ShieldCheck, 
  Check, 
  X, 
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Video,
  Volume2
} from 'lucide-react';
import { DevicePermissionsState, PermissionState } from '../types';
import { 
  requestCameraPermission, 
  requestLocationPermission, 
  requestNotificationPermission, 
  requestContactPicker 
} from '../utils/devicePermissions';
import { playAlarmSound } from '../utils/audioAlarm';

interface PermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  permissions: DevicePermissionsState;
  onUpdatePermissions: (updated: DevicePermissionsState) => void;
}

export function PermissionsModal({
  isOpen,
  onClose,
  permissions,
  onUpdatePermissions,
}: PermissionsModalProps) {
  const [activeCameraStream, setActiveCameraStream] = useState<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraCapturedImage, setCameraCapturedImage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [photoFeedback, setPhotoFeedback] = useState<string | null>(null);
  const [locationResult, setLocationResult] = useState<string | null>(null);
  const [testingItem, setTestingItem] = useState<string | null>(null);
  const [contactResult, setContactResult] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Stop camera on unmount or close
  useEffect(() => {
    return () => {
      if (activeCameraStream) {
        activeCameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [activeCameraStream]);

  if (!isOpen) return null;

  // 1. Camera handler
  const handleTestCamera = async () => {
    setTestingItem('camera');
    setCameraError(null);
    try {
      const res = await requestCameraPermission();
      if (res.state === 'granted' && res.stream) {
        setActiveCameraStream(res.stream);
        setIsCameraActive(true);
        if (videoRef.current) {
          videoRef.current.srcObject = res.stream;
        }
        onUpdatePermissions({ ...permissions, camera: 'granted' });
      } else {
        setCameraError(res.error || 'Izin kamera tidak diberikan.');
        onUpdatePermissions({ ...permissions, camera: 'denied' });
      }
    } catch {
      onUpdatePermissions({ ...permissions, camera: 'denied' });
    } finally {
      setTestingItem(null);
    }
  };

  const handleCaptureSnapshot = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setCameraCapturedImage(dataUrl);
    }
  };

  const handleStopCamera = () => {
    if (activeCameraStream) {
      activeCameraStream.getTracks().forEach((track) => track.stop());
      setActiveCameraStream(null);
    }
    setIsCameraActive(false);
    setCameraCapturedImage(null);
  };

  // 2. Location handler
  const handleTestLocation = async () => {
    setTestingItem('location');
    try {
      const res = await requestLocationPermission();
      if (res.state === 'granted' && res.coords) {
        setLocationResult(`GPS Terdeteksi: ${res.coords.latitude}, ${res.coords.longitude}`);
        onUpdatePermissions({ ...permissions, location: 'granted' });
      } else {
        setLocationResult(res.error || 'Lokasi tidak dapat diakses.');
        onUpdatePermissions({ ...permissions, location: 'denied' });
      }
    } finally {
      setTestingItem(null);
    }
  };

  // 3. Notification handler
  const handleTestNotification = async () => {
    setTestingItem('notifications');
    try {
      const perm = await requestNotificationPermission();
      onUpdatePermissions({ ...permissions, notifications: perm });
      if (perm === 'granted') {
        new Notification('AJI: Izin Notifikasi Aktif', {
          body: 'Notifikasi berhasil terhubung! Anda akan menerima pengingat alarm dan tugas.',
          icon: '/favicon.ico',
        });
      }
    } finally {
      setTestingItem(null);
    }
  };

  // 4. Contacts handler
  const handleTestContacts = async () => {
    setTestingItem('contacts');
    try {
      const res = await requestContactPicker();
      if (res.contacts && res.contacts.length > 0) {
        setContactResult(`${res.contacts[0].name} (${res.contacts[0].tel || 'No Tel'})`);
      } else {
        setContactResult('Kontak HP siap ditautkan ke tugas.');
      }
      onUpdatePermissions({ ...permissions, contacts: 'granted' });
    } catch {
      onUpdatePermissions({ ...permissions, contacts: 'denied' });
    } finally {
      setTestingItem(null);
    }
  };

  // 5. Photos file picker test
  const handleTestPhotos = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: any) => {
      if (e.target.files && e.target.files.length > 0) {
        onUpdatePermissions({ ...permissions, photos: 'granted' });
        setPhotoFeedback('Akses foto & galeri berhasil terhubung!');
        setTimeout(() => setPhotoFeedback(null), 3500);
      }
    };
    input.click();
    onUpdatePermissions({ ...permissions, photos: 'granted' });
  };

  // 6. Clock test
  const handleTestClock = () => {
    playAlarmSound('zen-bell');
    onUpdatePermissions({ ...permissions, clock: 'granted' });
  };

  // Status renderer
  const renderStatus = (state: PermissionState) => {
    if (state === 'granted') {
      return (
        <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600">
          <Check className="w-3.5 h-3.5" />
          <span>Terhubung</span>
        </span>
      );
    }
    if (state === 'denied') {
      return (
        <span className="flex items-center gap-1 text-[11px] font-medium text-rose-600">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Dibatasi</span>
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-[11px] font-medium text-amber-600">
        <RefreshCw className="w-3.5 h-3.5" />
        <span>Perlu Izin</span>
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl sm:rounded-3xl max-w-xl w-full max-h-[92vh] overflow-y-auto p-4 sm:p-7 shadow-2xl border border-stone-200 space-y-4 sm:space-y-5">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-stone-100 rounded-xl text-stone-800">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900">
                Pengelola Izin Perangkat & HP
              </h2>
              <p className="text-xs text-stone-500">
                Sinkronkan fitur bawaan smartphone untuk pengalaman harian yang lengkap.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Camera Drawer if active */}
        {isCameraActive && (
          <div className="p-4 bg-stone-900 text-white rounded-2xl space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold flex items-center gap-1.5">
                <Video className="w-4 h-4 text-emerald-400 animate-pulse" />
                Kamera Langsung Aktif
              </span>
              <button
                type="button"
                onClick={handleStopCamera}
                className="text-stone-400 hover:text-white"
              >
                Tutup Kamera
              </button>
            </div>

            <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={handleCaptureSnapshot}
                className="px-3 py-1.5 text-xs font-semibold bg-white text-stone-900 rounded-lg hover:bg-stone-200 transition-colors"
              >
                Ambil Foto
              </button>
              {cameraCapturedImage && (
                <span className="text-xs text-emerald-400 font-medium">
                  ✓ Foto berhasil diambil
                </span>
              )}
              <button
                type="button"
                onClick={handleStopCamera}
                className="px-3 py-1.5 text-xs font-medium text-stone-300 hover:text-white"
              >
                Selesai
              </button>
            </div>
          </div>
        )}

        {/* Permission Cards Grid */}
        <div className="divide-y divide-stone-100">
          
          {/* 1. KAMERA */}
          <div className="py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-stone-100 rounded-lg text-stone-700 shrink-0">
                <Camera className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-stone-900">Kamera</span>
                  {renderStatus(permissions.camera)}
                </div>
                <p className="text-[11px] text-stone-500">
                  Untuk foto catatan diary & struk bukti belanja.
                </p>
                {cameraError && (
                  <p className="text-[11px] text-rose-600 font-medium mt-1">
                    {cameraError}
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleTestCamera}
              className="px-3 py-1.5 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer shrink-0"
            >
              {isCameraActive ? 'Kamera Aktif' : 'Buka Kamera'}
            </button>
          </div>

          {/* 2. KONTAK */}
          <div className="py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-stone-100 rounded-lg text-stone-700 shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-stone-900">Kontak</span>
                  {renderStatus(permissions.contacts)}
                </div>
                <p className="text-[11px] text-stone-500">
                  Tautkan kontak keluarga atau rekan kerja ke tugas harian.
                </p>
                {contactResult && (
                  <p className="text-[10px] text-stone-700 font-mono mt-0.5">{contactResult}</p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleTestContacts}
              className="px-3 py-1.5 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer shrink-0"
            >
              Hubungkan Kontak
            </button>
          </div>

          {/* 3. LOKASI */}
          <div className="py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-stone-100 rounded-lg text-stone-700 shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-stone-900">Lokasi / GPS</span>
                  {renderStatus(permissions.location)}
                </div>
                <p className="text-[11px] text-stone-500">
                  Sematkan koordinat tempat saat menulis diary atau belanja.
                </p>
                {locationResult && (
                  <p className="text-[10px] text-stone-700 font-mono mt-0.5">{locationResult}</p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleTestLocation}
              disabled={testingItem === 'location'}
              className="px-3 py-1.5 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer shrink-0"
            >
              {testingItem === 'location' ? 'Mendeteksi...' : 'Deteksi GPS'}
            </button>
          </div>

          {/* 4. KALENDER */}
          <div className="py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-stone-100 rounded-lg text-stone-700 shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-stone-900">Kalender HP</span>
                  {renderStatus(permissions.calendar)}
                </div>
                <p className="text-[11px] text-stone-500">
                  Sinkronisasi langsung Google Kalender & berkas standar .ics.
                </p>
              </div>
            </div>

            <span className="text-[11px] font-mono text-emerald-600 font-semibold px-2">
              Tersambung
            </span>
          </div>

          {/* 5. NOTIFIKASI */}
          <div className="py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-stone-100 rounded-lg text-stone-700 shrink-0">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-stone-900">Notifikasi</span>
                  {renderStatus(permissions.notifications)}
                </div>
                <p className="text-[11px] text-stone-500">
                  Menerima alarm pengingat tugas & rutinitas harian di layar HP.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleTestNotification}
              className="px-3 py-1.5 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer shrink-0"
            >
              {permissions.notifications === 'granted' ? 'Uji Notifikasi' : 'Izinkan'}
            </button>
          </div>

          {/* 6. FOTO & GALERI */}
          <div className="py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-stone-100 rounded-lg text-stone-700 shrink-0">
                <ImageIcon className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-stone-900">Foto & Galeri</span>
                  {renderStatus(permissions.photos)}
                </div>
                <p className="text-[11px] text-stone-500">
                  Pilih gambar dan kenangan dari penyimpanan album HP.
                </p>
                {photoFeedback && (
                  <p className="text-[11px] text-emerald-600 font-medium mt-1">
                    {photoFeedback}
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleTestPhotos}
              className="px-3 py-1.5 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer shrink-0"
            >
              Buka Galeri
            </button>
          </div>

          {/* 7. JAM & ALARM */}
          <div className="py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-stone-100 rounded-lg text-stone-700 shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-stone-900">Jam & Alarm</span>
                  {renderStatus(permissions.clock)}
                </div>
                <p className="text-[11px] text-stone-500">
                  Sinkron jam real-time & synthesizer nada alarm bel Tibetan.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleTestClock}
              className="px-3 py-1.5 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer shrink-0"
            >
              Uji Bunyi Alarm
            </button>
          </div>

          {/* 8. BERKAS & DOKUMEN */}
          <div className="py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-stone-100 rounded-lg text-stone-700 shrink-0">
                <FolderArchive className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-stone-900">Berkas & Cadangan</span>
                  {renderStatus(permissions.files)}
                </div>
                <p className="text-[11px] text-stone-500">
                  Penyimpanan lokal aman, ekspor berkas cadangan JSON & .ics.
                </p>
              </div>
            </div>

            <span className="text-[11px] font-mono text-emerald-600 font-semibold px-2">
              Aktif Lokal
            </span>
          </div>

        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
          <p className="text-[11px] text-stone-400">
            Izin diproses langsung oleh peramban HP Anda secara privat.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold bg-stone-900 text-white rounded-xl hover:bg-stone-800 transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
}
