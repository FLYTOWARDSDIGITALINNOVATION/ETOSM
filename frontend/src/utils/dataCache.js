// ============================================================================
// High-Performance In-Memory & Session Cache for Instant Zero-Delay Page Transitions
// ============================================================================

const memoryCache = new Map();

// Helper to safely get from sessionStorage
function getSessionStorage(key) {
  try {
    if (typeof window === "undefined" || !window.sessionStorage) return null;
    const item = window.sessionStorage.getItem(`etosm_cache_${key}`);
    if (!item) return null;
    const parsed = JSON.parse(item);
    if (parsed.expiry && Date.now() > parsed.expiry) {
      window.sessionStorage.removeItem(`etosm_cache_${key}`);
      return null;
    }
    return parsed.data;
  } catch (e) {
    return null;
  }
}

// Helper to safely set into sessionStorage
function setSessionStorage(key, data, ttlMs) {
  try {
    if (typeof window === "undefined" || !window.sessionStorage) return;
    const item = {
      data,
      expiry: ttlMs ? Date.now() + ttlMs : Date.now() + 10 * 60 * 1000 // default 10 mins
    };
    window.sessionStorage.setItem(`etosm_cache_${key}`, JSON.stringify(item));
  } catch (e) {
    // sessionStorage quota exceeded or unavailable - fail gracefully
  }
}

/**
 * Synchronously retrieves cached data if valid
 * @param {string} key
 * @returns {any|null}
 */
export function cacheGet(key) {
  // 1. Check in-memory map (0ms synchronous lookup)
  if (memoryCache.has(key)) {
    const entry = memoryCache.get(key);
    if (!entry.expiry || Date.now() <= entry.expiry) {
      return entry.data;
    }
    memoryCache.delete(key);
  }

  // 2. Check sessionStorage fallback
  const sessionData = getSessionStorage(key);
  if (sessionData !== null) {
    // Restore into memory cache
    memoryCache.set(key, { data: sessionData, expiry: Date.now() + 5 * 60 * 1000 });
    return sessionData;
  }

  return null;
}

/**
 * Stores data into in-memory and session cache
 * @param {string} key
 * @param {any} data
 * @param {number} [ttlMs] Time to live in ms (default 5 minutes)
 */
export function cacheSet(key, data, ttlMs = 5 * 60 * 1000) {
  const expiry = Date.now() + ttlMs;
  memoryCache.set(key, { data, expiry });
  setSessionStorage(key, data, ttlMs);
}

/**
 * Invalidate a specific cache key or all cache
 * @param {string} [key]
 */
export function cacheClear(key) {
  if (key) {
    memoryCache.delete(key);
    try {
      window.sessionStorage?.removeItem(`etosm_cache_${key}`);
    } catch (e) {}
  } else {
    memoryCache.clear();
    try {
      Object.keys(window.sessionStorage || {}).forEach((k) => {
        if (k.startsWith("etosm_cache_")) {
          window.sessionStorage.removeItem(k);
        }
      });
    } catch (e) {}
  }
}

/**
 * Pre-warm commonly used catalog data in the background on initial app boot
 * Ensures 0ms instant transition when user clicks "Products" or "Home"
 */
export async function prewarmAppCache(apiBaseUrl) {
  try {
    if (!cacheGet("all_products_catalog")) {
      const res = await fetch(`${apiBaseUrl}/products?active=true`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          cacheSet("all_products_catalog", data);
          cacheSet("home_all_products", data);
        }
      }
    }
    if (!cacheGet("all_categories_catalog")) {
      const res = await fetch(`${apiBaseUrl}/categories`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          cacheSet("all_categories_catalog", data);
        }
      }
    }
    if (!cacheGet("home_bestsellers")) {
      const res = await fetch(`${apiBaseUrl}/products/bestsellers`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          cacheSet("home_bestsellers", data);
        }
      }
    }
  } catch (err) {
    // Fail silently in background
  }
}
