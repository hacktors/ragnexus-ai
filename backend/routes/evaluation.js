import { Router } from "express";
import { exportFineTune } from "../controllers/adminController.js";
import { authorize, protect } from "../middleware/auth.js";

const router = Router();

router.post("/export-fine-tune", protect, authorize("admin", "developer"), exportFineTune);

export default router;
