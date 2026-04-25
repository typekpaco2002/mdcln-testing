/**
 * Pull runtime logs from the Vercel REST API (server-side only — token stays in env).
 * There is no single "project logs for date range" endpoint; we list production deployments,
 * pick those whose serving window can overlap `since`, then GET runtime-logs per deployment
 * and merge rows (filter by timestampInMs >= since).
 *
 * Env: VERCEL_API_TOKEN or VERCEL_TOKEN, VERCEL_PROJECT_ID, optional VERCEL_TEAM_ID.
 * @see https://vercel.com/docs/rest-api/reference/endpoints/deployments/list-deployments
 * @see https://vercel.com/docs/rest-api/reference/endpoints/logs/get-logs-for-a-deployment
 */

const VERCEL_API = "https://api.vercel.com";

/** @param {Record<string, string|undefined>} q */
function qs(q) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) {
    if (v != null && v !== "") p.set(k, v);
  }
  return p.toString();
}

/**
 * @param {object} raw — one NDJSON object from runtime-logs
 * @returns {Record<string, unknown>}
 */
export function mapVercelRuntimeApiLogToDisasterRow(raw) {
  if (!raw || typeof raw !== "object") return {};
  const requestId =
    raw.requestId ||
    raw.proxyRequestId ||
    raw.invocationId ||
    raw.executionId ||
    raw.rowId ||
    undefined;
  return {
    timestampInMs: raw.timestampInMs,
    message: typeof raw.message === "string" ? raw.message : "",
    requestPath: typeof raw.requestPath === "string" ? raw.requestPath : "",
    requestMethod: typeof raw.requestMethod === "string" ? raw.requestMethod : "",
    responseStatusCode: raw.responseStatusCode,
    level: typeof raw.level === "string" ? raw.level : "",
    type: typeof raw.source === "string" ? raw.source : "",
    function: typeof raw.function === "string" ? raw.function : "",
    host: typeof raw.domain === "string" ? raw.domain : "",
    deploymentDomain: typeof raw.deploymentDomain === "string" ? raw.deploymentDomain : undefined,
    requestId,
    requestQueryString: typeof raw.requestQueryString === "string" ? raw.requestQueryString : "",
  };
}

/**
 * Deployments Di (sorted by created asc) served traffic during [Di.created, D_next.created) (or now for last).
 * Include Di iff that interval intersects [sinceMs, nowMs].
 * @param {{ created: number, uid: string }[]} deployments
 */
export function selectDeploymentsOverlappingWindow(deployments, sinceMs, nowMs) {
  if (!Array.isArray(deployments) || deployments.length === 0) return [];
  const sorted = [...deployments].sort((a, b) => a.created - b.created);
  const out = [];
  for (let i = 0; i < sorted.length; i++) {
    const start = sorted[i].created;
    const end = i + 1 < sorted.length ? sorted[i + 1].created : nowMs;
    if (end >= sinceMs && start <= nowMs) out.push(sorted[i]);
  }
  return out;
}

/**
 * @param {object} p
 * @param {string} p.token
 * @param {string} p.projectId
 * @param {string} [p.teamId]
 * @param {number} p.sinceMs — extend listing backward until we pass this (minus slack)
 * @param {number} [p.maxListDeployments=250] — cap deployment list API calls aggregate
 */
