/**
 * Normalize RunPod / worker status labels consistently across webhooks and `/status` polling.
 * Imported by `runpod-callback.routes.js` for webhook handling.
 */

/** @param {unknown} st */
export function normalizeRunpodJobStatus(st) {
  const s = String(st ?? "").toUpperCase().trim();
  if (["SUCCESS", "SUCCEEDED", "DONE", "COMPLETE", "FINISHED", "OK", "COMPLETED_OK"].includes(s)) {
    return "COMPLETED";
  }
  if (["ERROR", "ERRORED", "FAILURE"].includes(s)) {
    return "FAILED";
  }
  return s;
}

/**
 * RunPod queue GET `/status/{id}` usually exposes `status`; some payloads use `state` or nest fields.
 * @param {Record<string, unknown> | null | undefined} payload
 * @returns {string}
 */
export function extractRunpodPollStatusRaw(payload) {
  if (!payload || typeof payload !== "object") return "";
  const v =
    payload.status ??
    payload.state ??
    payload.jobStatus ??
    payload.execution?.status ??
    payload.execution?.state;
  return v != null && String(v).trim() !== "" ? String(v).trim() : "";
}

/**
 * Canonical uppercase terminal-ish status for polling recovery (mirrors webhook fallback inference).
 *
 * @param {Record<string, unknown>} payload - Full RunPod `/status` JSON
 * @param {() => boolean} [inferCompleted] - When envelope has no usable status, true => COMPLETED
 * @returns {string} e.g. COMPLETED, FAILED, IN_PROGRESS, IN_QUEUE, …
 */
export function resolveRunpodPollCanonicalStatus(payload, inferCompleted) {
  let st = normalizeRunpodJobStatus(extractRunpodPollStatusRaw(payload));
  if (!st && typeof inferCompleted === "function") {
    try {
      if (inferCompleted()) st = "COMPLETED";
    } catch {
      /* ignore */
    }
  }
  return String(st || "").toUpperCase().trim();
}

/** @param {string} canon - From {@link resolveRunpodPollCanonicalStatus} */
export function isRunpodPollCompleted(canon) {
  return String(canon || "").toUpperCase() === "COMPLETED";
}

/** @param {string} canon */
export function isRunpodPollFailedOrCancelled(canon) {
  const u = String(canon || "").toUpperCase();
  return (
    u === "FAILED" ||
    u === "CANCELLED" ||
    u === "CANCELED" ||
    u === "TIMED_OUT" ||
    u === "TIMED-OUT" ||
    u === "ERROR"
  );
}
