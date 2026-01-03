// routes/dataIntegrity.route.js
import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  verifyDataIntegrity,
  fixDataIntegrity,
} from "../controllers/dataIntegrity.controller.js";

const router = express.Router();

// GET /api/v1/integrity/verify - Check for data integrity issues
router.get("/verify", protect, verifyDataIntegrity);

// POST /api/v1/integrity/fix - Fix data integrity issues
router.post("/fix", protect, fixDataIntegrity);

export default router;
