// import express from "express";
// import {
//   checkAuth,
//   getUserProfile,
//   login,
//   logout,
//   signup,
//   updateUserProfile,
// } from "../controllers/user.controller.js";
// import {
//   createMess,
//   getMessInfo,
//   joinMess,
//   leaveMess,
//   messMembersData,
//   promoteToAdmin,
//   demoteToMember,
//   removeMemberFromMess,
// } from "../controllers/mess.controller.js";
// import { protect } from "../middleware/auth.middleware.js";
// import {
//   addMessEntry,
//   getMessEntries,
//   setupMonthlySettlement, // NEW: Import
// } from "../controllers/messEntry.controller.js";
// import {
//   toggleMealSwitch,
//   getSwitchStatus,
//   getAllMembersStatus,
//   getMealSummary,
//   getUserMealStatistics,
//   setupAutoSwitchOff,
// } from "../controllers/mealSwitch.controller.js";

// const router = express.Router();

// // Initialize
// setupAutoSwitchOff();
// setupMonthlySettlement(); // NEW: Setup monthly settlement cron

// // Public Routes
// router.post("/auth/signup", signup);
// router.post("/auth/login", login);
// router.post("/auth/logout", logout);

// // Protected Routes
// router.get("/auth/check", protect, checkAuth);

// // Meal Switch Routes
// router.post("/meal-switch/toggle", protect, toggleMealSwitch);
// router.get("/meal-switch/status", protect, getSwitchStatus);
// router.get("/meal-switch/members-status", protect, getAllMembersStatus);
// router.get("/meal-summary", protect, getMealSummary);
// router.get("/user-meal-statistics", protect, getUserMealStatistics);

// // Mess Routes
// router.post("/create-mess", protect, createMess);
// router.post("/join-mess", protect, joinMess);
// router.patch("/leave-mess", protect, leaveMess);
// router.get("/mess/my-mess", protect, getMessInfo);

// // NEW: Admin Management Routes
// router.patch("/mess/:messId/promote", protect, promoteToAdmin);
// router.patch("/mess/:messId/demote", protect, demoteToMember);
// router.patch("/mess/:messId/remove-member", protect, removeMemberFromMess);

// // Profile Routes
// router.get("/profile", protect, getUserProfile);
// router.put("/profile", protect, updateUserProfile);

// // Other Routes
// router.get("/mess-members", protect, messMembersData);
// router.post("/mess-entries", protect, addMessEntry);
// router.get("/mess-entries/:messId", protect, getMessEntries);

// export default router;

import express from "express";
import {
  checkAuth,
  getUserProfile,
  login,
  logout,
  signup,
  updateUserProfile,
  getUserNotifications,
  markNotificationAsRead,
  forgotPassword,
  resetPassword,
  changePassword,
} from "../controllers/user.controller.js";
import {
  createMess,
  getMessInfo,
  joinMess,
  leaveMess,
  messMembersData,
  promoteToAdmin,
  demoteToMember,
  removeMemberFromMess,
} from "../controllers/mess.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import {
  addMessEntry,
  getMessEntries,
  setupMonthlySettlement,
} from "../controllers/messEntry.controller.js";
import {
  submitMeals,
  getMealsForDate,
  getMealSummary,
  getUserMealStatistics,
} from "../controllers/meal.controller.js";

const router = express.Router();

// Initialize
setupMonthlySettlement();

// Public Routes
router.post("/auth/signup", signup);
router.post("/auth/login", login);
router.post("/auth/logout", logout);
router.post("/auth/forgot-password", forgotPassword);
router.post("/auth/reset-password/:token", resetPassword);

// Protected Routes
router.get("/auth/check", protect, checkAuth);

// Meal Routes
router.post("/meals/submit", protect, submitMeals);
router.get("/meals/date", protect, getMealsForDate);
router.get("/meal-summary", protect, getMealSummary);
router.get("/user-meal-statistics", protect, getUserMealStatistics);

// Mess Routes
router.post("/create-mess", protect, createMess);
router.post("/join-mess", protect, joinMess);
router.patch("/leave-mess", protect, leaveMess);
router.get("/mess/my-mess", protect, getMessInfo);

// NEW: Admin Management Routes
router.patch("/mess/:messId/promote", protect, promoteToAdmin);
router.patch("/mess/:messId/demote", protect, demoteToMember);
router.patch("/mess/:messId/remove-member", protect, removeMemberFromMess);

// Profile Routes
router.get("/profile", protect, getUserProfile);
router.put("/profile", protect, updateUserProfile);
router.put("/change-password", protect, changePassword);

// Notification Routes
router.get("/notifications", protect, getUserNotifications);
router.patch(
  "/notifications/:notificationId/read",
  protect,
  markNotificationAsRead
);

// Other Routes
router.get("/mess-members", protect, messMembersData);
router.post("/mess-entries", protect, addMessEntry);
router.get("/mess-entries/:messId", protect, getMessEntries);

export default router;
