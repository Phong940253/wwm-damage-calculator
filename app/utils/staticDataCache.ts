const CACHE_KEY = "wwm_static_data_cache";

export interface StaticDataCacheRow {
  key: string;
  data: unknown;
}

export interface StaticDataCache {
  cachedAt: number;
  rows: StaticDataCacheRow[];
}

export function getStaticDataCache(): StaticDataCache | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StaticDataCache;
    if (!parsed.rows || !Array.isArray(parsed.rows)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setStaticDataCache(rows: StaticDataCacheRow[]) {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ cachedAt: Date.now(), rows })
    );
  } catch {
    // localStorage full or unavailable — ignore
  }
}

export function updateStaticDataCache(key: string, data: unknown) {
  try {
    const cache = getStaticDataCache();
    if (!cache) return;
    const idx = cache.rows.findIndex((r) => r.key === key);
    if (idx >= 0) {
      cache.rows[idx] = { key, data };
    } else {
      cache.rows.push({ key, data });
    }
    cache.cachedAt = Date.now();
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // ignore
  }
}

export function removeStaticDataCache(key: string) {
  try {
    const cache = getStaticDataCache();
    if (!cache) return;
    cache.rows = cache.rows.filter((r) => r.key !== key);
    cache.cachedAt = Date.now();
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // ignore
  }
}
