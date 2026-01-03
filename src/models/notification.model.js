// models/notification.model.js
import { Schema, model } from "mongoose";

const notificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    messId: { type: Schema.Types.ObjectId, ref: "Mess", required: true },
    type: {
      type: String,
      enum: [
        "meal_switch",
        "deposit",
        "meal_entry",
        "bill_created",
        "bill_updated",
        "bill_payment",
        "member_added",
        "member_removed",
        "system",
      ],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    data: {
      toggledBy: { type: Schema.Types.ObjectId, ref: "User" },
      performedBy: { type: Schema.Types.ObjectId, ref: "User" },
      mealType: String,
      switchState: Boolean,
      amount: Number,
      billId: { type: Schema.Types.ObjectId, ref: "Bill" },
      billName: String,
      entryType: String,
    },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Index for efficient filtering
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ messId: 1, createdAt: -1 });

export default model("Notification", notificationSchema);
