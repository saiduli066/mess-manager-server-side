// controllers/user.controller.js
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { generateToken } from "../utils/jwt-token.js";
import Notification from "../models/notification.model.js";
import mongoose from "mongoose";
import {
  sendEmail,
  forgotPasswordTemplate,
  passwordChangedTemplate,
} from "../utils/nodemailer.js";

export const signup = async (req, res) => {
  try {
    const { name, email, password, phone, image } = req.body;

    console.log("📝 Signup attempt for:", email);

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new User({
      name,
      email,
      password: hashedPassword,
      phone,
      image,
    });
    await user.save();

    console.log("✅ User created:", user._id);

    // Generate token with universal compatibility
    generateToken(user._id, res);

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      image: user.image,
      role: user.role,
      messId: user.messId,
    });
  } catch (error) {
    console.log("❌ Error from signup controller: ", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log("🔐 Login attempt for:", email);

    // Validate input
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      console.log("❌ User not found:", email);
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      console.log("❌ Invalid password for:", email);
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Generate token with universal compatibility
    generateToken(user._id, res);
    console.log("✅ Login successful for:", email);

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      image: user.image,
      role: user.role,
      messId: user.messId,
    });
  } catch (error) {
    console.log("❌ Error from login controller: ", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const logout = async (req, res) => {
  try {
    // Clear cookie with simplified settings
    res.clearCookie("jwt", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
    });

    console.log("✅ User logged out successfully");
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("❌ Error from logout controller: ", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const checkAuth = (req, res) => {
  try {
    console.log("✅ Check auth successful for:", req.user.email);
    res.status(200).json({
      _id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      phone: req.user.phone,
      image: req.user.image,
      role: req.user.role,
      messId: req.user.messId,
    });
  } catch (error) {
    console.log("❌ Error in checkAuth controller: ", error.message);
    res.status(500).json({ message: "Internal server error." });
  }
};

// ... (getUserProfile and updateUserProfile remain the same as previous version)
export const getUserProfile = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).select(
      "name email phone image messId role"
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      image: user.image,
      role: user.role,
      messId: user.messId,
    });
  } catch (error) {
    console.error("Error in getUserProfile:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const updateUserProfile = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const userId = req.user._id;
    const { name, phone, image } = req.body;

    const updateFields = {};
    if (name !== undefined && name.trim()) {
      // Validate name
      if (name.trim().length < 2) {
        await session.abortTransaction();
        return res
          .status(400)
          .json({ message: "Name must be at least 2 characters" });
      }
      if (name.trim().length > 50) {
        await session.abortTransaction();
        return res
          .status(400)
          .json({ message: "Name must be less than 50 characters" });
      }
      updateFields.name = name.trim();
    }
    if (phone !== undefined) updateFields.phone = phone;
    if (image !== undefined) updateFields.image = image;

    if (Object.keys(updateFields).length === 0) {
      await session.abortTransaction();
      return res.status(400).json({ message: "No fields to update" });
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updateFields, {
      new: true,
      runValidators: true,
      session,
    }).select("name email phone image role messId");

    if (!updatedUser) {
      await session.abortTransaction();
      return res.status(404).json({ message: "User not found" });
    }

    await session.commitTransaction();

    console.log(
      "✅ Profile updated for user:",
      updatedUser._id,
      updateFields.name ? `(Name: ${updateFields.name})` : ""
    );

    return res.status(200).json({
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("❌ Error in updateUserProfile:", error);
    return res
      .status(500)
      .json({ message: error.message || "Internal Server Error" });
  } finally {
    session.endSession();
  }
};

// NEW: Get User Notifications
export const getUserNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50); // Limit to recent 50

    res.json(notifications);
  } catch (error) {
    console.error("Get user notifications error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// NEW: Mark Notification as Read
export const markNotificationAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.json({ message: "Notification marked as read", notification });
  } catch (error) {
    console.error("Mark notification as read error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Forgot Password
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ message: "User not found with this email" });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Save token to user
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // Create reset URL - use production URL if in production, otherwise use development URL
    const clientUrl =
      process.env.NODE_ENV === "production"
        ? process.env.CLIENT_URL_PRODUCTION
        : process.env.CLIENT_URL;
    const resetUrl = `${clientUrl}/reset-password/${resetToken}`;

    // Send response immediately and email asynchronously (non-blocking)
    res.json({ message: "Password reset email sent successfully" });

    // Send email in background without waiting
    sendEmail(
      user.email,
      "Password Reset Request",
      forgotPasswordTemplate(resetUrl, user.name)
    ).catch((emailError) => {
      console.error("Email sending failed:", emailError);
      // Optionally: You could implement a retry mechanism or notification system here
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Reset Password
export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: "Password is required" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }

    // Hash the token from URL to compare with stored token
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // Find user with valid token and not expired
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res
        .status(400)
        .json({ message: "Invalid or expired reset token" });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    // Clear reset token fields
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    // Send confirmation email
    try {
      await sendEmail(
        user.email,
        "Password Changed Successfully",
        passwordChangedTemplate(user.name)
      );
    } catch (emailError) {
      console.error("Confirmation email failed:", emailError);
      // Don't fail the request if confirmation email fails
    }

    res.json({ message: "Password reset successful" });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Change Password (for logged-in users)
export const changePassword = async (req, res) => {
  try {
    const userId = req.user._id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: "Current and new passwords are required" });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ message: "New password must be at least 6 characters" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password
    );
    if (!isPasswordValid) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    // Hash and save new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    // Send confirmation email
    try {
      await sendEmail(
        user.email,
        "Password Changed Successfully",
        passwordChangedTemplate(user.name)
      );
    } catch (emailError) {
      console.error("Confirmation email failed:", emailError);
      // Don't fail the request if confirmation email fails
    }

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
