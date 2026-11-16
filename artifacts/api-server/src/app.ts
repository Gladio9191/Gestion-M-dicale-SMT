import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { createProxyMiddleware } from "http-proxy-middleware";
import router from "./routes";
import healthRouter from "./routes/health";
import { corsOriginAllowed, ownerAuthRouter, requireOwner, requireOwnerCsrf } from "./security/owner-auth";
import { logger } from "./lib/logger";

const app: Express = express();

app.disable("x-powered-by");
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  next();
});
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
        };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

// Browser cross-origin requests require an explicit, configured origin.
// No '*' wildcard, and no unauthenticated medical endpoints.
app.use(cors({
  origin(origin, callback) {
    callback(null, !origin || corsOriginAllowed(origin));
  },
  credentials: true,
  methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "X-SMT-CSRF"],
}));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: false, limit: "2mb" }));

app.use("/api", healthRouter);
app.use("/api/auth", ownerAuthRouter);

// The Flask engine is guarded BEFORE the reverse proxy: no direct bypass.
const FICHE_ENGINE_PORT = process.env["FICHE_ENGINE_PORT"] ?? "5000";
app.use(
  "/api/fiche-engine",
  requireOwner,
  requireOwnerCsrf,
  createProxyMiddleware({
    target: `http://127.0.0.1:${FICHE_ENGINE_PORT}`,
    changeOrigin: false,
    on: {
      error: (_err, _req, res) => {
        (res as express.Response)
          .status(503)
          .json({ error: "Fiche Engine indisponible" });
      },
    },
  }),
);

app.use("/api", requireOwner, requireOwnerCsrf, router);

export default app;
