import { Schema, model } from "mongoose";

const userSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String },
    image: { type: String },
    role: { type: String, enum: ["member", "admin"], default: "member" },
    messId: { type: Schema.Types.ObjectId, ref: "Mess" },
    totalDeposit: { type: Number, default: 0 },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
  },
  {
    timestamps: true,
  }
);

const User = model("User", userSchema);
export default User;
