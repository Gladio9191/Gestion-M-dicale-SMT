import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { createProxyMiddleware } from "http-proxy-middleware";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();
app.disable("x-powered-by");
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Cache-Control", "no-store");
  next();
});

const FICHE_ENGINE_PORT = process.env["FICHE_ENGINE_PORT"] ?? "5000";
app.use(
  "/api/fiche-engine",
  createProxyMiddleware({
    target: `http://localhost:${FICHE_ENGINE_PORT}`,
    changeOrigin: false,
    on: {
      error: (_err, _req, res) => {
        (res as express.Response)
          .status(503)
          .json({ error: "Fiche Engine non disponible. Lancez le workflow 'Fiche Engine'." });
      },
    },
  }),
);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
const allowedOrigins = (process.env["SMT_ALLOWED_ORIGINS"] ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter((value) => value.length > 0 && value !== "*");
// Same-origin browser requests work without any CORS header.
app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: "8mb" }));
app.use(express.urlencoded({ extended: true, limit: "8mb", parameterLimit: 10_000 }));

app.use("/api", router);

export default app;
