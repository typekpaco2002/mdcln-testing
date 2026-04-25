/**
 * Vercel log exports often include large per-row blobs the API never reads.
 * Disaster recovery only uses paths, messages, requestId, timestamps, etc.
 * (see vercel-log-inventory.service.js + catastrophe-user-restore.service.js).
 */

const KEYS = [
  'requestId',
  'timestampInMs',
  'host',
  'deploymentDomain',
  'requestPath',
  'requestMethod',
  'requestQueryString',
  'message',
  'responseStatusCode',
  'type',
  'function',
  'level',
];

/**
 * @param {unknown} row
 * @returns {Record<string, unknown>}
 */
function compactOneRow(row) {
  const out = {};
  if (!row || typeof row !== 'object' || Array.isArray(row)) return out;
  for (const k of KEYS) {
    if (row[k] != null && row[k] !== '') out[k] = row[k];
  }
  return out;
}

/**
 * @param {unknown[]} rows
 * @returns {Record<string, unknown>[]}
 */
export function compactVercelLogRowsForDisaster(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.map(compactOneRow);
}

/**
 * UTF-8 byte length of JSON (for POST size checks).
 * @param {unknown} value
 */
export function jsonUtf8ByteLength(value) {
  return new Blob([JSON.stringify(value)]).size;
}
