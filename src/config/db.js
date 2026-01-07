// config/db.js
import mongoose from "mongoose";

const connectDB = async () => {
  try {
    console.log("🔄 Attempting to connect to MongoDB...");

    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000, // 30 seconds timeout for server selection
      socketTimeoutMS: 45000, // 45 seconds socket timeout
      maxPoolSize: 10, // Maximum number of sockets in the connection pool
      retryWrites: true,
      retryReads: true,
      // Remove deprecated options
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database Name: ${conn.connection.name}`);

    // Handle connection events
    mongoose.connection.on("error", (err) => {
      console.error("❌ MongoDB connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      console.log("⚠️ MongoDB disconnected");
    });

    mongoose.connection.on("reconnected", () => {
      console.log("✅ MongoDB reconnected");
    });

    // Handle process termination
    process.on("SIGINT", async () => {
      await mongoose.connection.close();
      console.log("📦 MongoDB connection closed through app termination");
      process.exit(0);
    });
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    console.error(
      "💡 Connection string:",
      process.env.MONGODB_URI?.replace(/\/\/[^@]+@/, "//***:***@")
    ); // Hide credentials

    // Exit process with failure
    process.exit(1);
  }
};

// Helper function to check connection status
export const isDBConnected = () => {
  return mongoose.connection.readyState === 1;
};

export default connectDB;
