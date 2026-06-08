import "../config/env.js";
import fs from "fs";
import path from "path";
import { Router } from "express";
import { fileURLToPath } from "url";
import multer from "multer";
import { nanoid } from "nanoid";
import {
  deleteDocument,
  getChunkingStrategies,
  listDocuments,
  uploadDocument
} from "../controllers/ragController.js";
import { protect } from "../middleware/auth.js";
import { uploadLimiter } from "../middleware/rateLimiter.js";

const router = Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, "..");
const uploadDir = path.resolve(backendRoot, process.env.UPLOAD_DIR || "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const allowedMimeTypes = new Set([
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname || "");
    cb(null, `${Date.now()}-${nanoid(10)}${extension}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: Number(process.env.MAX_UPLOAD_MB || 25) * 1024 * 1024
  },
  fileFilter: (_req, file, cb) => {
    const extension = path.extname(file.originalname || "").toLowerCase();
    if (
      allowedMimeTypes.has(file.mimetype) ||
      [".txt", ".md", ".markdown", ".csv", ".json", ".pdf", ".docx"].includes(extension)
    ) {
      cb(null, true);
      return;
    }
    cb(new Error("Unsupported document type"));
  }
});

router.get("/strategies", protect, getChunkingStrategies);
router.get("/", protect, listDocuments);
router.post("/", protect, uploadLimiter, upload.single("document"), uploadDocument);
router.delete("/:id", protect, deleteDocument);

export default router;
