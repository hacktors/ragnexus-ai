import compression from "compression";
import cors from "cors";
import mongoSanitize from "express-mongo-sanitize";
import helmet from "helmet";
import hpp from "hpp";

const normalizeOrigin = (origin) => String(origin || "").trim().replace(/\/+$/, "");

const parseOrigins = (value) =>
  String(value || "")
    .split(",")
    .map(normalizeOrigin)
    .filter(Boolean);

const parseOriginPatterns = (value) =>
  parseOrigins(value)
    .map((pattern) => {
      try {
        return new RegExp(pattern);
      } catch (error) {
        console.warn(`Ignoring invalid CLIENT_ORIGIN_REGEX entry "${pattern}": ${error.message}`);
        return null;
      }
    })
    .filter(Boolean);

let corsConfigCacheKey = "";
let corsConfigCache = { origins: new Set(), patterns: [] };

const getCorsConfig = () => {
  const patternConfig = process.env.CLIENT_ORIGIN_REGEX || process.env.CLIENT_ORIGIN_PATTERN || "";
  const cacheKey = `${process.env.CLIENT_ORIGIN || ""}|${patternConfig}`;

  if (cacheKey !== corsConfigCacheKey) {
    corsConfigCacheKey = cacheKey;
    corsConfigCache = {
      origins: new Set(parseOrigins(process.env.CLIENT_ORIGIN)),
      patterns: parseOriginPatterns(patternConfig)
    };
  }

  return corsConfigCache;
};

const localDevOriginPattern = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;

const corsOrigin = (origin, callback) => {
  if (!origin) {
    callback(null, true);
    return;
  }

  const normalizedOrigin = normalizeOrigin(origin);
  const { origins, patterns } = getCorsConfig();

  if (
    origins.has(normalizedOrigin) ||
    patterns.some((pattern) => pattern.test(normalizedOrigin)) ||
    (process.env.NODE_ENV !== "production" && localDevOriginPattern.test(normalizedOrigin))
  ) {
    callback(null, true);
    return;
  }

  callback(new Error(`CORS origin not allowed: ${normalizedOrigin}`));
};

const sanitizeMongoPayload = (req, _res, next) => {
  for (const target of [req.body, req.params, req.query]) {
    if (target && typeof target === "object") {
      mongoSanitize.sanitize(target, { replaceWith: "_" });
    }
  }
  next();
};

export const securityMiddleware = [
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
  }),
  cors({
    origin: corsOrigin,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  }),
  compression(),
  sanitizeMongoPayload,
  hpp()
];

export const notFoundHandler = (req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
};

export const errorHandler = (error, _req, res, _next) => {
  const statusCode = error.statusCode || error.status || 500;
  const payload = {
    message: statusCode >= 500 ? "Internal server error" : error.message
  };

  if (process.env.NODE_ENV !== "production") {
    payload.details = error.message;
  }

  console.error(error);
  res.status(statusCode).json(payload);
};
