// utils/jwt-token.js
import jwt from "jsonwebtoken";

export const generateToken = (userId, res) => {
  // Validate JWT_SECRET exists
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined in environment variables");
  }

  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

  // Universal cookie settings for all devices/browsers
  const isProduction = process.env.NODE_ENV === "production";

  res.cookie("jwt", token, {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    httpOnly: true, // Prevents XSS attacks
    sameSite: isProduction ? "none" : "lax", // "none" for cross-site in production
    secure: isProduction, // HTTPS only in production
    path: "/", // Available on all routes
  });

  // console.log("✅ JWT Token generated for user:", userId);
  return token;
};
