import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { z } from "zod";

// Check cwd and parent directories for .env
const envPaths = [
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "../.env"),
  path.resolve(process.cwd(), "../../.env")
];

for (const p of envPaths) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
    break;
  }
}
dotenv.config(); // fallback default

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.string().default("5000").transform((val) => parseInt(val, 10)),
  CLIENT_URL: z.string().default("http://localhost:5173"),
  MONGODB_URI: z.string().optional().default(""),
  JWT_ACCESS_SECRET: z.string().default("mapforge_dev_jwt_access_secret_super_secure_key_12345"),
  JWT_REFRESH_SECRET: z.string().default("mapforge_dev_jwt_refresh_secret_super_secure_key_12345"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
  MAP_STYLE_URL: z.string().default("https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"),
  GEOCODING_PROVIDER: z.string().default("nominatim"),
  GEOCODING_API_KEY: z.string().optional().default(""),
  COOKIE_ORIGIN: z.string().default("http://localhost:5173"),
  RATE_LIMIT_WINDOW_MS: z.string().default("900000").transform((val) => parseInt(val, 10)),
  RATE_LIMIT_MAX_REQUESTS: z.string().default("500").transform((val) => parseInt(val, 10)),
  AUTH_RATE_LIMIT_MAX_REQUESTS: z.string().default("50").transform((val) => parseInt(val, 10))
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:", parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
