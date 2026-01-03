// routes/notification.route.js
import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  getAvailablePeriods,
} from "../controllers/notification.controller.js";

const router = express.Router();

router.get("/", protect, getNotifications);
router.get("/unread-count", protect, getUnreadCount);
router.get("/periods", protect, getAvailablePeriods);
router.patch("/:notificationId/read", protect, markAsRead);
router.patch("/mark-all-read", protect, markAllAsRead);

export default router;
