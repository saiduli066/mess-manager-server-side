import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import connectDB from "./config/db.js";
import routes from "./routes/user.route.js";

dotenv.config();

const port = process.env.port || 5000;

connectDB();
const app = express();
app.set("trust proxy", 1);

// Middlewares
app.use(
  cors({
    origin: ["http://localhost:5173", "https://un-mess.netlify.app"],
    credentials: true,
  })
);


app.use(cookieParser());
app.use(express.json({ limit: "10mb" })); 
app.use(express.urlencoded({ extended: true, limit: "10mb" }));



// Routes
app.use("/api/v1", routes);

app.get("/", (req, res) => {
  res.send("Mess Manager API is running...");
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

export default app;
