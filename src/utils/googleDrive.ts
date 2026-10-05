import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App instance safely (prevent duplicate app creation)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => {
  provider.addScope(scope);
});

// Flag to indicate if we are in the middle of a sign-in flow.
let isSigningIn = false;
// Cache the access token in memory (never in localStorage/sessionStorage).
let cachedAccessToken: string | null = null;

export interface DriveBackupFile {
  id: string;
  name: string;
  createdTime: string;
  size?: string;
  description?: string;
}

/**
 * Initialize auth state listener.
 */
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // If logged in via Firebase session but access token is missing, request user to click sign-in
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Sign in with Google to obtain Drive OAuth access token
 */
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Gagal mendapatkan access token Google Drive dari autentikasi');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: unknown) {
    console.error('Sign in Google Drive error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const setAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

export const logout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};

/**
 * List existing AJI backup files from Google Drive
 */
export async function listDriveBackups(token: string): Promise<DriveBackupFile[]> {
  const query = encodeURIComponent("name contains 'aji_backup_' and trashed = false");
  const fields = encodeURIComponent('files(id, name, createdTime, size, description)');
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}&orderBy=createdTime desc&pageSize=30`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Gagal mengambil daftar cadangan dari Drive (${response.status})`);
  }

  const data = await response.json();
  return (data.files || []) as DriveBackupFile[];
}

/**
 * Upload JSON backup data to Google Drive as an aji_backup_ file
 */
export async function uploadBackupToDrive(
  token: string,
  backupData: unknown,
  customName?: string
): Promise<{ id: string; name: string }> {
  const dateStr = new Date().toISOString().split('T')[0];
  const timeStr = Date.now();
  const fileName = customName || `aji_backup_${dateStr}_${timeStr}.json`;

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadata = {
    name: fileName,
    mimeType: 'application/json',
    description: 'Cadangan data AJI: Diary, Tugas & Alarm, Keuangan Harian',
  };

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(backupData, null, 2) +
    closeDelimiter;

  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartRequestBody,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Gagal mengunggah cadangan ke Google Drive (${response.status})`);
  }

  const result = await response.json();
  return { id: result.id, name: result.name };
}

/**
 * Download a backup file's content from Google Drive
 */
export async function downloadBackupFromDrive(token: string, fileId: string): Promise<any> {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Gagal mengunduh berkas cadangan dari Google Drive (${response.status})`);
  }

  return await response.json();
}

/**
 * Delete a backup file from Google Drive
 */
export async function deleteBackupFromDrive(token: string, fileId: string): Promise<void> {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}`;

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok && response.status !== 204) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Gagal menghapus berkas cadangan di Google Drive (${response.status})`);
  }
}
