import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import connectDB from "./config/db.js";
import routes from "./routes/user.route.js";
import billRoutes from "./routes/bill.route.js";
import notificationRoutes from "./routes/notification.route.js";
import dataIntegrityRoutes from "./routes/dataIntegrity.route.js";

dotenv.config();

const port = process.env.PORT || 5000; // Fixed: should be PORT not port

connectDB();
const app = express();
app.set("trust proxy", 1);

// Enhanced CORS for universal device compatibility
// app.use(
//   cors({
//     origin: [
//       "http://localhost:5173",
//       "http://localhost:3000",
//       "https://mess-manager-backend.vercel.app/api/v1",
//       "https://un-mess.netlify.app",
//       "https://mess-manager-backend-saiduli066-saiduli066s-projects.vercel.app",
//       "https://mess-manager-backend.vercel.app",
//     ],
//     credentials: true,
//     methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
//     allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
//   })
// );

// Simplified CORS for maximum compatibility
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:3000",
      "https://un-mess.netlify.app",
    ],
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Routes
app.use("/api/v1", routes);
app.use("/api/v1/bills", billRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/integrity", dataIntegrityRoutes);

app.get("/", (req, res) => {
  res.send("Mess Manager API is running...");
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

export default app;
