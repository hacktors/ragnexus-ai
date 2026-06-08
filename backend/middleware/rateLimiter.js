import "../config/env.js";
import rateLimit from "express-rate-limit";

const minutes = Number(process.env.RATE_LIMIT_WINDOW_MINUTES || 15);
const max = Number(process.env.RATE_LIMIT_MAX_REQUESTS || 300);

const baseOptions = {
  windowMs: minutes * 60 * 1000,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    message: "Too many requests. Please slow down and retry shortly."
  }
};

export const apiLimiter = rateLimit({
  ...baseOptions,
  max
});

export const authLimiter = rateLimit({
  ...baseOptions,
  max: 20,
  message: {
    message: "Too many authentication attempts. Please retry later."
  }
});

export const chatLimiter = rateLimit({
  ...baseOptions,
  max: 80,
  message: {
    message: "Chat request limit reached. Please retry later."
  }
});

export const uploadLimiter = rateLimit({
  ...baseOptions,
  max: 40,
  message: {
    message: "Upload request limit reached. Please retry later."
  }
});
