import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis;

function buildPrismaClient() {
  const baseUrl = process.env.DATABASE_URL || "";
  const separator = baseUrl.includes("?") ? "&" : "?";
  const poolUrl = `${baseUrl}${separator}connection_limit=25&pool_timeout=60`;

  const base = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    datasources: {
      db: { url: poolUrl },
    },
  });

  return base.$extends({
    query: {
      generation: {
        /** @param {any} params */
        async create({ args, query }) {
          const result = await query(args);
          if (result && (result.status === "completed" || result.status === "failed")) {
            const { scheduleIntegratorGenerationWebhook } = await import("./integrator-generation-webhook.js");
            scheduleIntegratorGenerationWebhook(result.id);
          }
          return result;
        },
        /** @param {any} params */
        async update({ args, query }) {
          const result = await query(args);
          if (result && (result.status === "completed" || result.status === "failed")) {
            const { scheduleIntegratorGenerationWebhook } = await import("./integrator-generation-webhook.js");
            scheduleIntegratorGenerationWebhook(result.id);
          }
          return result;
        },
      },
    },
  });
}

const prisma = globalForPrisma.__prisma ?? buildPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__prisma = prisma;
}

export default prisma;
