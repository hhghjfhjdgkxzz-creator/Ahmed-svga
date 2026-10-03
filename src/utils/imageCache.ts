/**
 * Global In-Memory Image Cache & Smart Preloader
 * Tracks loaded images across session to provide instant, zero-flicker re-renders
 * and intelligent progressive prefetching.
 */

// Global set of URLs that have successfully loaded in the current browser session
const loadedImageUrls = new Set<string>();

// Failed URLs to avoid infinite re-request loops
const failedImageUrls = new Set<string>();

/**
 * Checks whether an image URL is already loaded and cached in browser memory
 */
export function isImageCached(url?: string): boolean {
  if (!url) return false;
  return loadedImageUrls.has(url);
}

/**
 * Marks an image URL as successfully loaded
 */
export function markImageCached(url?: string): void {
  if (!url) return;
  loadedImageUrls.add(url);
  failedImageUrls.delete(url);
}

/**
 * Marks an image URL as failed
 */
export function markImageFailed(url?: string): void {
  if (!url) return;
  failedImageUrls.add(url);
}

/**
 * Checks if an image URL has previously failed
 */
export function hasImageFailed(url?: string): boolean {
  if (!url) return false;
  return failedImageUrls.has(url);
}

/**
 * Preloads an image into the browser cache asynchronously
 * Uses native decoding="async" and optional high fetchPriority
 */
export function preloadImage(url?: string, highPriority: boolean = false): void {
  if (!url || loadedImageUrls.has(url) || failedImageUrls.has(url)) return;

  try {
    const img = new Image();
    img.decoding = 'async';
    if (highPriority && 'fetchPriority' in img) {
      (img as any).fetchPriority = 'high';
    }
    img.onload = () => {
      loadedImageUrls.add(url);
    };
    img.onerror = () => {
      // Don't permanently mark failed on prefetch in case network was busy
    };
    img.src = url;
  } catch {
    // Ignore prefetch errors in restricted environments
  }
}

/**
 * Smart batch prefetcher: Preloads up to `limit` images smoothly
 * without saturating network bandwidth
 */
export function preloadImagesBatch(urls: (string | undefined)[], limit: number = 6): void {
  if (!Array.isArray(urls)) return;
  const valid = urls
    .filter((u): u is string => Boolean(u && typeof u === 'string' && !loadedImageUrls.has(u) && !failedImageUrls.has(u)))
    .slice(0, limit);

  // Stagger slightly using requestIdleCallback / setTimeout to avoid thread contention
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    (window as any).requestIdleCallback(() => {
      valid.forEach((u, i) => {
        setTimeout(() => preloadImage(u, false), i * 40);
      });
    });
  } else {
    setTimeout(() => {
      valid.forEach((u, i) => {
        setTimeout(() => preloadImage(u, false), i * 40);
      });
    }, 50);
  }
}
