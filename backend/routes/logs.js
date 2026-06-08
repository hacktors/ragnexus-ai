import { Router } from "express";
import { getLogs } from "../controllers/adminController.js";
import { authorize, protect } from "../middleware/auth.js";

const router = Router();

router.get("/", protect, authorize("admin", "developer"), getLogs);

export default router;
