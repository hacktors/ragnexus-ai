import { Router } from "express";
import { askQuestion, getChatHistory, submitFeedback } from "../controllers/ragController.js";
import { protect } from "../middleware/auth.js";
import { chatLimiter } from "../middleware/rateLimiter.js";

const router = Router();

router.get("/history", protect, getChatHistory);
router.post("/", protect, chatLimiter, askQuestion);
router.post("/feedback", protect, submitFeedback);

export default router;
