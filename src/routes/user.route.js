import express from "express";
import { login, logout, signup } from "../controllers/user.controller.js";
import { createMess, getMessInfo, joinMess } from "../controllers/mess.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

// Public Routes
router.post("/auth/register", signup);
router.post("/auth/login", login);
router.post('/auth/logout', logout);


// Protected Routes
router.post("/create-mess",protect,createMess)
router.post("/join-mess", protect, joinMess);
router.get("/my-mess", protect, getMessInfo);
// router.put("/profile", protect, updateProfile);


export default router;
