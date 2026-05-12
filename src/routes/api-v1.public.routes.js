/**
 * Stable v1 façade under /api/v1 — contract + canonical integration profile.
 * All other authenticated routes reuse the SAME handlers as /api via a second mount
 * in server.js (/api/v1 mirrors /api excluding Flow Studio mounts).
 */
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { getV1Health, getV1Me } from "../controllers/public-api-v1.controller.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();

function resolveOpenApiPath() {
  if (process.env.PUBLIC_OPENAPI_PATH?.trim()) {
    return path.resolve(process.env.PUBLIC_OPENAPI_PATH.trim());
  }
  return path.resolve(
    path.join(__dirname, "../../docs/openapi/v1.openapi.yaml")
  );
}

router.get("/health", getV1Health);

router.get("/openapi.yaml", (req, res) => {
  const openApiPath = resolveOpenApiPath();
  fs.readFile(openApiPath, "utf8", (err, contents) => {
    if (err) {
      console.error("[api/v1] OpenAPI file missing:", openApiPath, err.code);
      return res.status(503).json({
        success: false,
        code: "openapi_unavailable",
        message: "OpenAPI specification is not available on this deployment",
      });
    }
    res.type("text/yaml; charset=utf-8");
    res.set("Cache-Control", "public, max-age=3600");
    res.send(contents);
  });
});

router.get("/me", authMiddleware, getV1Me);

export default router;
