import { DevicePermissionsState, PermissionState } from '../types';

const STORAGE_KEY = 'aji_device_permissions_v1';

export const DEFAULT_PERMISSIONS: DevicePermissionsState = {
  camera: 'prompt',
  contacts: 'prompt',
  location: 'prompt',
  calendar: 'granted', // Always capable through iCalendar/Web intents
  notifications: 'prompt',
  photos: 'prompt',
  clock: 'granted', // Web Audio Alarm synthesis always active
  files: 'granted', // Blob/File system storage always active
};

export function loadSavedPermissions(): DevicePermissionsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};

    // Check actual notification state if available
    let notifState: PermissionState = 'prompt';
    if (typeof window !== 'undefined' && 'Notification' in window) {
      notifState = Notification.permission === 'granted' 
        ? 'granted' 
        : Notification.permission === 'denied' 
        ? 'denied' 
        : 'prompt';
    }

    return {
      ...DEFAULT_PERMISSIONS,
      ...parsed,
      notifications: notifState,
    };
  } catch {
    return DEFAULT_PERMISSIONS;
  }
}

export function savePermissions(permissions: DevicePermissionsState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(permissions));
  } catch (e) {
    console.error('Failed to save permissions state', e);
  }
}

/**
 * Real device permission requests
 */
export async function requestCameraPermission(): Promise<{ state: PermissionState; stream?: MediaStream; error?: string }> {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return { state: 'denied', error: 'Kamera tidak didukung oleh browser/perangkat ini.' };
    }
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    return { state: 'granted', stream };
  } catch (err: any) {
    return { state: 'denied', error: err?.message || 'Izin kamera ditolak pengguna.' };
  }
}

export function requestLocationPermission(): Promise<{ state: PermissionState; coords?: { latitude: number; longitude: number }; locationName?: string; error?: string }> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ state: 'denied', error: 'Geolokasi tidak didukung pada browser ini.' });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          state: 'granted',
          coords: {
            latitude: Number(pos.coords.latitude.toFixed(4)),
            longitude: Number(pos.coords.longitude.toFixed(4)),
          },
          locationName: `GPS: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`,
        });
      },
      (err) => {
        resolve({ state: 'denied', error: err.message || 'Izin lokasi ditolak.' });
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  });
}

export async function requestNotificationPermission(): Promise<PermissionState> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  try {
    const perm = await Notification.requestPermission();
    return perm === 'granted' ? 'granted' : perm === 'denied' ? 'denied' : 'prompt';
  } catch {
    return 'denied';
  }
}

export async function requestContactPicker(): Promise<{ state: PermissionState; contacts?: { name: string; tel?: string }[]; error?: string }> {
  try {
    const nav = navigator as any;
    if ('contacts' in nav && 'select' in nav.contacts) {
      const selected = await nav.contacts.select(['name', 'tel'], { multiple: false });
      if (selected && selected.length > 0) {
        return {
          state: 'granted',
          contacts: selected.map((c: any) => ({
            name: c.name?.[0] || 'Kontak',
            tel: c.tel?.[0] || '',
          })),
        };
      }
    }
    return { state: 'granted' };
  } catch (e: any) {
    return { state: 'denied', error: e.message };
  }
}
