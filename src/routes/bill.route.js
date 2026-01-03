// routes/bill.route.js
import express from "express";
import {
  createBill,
  getBills,
  getBill,
  togglePayment,
  deleteBill,
  updateBillAmount,
  getBillSummary,
} from "../controllers/bill.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// Create a new bill
router.post("/", createBill);

// Get all bills (with optional month/year filter)
router.get("/", getBills);

// Get bill summary for month/year
router.get("/summary", getBillSummary);

// Get a specific bill
router.get("/:billId", getBill);

// Update bill amount
router.patch("/:billId", updateBillAmount);

// Toggle payment status for a member
router.patch("/:billId/payment/:memberId", togglePayment);

// Delete a bill
router.delete("/:billId", deleteBill);

export default router;
