import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js"; 

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;


// Middlewares-
app.use(cors());
app.use(express.json());


//routes-




app.get("/", (req, res) => {
  res.send("Mess Manager API is running 🚀");
});


app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    connectDB();
});
