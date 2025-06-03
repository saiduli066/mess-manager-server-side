import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import connectDB from "./config/db.js";
import routes from "./routes/user.route.js";

dotenv.config();
connectDB();

const app = express();

// Middlewares
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://mess-manager-backend.vercel.app/", 
    ],
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());

// Routes
app.use("/api/v1", routes);

app.get("/", (req, res) => {
  res.send("Mess Manager API is running...");
});

export default app;
