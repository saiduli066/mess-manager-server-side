import { model, Schema } from "mongoose";

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    phone: {
      type: String,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    image: {
      type: String, // Cloudinary URL
    },
    role: {
      type: String,
      enum: ["admin", "member"],
      default: "member",
    },
    messId: {
      type: Schema.Types.ObjectId,
      ref: "Mess",
    },
    totalDeposit: {
      type: Number,
      default: 0,
    },
    mealCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

const User=model("User", userSchema);
export default User;
