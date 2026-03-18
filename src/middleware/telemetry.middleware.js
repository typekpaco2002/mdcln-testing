import {
  hashIp,
  normalizeTelemetryPath,
  recordApiRequestMetric,
  recordTelemetryEdgeEvent,
  telemetryConfig,
} from "../services/telemetry.service.js";

const TELEMETRY_SAMPLE_RATE = Math.min(
  1,
  Math.max(0.01, Number(process.env.TELEMETRY_REQUEST_SAMPLE_RATE || 1)),
);

function shouldCapture() {
  return Math.random() <= TELEMETRY_SAMPLE_RATE;
}

export function telemetryMiddleware() {
  return (req, res, next) => {
    if (!String(req.path || "").startsWith("/api")) {
      return next();
    }

    const startedAt = Date.now();
    const requestBytes = Number(req.headers["content-length"] || 0) || null;
    const routePath = req.originalUrl?.split("?")[0] || req.path || "/";
    const ipRaw = String(req.headers["x-forwarded-for"] || req.ip || "")
      .split(",")[0]
      .trim();
    const ipHash = hashIp(ipRaw);
    const sampleAccepted = shouldCapture();

    res.on("finish", () => {
      if (!sampleAccepted) return;

      const durationMs = Date.now() - startedAt;
      const statusCode = res.statusCode || 0;
      const responseBytes = Number(res.getHeader("content-length") || 0) || null;
      const userId = req.user?.userId || req.user?.id || null;
      const isAdmin = req.user?.role === "admin";

      void recordApiRequestMetric({
        method: req.method,
        routePath,
        normalizedPath: normalizeTelemetryPath(routePath),
        statusCode,
        durationMs,
        userId,
        isAdmin,
        ipHash,
        userAgent: req.headers["user-agent"] || null,
        requestBytes,
        responseBytes,
      });

      if (statusCode >= 500) {
        void recordTelemetryEdgeEvent({
          eventType: "server_error_response",
          severity: "critical",
          message: `HTTP ${statusCode}`,
          routePath,
          statusCode,
          userId,
          ipHash,
          details: { method: req.method, durationMs },
        });
      } else if (statusCode === 429) {
        void recordTelemetryEdgeEvent({
          eventType: "rate_limited",
          severity: "warning",
          message: "Request throttled",
          routePath,
          statusCode,
          userId,
          ipHash,
          details: { method: req.method, durationMs },
        });
      } else if (durationMs >= telemetryConfig.SLOW_REQUEST_THRESHOLD_MS) {
        void recordTelemetryEdgeEvent({
          eventType: "slow_request",
          severity: "warning",
          message: `Slow request (${durationMs}ms)`,
          routePath,
          statusCode,
          userId,
          ipHash,
          details: {
            method: req.method,
            thresholdMs: telemetryConfig.SLOW_REQUEST_THRESHOLD_MS,
          },
        });
      }
    });

    next();
  };
}
