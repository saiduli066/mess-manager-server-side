// middleware/auth.middleware.js
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

export const protect = async (req, res, next) => {
  try {
    const token = req.cookies.jwt;

    if (!token) {
      console.log("❌ No JWT token found in cookies");
      return res.status(401).json({ message: "Not authorized, no token" });
    }

    // Validate JWT_SECRET exists
    if (!process.env.JWT_SECRET) {
      console.error("❌ JWT_SECRET is not defined");
      return res.status(500).json({ message: "Server configuration error" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // console.log("✅ Token decoded successfully for user:", decoded.userId);

    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      // console.log("❌ User not found for ID:", decoded.userId);
      return res.status(401).json({ message: "User not found" });
    }

    req.user = user;
    req.userId = decoded.userId;

    // console.log("✅ User authenticated:", user.email);
    next();
  } catch (error) {
    console.log("❌ JWT verification error:", error.message);

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Invalid token" });
    }
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired" });
    }

    return res.status(401).json({ message: "Not authorized, token failed" });
  }
};