export async function listProductionDeploymentsForWindow(p) {
  const { token, projectId, teamId, sinceMs } = p;
  const maxList = Math.max(20, Math.min(500, parseInt(String(p.maxListDeployments ?? 250), 10) || 250));
  const slackMs = 86400000; /* 1 day: deployment created slightly before since may still serve */
  const cutoff = sinceMs - slackMs;

  const all = [];
  const seenUid = new Set();
  /** @type {number|undefined} */
  let until = undefined;
  let guard = 0;
  let listMaybeIncomplete = false;

  while (guard < 40 && all.length < maxList) {
    guard += 1;
    const q = qs({
      projectId,
      teamId,
      target: "production",
      limit: String(Math.min(100, maxList - all.length)),
      ...(until != null ? { until: String(until) } : {}),
    });
    const res = await fetch(`${VERCEL_API}/v6/deployments?${q}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(60_000),
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`Vercel list deployments ${res.status}: ${text.slice(0, 400)}`);
    }
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error("Vercel list deployments: invalid JSON");
    }
    const batch = Array.isArray(json.deployments) ? json.deployments : [];
    if (batch.length === 0) break;
    for (const d of batch) {
      if (d?.uid && typeof d.created === "number" && !seenUid.has(d.uid)) {
        seenUid.add(d.uid);
        all.push({ uid: d.uid, created: d.created, url: d.url || null, name: d.name || null });
      }
    }
    const oldest = Math.min(...batch.map((d) => d.created));
    if (oldest < cutoff) break;
    const next = json.pagination?.next;
    if (next == null) break;
    until = next;
    if (all.length >= maxList) {
      listMaybeIncomplete = oldest >= cutoff;
      break;
    }
  }

  return { deployments: all, listMaybeIncomplete };
}

/**
 * Read NDJSON (or line-delimited JSON) from a Response body with caps.
 * @param {import('node:stream').Readable} [body] — fetch Response body (web stream)
 */
export async function readNdjsonLogStream(response, opts = {}) {
  const maxBytes = Math.max(256 * 1024, Math.min(512 * 1024 * 1024, opts.maxBytes ?? 80 * 1024 * 1024));
  const maxRows = Math.max(1000, Math.min(2_000_000, opts.maxRows ?? 120_000));
  const body = response.body;
  if (!body) {
    const t = await response.text();
    if (!t.trim()) return { rows: [], truncated: false, bytesRead: 0 };
    return parseNdjsonText(t, maxRows, maxBytes);
  }

  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let bytesRead = 0;
  const rows = [];
  let truncated = false;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    bytesRead += value.byteLength;
    if (bytesRead > maxBytes) {
      truncated = true;
      try {
        await reader.cancel();
      } catch {
        /* ignore */
      }
      break;
    }
    buf += decoder.decode(value, { stream: true });
    for (;;) {
      const nl = buf.indexOf("\n");
      if (nl === -1) break;
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line) continue;
      let obj;
      try {
        obj = JSON.parse(line);
      } catch {
        continue;
      }
      rows.push(mapVercelRuntimeApiLogToDisasterRow(obj));
      if (rows.length >= maxRows) {
        truncated = true;
        try {
          await reader.cancel();
        } catch {
          /* ignore */
        }
        buf = "";
        break;
      }
    }
    if (truncated) break;
  }

  const tail = buf.trim();
  if (!truncated && tail) {
    try {
      rows.push(mapVercelRuntimeApiLogToDisasterRow(JSON.parse(tail)));
    } catch {
      /* ignore */
    }
  }

  return { rows, truncated, bytesRead };
}

function parseNdjsonText(text, maxRows, maxBytes) {
  const bytesRead = new TextEncoder().encode(text).length;
  const rows = [];
  let truncated = false;
  const lines = text.split("\n");
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    try {
      rows.push(mapVercelRuntimeApiLogToDisasterRow(JSON.parse(t)));
    } catch {
      continue;
    }
    if (rows.length >= maxRows) {
      truncated = true;
      break;
    }
  }
  if (bytesRead > maxBytes) truncated = true;
  return { rows, truncated, bytesRead };
}

/**
 * @param {object} p
 * @param {string} p.token
 * @param {string} p.projectId
 * @param {string} p.deploymentId
 * @param {string} [p.teamId]
 */
export async function fetchRuntimeLogsForDeployment(p) {
  const q = qs({ teamId: p.teamId });
  const url = `${VERCEL_API}/v1/projects/${encodeURIComponent(p.projectId)}/deployments/${encodeURIComponent(p.deploymentId)}/runtime-logs${q ? `?${q}` : ""}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${p.token}` },
    signal: AbortSignal.timeout(300_000),
  });
  if (res.status === 404) {
    return { rows: [], truncated: false, bytesRead: 0, skipped: true, reason: "no_logs_or_not_found" };
  }
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Vercel runtime-logs ${res.status}: ${t.slice(0, 400)}`);
  }
  return readNdjsonLogStream(res, p.streamOpts || {});
}

