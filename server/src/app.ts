import express, { Express } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { env } from "./config/env.js";
import routes from "./routes/index.js";
import { errorHandler } from "./middleware/errorHandler.js";

export function createApp(): Express {
  const app = express();

  // Helmet with customized CSP allowing external map tiles and styles
  app.use(
    helmet({
      contentSecurityPolicy: false, // MapLibre GL needs WebGL workers and remote tiles
      crossOriginResourcePolicy: { policy: "cross-origin" }
    })
  );

  // CORS configuration
  app.use(
    cors({
      origin: [env.CLIENT_URL, "http://localhost:5173", "http://127.0.0.1:5173"],
      credentials: true
    })
  );

  // Rate Limiting
  const generalLimiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX_REQUESTS,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later." }
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: env.AUTH_RATE_LIMIT_MAX_REQUESTS,
    message: { error: "Too many authentication attempts, please try again later." }
  });

  app.use("/api/v1/", generalLimiter);
  app.use("/api/v1/auth/login", authLimiter);
  app.use("/api/v1/auth/register", authLimiter);

  // Body Parsing
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // API Routes
  app.use("/api/v1", routes);

  // Fallback 404 handler for API routes
  app.use("/api/*", (req, res) => {
    res.status(404).json({ error: "Endpoint not found" });
  });

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
}
