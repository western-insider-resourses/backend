import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import swaggerUi from "swagger-ui-express";
import publicRoutes from "./routes/public.js";
import authRoutes from "./routes/auth.js";
import adminRoutes from "./routes/admin.js";
import { openApiSpec } from "./docs/openapi.js";

// Allowed browser origins: the public site and the separate admin site.
export const allowedOrigins = (): string[] =>
  [
    process.env.CLIENT_URL || "http://localhost:3000",
    process.env.ADMIN_URL || "http://localhost:3001",
  ]
    .flatMap((v) => v.split(","))
    .map((v) => v.trim())
    .filter(Boolean);

export function createApp() {
  const app = express();
  app.set("trust proxy", 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(cors({ origin: allowedOrigins(), credentials: true }));
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", (_req, res) => res.json({ ok: true }));
  app.get("/api/docs/openapi.json", (_req, res) => res.json(openApiSpec));
  app.use(
    "/api/docs",
    swaggerUi.serve,
    swaggerUi.setup(openApiSpec, {
      customSiteTitle: "Western Insider Resources API Docs",
    }),
  );
  const authLimit = process.env.NODE_ENV === "test" ? 10_000 : 20;
  app.use(
    "/api/auth",
    rateLimit({ windowMs: 15 * 60 * 1000, max: authLimit }),
    authRoutes,
  );
  app.use("/api/admin", adminRoutes);
  app.use("/api", publicRoutes);

  app.use(
    (
      err: Error & { status?: number },
      _req: Request,
      res: Response,
      _next: NextFunction,
    ) => {
      if (process.env.NODE_ENV !== "test") console.error(err);
      const status = err.status || 500;
      res.status(status).json({
        error:
          status === 500 ? "Something went wrong on our side." : err.message,
      });
    },
  );
  return app;
}
