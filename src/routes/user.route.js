import express from "express";
import { login, logout, signup } from "../controllers/user.controller.js";

const router = express.Router();

// Public Routes
router.post("/register", signup);
router.post("/login", login);
router.post('/logout', logout);


// // Protected Routes
// router.get("/profile", protect, getProfile);
// router.put("/profile", protect, updateProfile);
// router.post("/join-mess", protect, joinMess);


export default router;
