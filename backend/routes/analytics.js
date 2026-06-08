import { Router } from "express";
import { getAnalytics } from "../controllers/adminController.js";
import { protect } from "../middleware/auth.js";

const router = Router();

router.get("/", protect, getAnalytics);

export default router;
