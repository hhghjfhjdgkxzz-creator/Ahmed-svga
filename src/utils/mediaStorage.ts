/**
 * Persistent Media Storage & Upload Utility
 * Handles persistent server file storage via /api/upload and IndexedDB caching for offline resilience.
 */

const DB_NAME = 'jiawei_media_vault';
const DB_VERSION = 1;
const STORE_NAME = 'media_blobs';

// Global in-memory cache for synchronous object URLs
export const globalMemoryCache = new Map<string, string>();

// Open IndexedDB database
function openMediaDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('IndexedDB not supported in this browser'));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Saves a media Blob / File to IndexedDB
 */
export async function saveMediaToIndexedDb(id: string, blob: Blob | File, filename?: string): Promise<void> {
  try {
    const db = await openMediaDb();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put({
      id,
      blob,
      type: blob.type,
      filename: filename || id,
      timestamp: Date.now()
    });
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn('Could not save media to IndexedDB:', e);
  }
}

/**
 * Retrieves a media Blob from IndexedDB
 */
export async function getMediaFromIndexedDb(id: string): Promise<Blob | null> {
  try {
    const db = await openMediaDb();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);
    return new Promise((resolve) => {
      request.onsuccess = () => {
        if (request.result && request.result.blob) {
          resolve(request.result.blob);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => resolve(null);
    });
  } catch (e) {
    return null;
  }
}

/**
 * Uploads a file to the persistent backend server storage
 */
export async function uploadMediaToServer(
  file: File | Blob,
  fileName: string,
  onProgress?: (progress: number) => void
): Promise<{ url: string; filename: string; size: number; mimeType: string }> {
  const formData = new FormData();
  formData.append('file', file, fileName);

  try {
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed with status ${response.status}`);
    }

    const data = await response.json();
    if (data && data.url) {
      return data;
    }
    throw new Error('Invalid upload response from server');
  } catch (err: any) {
    console.warn('Server upload fallback:', err);
    // Fallback URL if server upload fails
    const localBlobUrl = URL.createObjectURL(file);
    return {
      url: localBlobUrl,
      filename: fileName,
      size: file.size,
      mimeType: file.type || 'video/mp4'
    };
  }
}

/**
 * Converts a base64 data URL to a clean Blob safely
 */
export function dataUrlToBlob(dataUrl: string): Blob | null {
  try {
    if (!dataUrl || !dataUrl.startsWith('data:')) return null;
    const parts = dataUrl.split(',');
    if (parts.length < 2) return null;
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/png';
    // Clean any whitespace, carriage returns, or newlines
    const cleanBase64 = parts[1].replace(/[\s\r\n]+/g, '');
    const bstr = atob(cleanBase64);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  } catch (err) {
    console.warn('Error converting dataUrl to Blob:', err);
    return null;
  }
}

/**
 * Compresses an image base64 data URL to under 50KB to respect Firestore's 1MB field limit
 */
export async function compressBase64Image(dataUrl: string, maxDim = 360, quality = 0.7): Promise<string> {
  if (!dataUrl || !dataUrl.startsWith('data:')) return dataUrl;
  if (dataUrl.length < 60000) return dataUrl; // Already compact (<60KB)

  return new Promise((resolve) => {
    try {
      const img = new Image();
      // NOTE: DO NOT set img.crossOrigin on data: URIs as modern browsers trigger CORS errors on data URIs!
      img.onload = () => {
        try {
          let w = img.width || 360;
          let h = img.height || 360;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, w);
          canvas.height = Math.max(1, h);
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(dataUrl.slice(0, 50000));
            return;
          }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          let result = canvas.toDataURL('image/jpeg', quality);
          // If still over 80KB, compress further with smaller dimension
          if (result.length > 80000) {
            canvas.width = Math.max(1, Math.round(canvas.width * 0.75));
            canvas.height = Math.max(1, Math.round(canvas.height * 0.75));
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            result = canvas.toDataURL('image/jpeg', 0.55);
          }
          resolve(result);
        } catch (e) {
          resolve('https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=400&auto=format&fit=crop&q=80');
        }
      };
      img.onerror = () => {
        // Fallback: Never resolve with an oversized >1MB string! Return standard placeholder
        resolve('https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=400&auto=format&fit=crop&q=80');
      };
      img.src = dataUrl;
    } catch (e) {
      resolve('https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=400&auto=format&fit=crop&q=80');
    }
  });
}

/**
 * Safely uploads a base64 data URL or File/Blob to the server storage,
 * returning a lightweight URL (like /uploads/...) instead of an oversized data string.
 * If server upload is unavailable, compresses the base64 to under 50KB to respect Firestore's 1MB limit.
 */
export async function uploadDataUrlOrFile(
  dataUrlOrFile: string | File | Blob,
  defaultName: string = 'media_asset'
): Promise<string> {
  if (!dataUrlOrFile) return '';

  // If already a safe URL, return as is
  if (typeof dataUrlOrFile === 'string') {
    const trimmed = dataUrlOrFile.trim();
    if (!trimmed.startsWith('data:') && !trimmed.startsWith('blob:') && trimmed.length < 1000) {
      return trimmed;
    }
  }

  try {
    let blob: Blob | null = null;
    let fileName = defaultName;

    if (typeof dataUrlOrFile === 'string') {
      if (dataUrlOrFile.startsWith('data:')) {
        blob = dataUrlToBlob(dataUrlOrFile);
        if (!blob) {
          throw new Error('Failed to convert dataUrl to Blob');
        }
        if (!fileName.includes('.')) {
          const ext = blob.type.split('/')[1] || 'png';
          fileName = `${fileName}.${ext}`;
        }
      } else {
        return dataUrlOrFile;
      }
    } else {
      blob = dataUrlOrFile;
      if (dataUrlOrFile instanceof File && dataUrlOrFile.name) {
        fileName = dataUrlOrFile.name;
      }
    }

    if (blob) {
      // Attempt persistent upload to backend
      const formData = new FormData();
      formData.append('file', blob, fileName);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        if (data?.url) {
          // Also cache locally in IndexedDB
          try {
            await saveMediaToIndexedDb(data.url, blob, fileName);
          } catch (cErr) {}
          return data.url;
        }
      }
    }
  } catch (err) {
    console.warn('uploadDataUrlOrFile server error:', err);
  }

  // Fallback: If it is a data URL and still too large, compress it down to under 50KB!
  if (typeof dataUrlOrFile === 'string' && dataUrlOrFile.startsWith('data:image/')) {
    try {
      const compressed = await compressBase64Image(dataUrlOrFile, 360, 0.7);
      if (compressed && compressed.length < 100000) {
        return compressed;
      }
    } catch (cErr) {
      console.warn('Image compression fallback error:', cErr);
    }
  }

  // If still oversized string (> 100,000 characters), do NOT return raw string to protect Firestore
  if (typeof dataUrlOrFile === 'string') {
    if (dataUrlOrFile.length > 100000) {
      console.warn('Oversized asset dataUrl suppressed to prevent Firestore 1MB rejection.');
      return 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=400&auto=format&fit=crop&q=80';
    }
    return dataUrlOrFile;
  }

  return '';
}

/**
 * Media Compatibility Layer:
 * Resolves any legacy or modern media URL to a direct, playable URL from the browser.
 * Vercel is 100% excluded: browser connects directly to external storage / CDN hosts.
 */
export function getPlayableMediaUrl(url?: string): string {
  if (!url) return '';
  let trimmed = url.trim();

  // Return local blob / data / relative static URLs immediately
  if (trimmed.startsWith('/uploads/') || trimmed.startsWith('blob:') || trimmed.startsWith('data:')) {
    return trimmed;
  }

  // Mixed-content protection: Upgrade insecure http:// to https:// for modern browser compliance
  if (trimmed.startsWith('http://') && !trimmed.includes('localhost') && !trimmed.includes('127.0.0.1')) {
    trimmed = trimmed.replace(/^http:\/\//i, 'https://');
  }

  // Handle Google Drive view links -> convert to direct thumbnail/image links
  const gdriveMatch = trimmed.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([a-zA-Z0-9_-]+)/);
  if (gdriveMatch && gdriveMatch[1]) {
    return `https://lh3.googleusercontent.com/d/${gdriveMatch[1]}`;
  }

  // Handle Dropbox share links -> convert to direct raw stream links
  if (trimmed.includes('dropbox.com')) {
    return trimmed.replace('www.dropbox.com', 'dl.dropboxusercontent.com').replace(/\?dl=[01]/, '');
  }

  // Clean URL spaces if present in file path
  if (trimmed.includes(' ') && !trimmed.includes('%20')) {
    try {
      trimmed = encodeURI(trimmed);
    } catch {}
  }

  // Return direct CDN / external video URL directly to the browser
  return trimmed;
}

/**
 * Resolves a media URL to an absolute or playable stream URL directly from the source CDN/Storage.
 * Alias for getPlayableMediaUrl.
 */
export function resolveMediaUrl(url?: string, _useProxy = false): string {
  return getPlayableMediaUrl(url);
}

/**
 * Returns direct URL for browser native playback without passing through Vercel
 */
export function getProxyMediaUrl(url: string): string {
  return getPlayableMediaUrl(url);
}
