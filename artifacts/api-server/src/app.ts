import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { createProxyMiddleware } from "http-proxy-middleware";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

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
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
