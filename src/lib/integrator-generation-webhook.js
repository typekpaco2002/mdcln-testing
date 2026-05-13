import crypto from "node:crypto";

const URL_MAX = 2048;
const SECRET_MAX = 256;

/**
 * @param {unknown} body
 * @returns {{ url: string | null, secret: string | null }}
 */
export function pickIntegratorWebhookFields(body) {
  if (!body || typeof body !== "object") {
    return { url: null, secret: null };
  }
  const b = /** @type {Record<string, unknown>} */ (body);
  /** Prefer integrationCallbackUrl — do not use `callbackUrl`; it collides with provider callbacks (e.g. Veo). */
  const rawUrl = [
    b.integrationCallbackUrl,
    b.integratorWebhookUrl,
    b.integratorCallbackUrl,
    b.webhookUrl,
  ].find((x) => typeof x === "string" && x.trim().length > 0);
  const url = typeof rawUrl === "string" ? rawUrl.trim() : null;
  const rawSecret = [b.integratorWebhookSecret, b.callbackSecret, b.webhookSecret].find(
    (x) => typeof x === "string" && x.trim().length > 0,
  );
  const secret = typeof rawSecret === "string" ? rawSecret.trim() : null;
  return { url, secret };
}

function badReq(msg) {
  const err = new Error(msg);
  err.statusCode = 400;
  return err;
}

/**
 * @param {string} urlString
 */
export function assertValidIntegratorWebhookUrl(urlString) {
  let u;
  try {
    u = new URL(urlString);
  } catch {
    throw badReq("integrationCallbackUrl must be a valid URL");
  }
  if (urlString.length > URL_MAX) {
    throw badReq(`integrationCallbackUrl exceeds ${URL_MAX} characters`);
  }
  const host = u.hostname.toLowerCase();
  const isLocal =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "[::1]" ||
    host.endsWith(".localhost");
  if (u.protocol === "https:") {
    return;
  }
  if (u.protocol === "http:" && isLocal) {
    return;
  }
  throw badReq("integrationCallbackUrl must use https (http is allowed only for localhost / 127.0.0.1)");
}

/** Validate optional integrator webhook fields early (middleware / handlers). */
export function assertIntegratorWebhookBody(body) {
  const { url, secret } = pickIntegratorWebhookFields(body);
  if (!url) {
    return;
  }
  assertValidIntegratorWebhookUrl(url);
  if (secret && secret.length > SECRET_MAX) {
    throw badReq(`Webhook secret exceeds ${SECRET_MAX} characters`);
  }
}

/**
 * @param {Record<string, unknown>} data Prisma `Generation` create/update `data` object
 * @param {unknown} body HTTP JSON body (or similar) from the integrator
 */
export function mergeIntegratorWebhookIntoPrismaData(data, body) {
  const { url, secret } = pickIntegratorWebhookFields(body);
  if (!url) {
    return data;
  }
  assertValidIntegratorWebhookUrl(url);
  if (secret && secret.length > SECRET_MAX) {
    throw badReq(`Webhook secret exceeds ${SECRET_MAX} characters`);
  }
  return {
    ...data,
    integratorWebhookUrl: url,
    integratorWebhookSecret: secret || null,
  };
}

function signBody(rawBody, secret) {
  return crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
}

/**
 * Fire-and-forget: deliver integrator webhook after generation reaches a terminal status.
 * @param {string} generationId
 */
export function scheduleIntegratorGenerationWebhook(generationId) {
  queueMicrotask(() => {
    deliverIntegratorWebhookOnce(generationId).catch((e) =>
      console.warn("[integrator-webhook] delivery error:", e?.message || e),
    );
  });
}

/**
 * Claim row and POST completion payload to integratorWebhookUrl once.
 * @param {string} generationId
 */
async function deliverIntegratorWebhookOnce(generationId) {
  const prisma = (await import("./prisma.js")).default;

  const claim = await prisma.generation.updateMany({
    where: {
      id: generationId,
      status: { in: ["completed", "failed"] },
      integratorWebhookUrl: { not: null },
      integratorWebhookDeliveredAt: null,
    },
    data: { integratorWebhookDeliveredAt: new Date() },
  });

  if (claim.count === 0) {
    return;
  }

  const gen = await prisma.generation.findUnique({
    where: { id: generationId },
    select: {
      id: true,
      userId: true,
      modelId: true,
      type: true,
      status: true,
      prompt: true,
      outputUrl: true,
      errorMessage: true,
      completedAt: true,
      createdAt: true,
      replicateModel: true,
      creditsCost: true,
      providerTaskId: true,
      integratorWebhookUrl: true,
      integratorWebhookSecret: true,
      integratorWebhookDeliveredAt: true,
    },
  });

  if (!gen?.integratorWebhookUrl) {
    return;
  }

  const event =
    gen.status === "completed" ? "generation.completed" : gen.status === "failed" ? "generation.failed" : null;
  if (!event) {
    return;
  }

  /** @type {Record<string, unknown>} */
  const payload = {
    event,
    generationId: gen.id,
    userId: gen.userId,
    modelId: gen.modelId ?? null,
    type: gen.type,
    status: gen.status,
    outputUrl: gen.outputUrl ?? null,
    errorMessage: gen.errorMessage ?? null,
    prompt: gen.prompt ?? null,
    creditsCost: gen.creditsCost ?? null,
    replicateModel: gen.replicateModel ?? null,
    providerTaskId: gen.providerTaskId ?? null,
    createdAt: gen.createdAt?.toISOString?.() ?? null,
    completedAt: gen.completedAt?.toISOString?.() ?? null,
  };

  const rawBody = JSON.stringify(payload);
  const headers = {
    "Content-Type": "application/json",
    "User-Agent": "Modelclone-Integrator-Webhook/1.0",
  };
  const secret = gen.integratorWebhookSecret;
  if (secret) {
    headers["X-Modelclone-Signature"] = `sha256=${signBody(rawBody, secret)}`;
  }

  try {
    const httpRes = await fetch(gen.integratorWebhookUrl, {
      method: "POST",
      headers,
      body: rawBody,
      signal: AbortSignal.timeout(20_000),
    });
    if (!httpRes.ok) {
      console.warn(
        `[integrator-webhook] callback returned ${httpRes.status} for generation ${generationId.slice(0, 8)} → ${gen.integratorWebhookUrl.slice(0, 48)}`,
      );
    }
  } catch (e) {
    console.warn(
      `[integrator-webhook] callback failed for generation ${generationId.slice(0, 8)}:`,
      e?.message || e,
    );
  }
}
