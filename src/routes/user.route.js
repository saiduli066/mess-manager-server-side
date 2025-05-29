import express from "express";
import { checkAuth, getUserProfile, login, logout, signup, updateUserProfile } from "../controllers/user.controller.js";
import { createMess, getMessInfo, joinMess, leaveMess, messMembersData } from "../controllers/mess.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { addMessEntry, getMessEntries } from "../controllers/messEntry.controller.js";

const router = express.Router();

// Public Routes (auth)
router.post("/auth/signup", signup);
router.post("/auth/login", login);
router.post('/auth/logout', logout);


// Protected Routes
router.get("/auth/check", protect, checkAuth);


router.post("/create-mess",protect,createMess)
router.post("/join-mess", protect, joinMess);
router.patch("/leave-mess", protect, leaveMess);

router.get("/mess/my-mess", protect, getMessInfo);
router.get("/profile", protect, getUserProfile);
router.put("/profile", protect, updateUserProfile);

router.get("/mess/members-data", protect, messMembersData);
router.post("/mess-entry", protect, addMessEntry);
router.get("/mess-entry/:messId", protect, getMessEntries);


export default router;