/**
 * @param {object} opts
 * @param {Date} opts.since
 * @param {string} [opts.projectId] — else VERCEL_PROJECT_ID
 * @param {string} [opts.teamId] — else VERCEL_TEAM_ID
 * @param {number} [opts.maxDeploymentsToFetchLogs=32] — cap per-deployment log downloads
 * @param {number} [opts.maxListDeployments=250]
 */
export async function fetchVercelLogRowsFromApi(opts = {}) {
  const token = process.env.VERCEL_API_TOKEN || process.env.VERCEL_TOKEN;
  const projectId = opts.projectId || process.env.VERCEL_PROJECT_ID;
  const teamId = opts.teamId ?? process.env.VERCEL_TEAM_ID ?? undefined;
  const since = opts.since instanceof Date ? opts.since : new Date(opts.since || 0);
  const sinceMs = since.getTime();
  const nowMs = Date.now();

  if (!token) {
    throw new Error("Set VERCEL_API_TOKEN or VERCEL_TOKEN on the API server to fetch Vercel logs.");
  }
  if (!projectId) {
    throw new Error("Set VERCEL_PROJECT_ID (or pass projectId) for the Vercel project to read.");
  }

  const maxListDeployments = Math.max(50, Math.min(500, parseInt(String(opts.maxListDeployments || 250), 10) || 250));
  const maxFetch = Math.max(1, Math.min(80, parseInt(String(opts.maxDeploymentsToFetchLogs || 32), 10) || 32));

  const { deployments: listed, listMaybeIncomplete } = await listProductionDeploymentsForWindow({
    token,
    projectId,
    teamId,
    sinceMs,
    maxListDeployments,
  });

  const overlapping = selectDeploymentsOverlappingWindow(listed, sinceMs, nowMs);
  /** Prefer most recently active deployments when capping (tail = newest created). */
  const toFetch = overlapping.slice(-maxFetch);
  const capped = overlapping.length > toFetch.length;

  const meta = {
    projectId,
    teamScoped: Boolean(teamId),
    deploymentsListed: listed.length,
    deploymentsOverlapping: overlapping.length,
    deploymentsFetched: toFetch.length,
    deploymentFetchCapped: capped,
    deploymentListMaybeIncomplete: listMaybeIncomplete,
  };

  const merged = [];
  let anyTruncated = false;
  let totalBytes = 0;

  for (const dep of toFetch) {
    try {
      const r = await fetchRuntimeLogsForDeployment({
        token,
        projectId,
        deploymentId: dep.uid,
        teamId,
        streamOpts: {
          maxBytes: opts.maxBytesPerDeployment ?? 48 * 1024 * 1024,
          maxRows: opts.maxRowsPerDeployment ?? 100_000,
        },
      });
      totalBytes += r.bytesRead || 0;
      merged.push(...r.rows);
      if (r.truncated) anyTruncated = true;
    } catch (e) {
      console.warn("[vercel-runtime-logs] deployment", dep.uid, e?.message || e);
    }
  }

  const filtered = merged.filter((row) => typeof row.timestampInMs === "number" && row.timestampInMs >= sinceMs);

  return {
    rows: filtered,
    meta: {
      ...meta,
      rowsBeforeTimeFilter: merged.length,
      rowsAfterTimeFilter: filtered.length,
      streamTruncated: anyTruncated,
      approxBytesRead: totalBytes,
    },
  };
}
