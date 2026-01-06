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

  // Cross-site compatible cookie settings (Required for Netlify -> Vercel)
  res.cookie("jwt", token, {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: "none", // Required for cross-site requests
    secure: true, // Required for SameSite=None
    path: "/",
  });

  console.log("✅ JWT Token generated for user:", userId);
  return token;
};
