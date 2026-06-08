import "./config/env.js";

import express from "express";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import { connectDB } from "./config/db.js";
import { apiLimiter } from "./middleware/rateLimiter.js";
import { errorHandler, notFoundHandler, securityMiddleware } from "./middleware/security.js";
import analyticsRoutes from "./routes/analytics.js";
import authRoutes from "./routes/auth.js";
import chatRoutes from "./routes/chat.js";
import documentRoutes from "./routes/documents.js";
import evaluationRoutes from "./routes/evaluation.js";
import logRoutes from "./routes/logs.js";

const app = express();
const port = Number(process.env.PORT || 5000);
const host = process.env.HOST || "0.0.0.0";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.set("trust proxy", 1);
app.use(...securityMiddleware);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(apiLimiter);

if (process.env.NODE_ENV !== "test") {
  app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
}

app.use("/uploads", express.static(path.resolve(__dirname, process.env.UPLOAD_DIR || "uploads")));

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "RAGNEXUS AI Backend",
    timestamp: new Date().toISOString()
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/logs", logRoutes);
app.use("/api/evaluation", evaluationRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

const start = async () => {
  await connectDB();
  const server = app.listen(port, host, () => {
    console.log(`RAGNEXUS AI backend listening on http://${host}:${port}`);
  });

  const shutdown = (signal) => {
    console.log(`${signal} received. Closing HTTP server.`);
    server.close(() => process.exit(0));
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
};

start().catch((error) => {
  console.error("Backend startup failed:", error);
  process.exit(1);
});
