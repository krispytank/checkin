// Simple in-memory cache with TTL
// Useful for dashboard endpoints that are called frequently

const cache = new Map();

/**
 * Get cached value or compute and cache it
 * @param {string} key - Cache key
 * @param {number} ttlMs - Time to live in milliseconds (default: 30s)
 * @param {Function} computeFn - Function to compute value if not cached
 * @returns {Promise<*>} Cached or computed value
 */
export async function cached(key, ttlMs = 30000, computeFn) {
  const now = Date.now();
  const entry = cache.get(key);

  if (entry && now - entry.timestamp < ttlMs) {
    return entry.value;
  }

  const value = await computeFn();
  cache.set(key, { value, timestamp: now });

  // Clean up expired entries periodically
  if (cache.size > 100) {
    for (const [k, v] of cache) {
      if (now - v.timestamp > ttlMs) {
        cache.delete(k);
      }
    }
  }

  return value;
}

/**
 * Clear cache entries matching a prefix
 * @param {string} prefix - Key prefix to clear
 */
export function clearCache(prefix) {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}
