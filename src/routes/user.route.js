import express from "express";
import { login, logout, signup } from "../controllers/user.controller.js";
import { createMess, getMessInfo, joinMess, messMembersData } from "../controllers/mess.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { addMessEntry } from "../controllers/messEntry.controller.js";

const router = express.Router();

// Public Routes
router.post("/auth/register", signup);
router.post("/auth/login", login);
router.post('/auth/logout', logout);


// Protected Routes
router.post("/create-mess",protect,createMess)
router.post("/join-mess", protect, joinMess);
router.get("/mess/my-mess", protect, getMessInfo);
// router.put("/profile", protect, updateProfile);

router.get("/mess/members-data", protect, messMembersData);
router.post("/mess-entry", protect, addMessEntry);


export default router;
