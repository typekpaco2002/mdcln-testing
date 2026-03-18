/**
 * Resolve country/region code from IP (e.g. for signup attribution).
 * Uses ip-api.com; returns ISO 3166-1 alpha-2 country code or null.
 * @param {string} ip - Client IP address
 * @returns {Promise<string|null>} - Country code (e.g. "US", "SK") or null
 */
export async function getRegionFromIp(ip) {
  const s = String(ip || "").trim();
  if (!s || s === "::1" || s === "127.0.0.1" || s.toLowerCase() === "unknown") return null;
  if (s.startsWith("10.") || s.startsWith("192.168.") || /^172\.(1[6-9]|2\d|3[0-1])\./.test(s)) return null;

  try {
    const url = `http://ip-api.com/json/${encodeURIComponent(s)}?fields=status,countryCode`;
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 5000);
    const res = await fetch(url, { signal: ac.signal });
    clearTimeout(t);
    if (!res.ok) return null;
    const data = await res.json();
    const code = data?.countryCode;
    return typeof code === "string" ? code.trim().toUpperCase().slice(0, 2) || null : null;
  } catch {
    return null;
  }
}
