import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js"; 
import cookieParser from "cookie-parser";

import routes from "./routes/user.route.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;


// Middlewares-
app.use(cors());
app.use(cookieParser());
app.use(express.json());


//routes-

app.use('/api/v1', routes);





app.get("/", (req, res) => {
  res.send("Mess Manager API is running 🚀");
});


app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    connectDB();
});
