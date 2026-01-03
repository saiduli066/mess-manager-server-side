// models/bill.model.js
import { model, Schema } from "mongoose";

const memberPaymentSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    paid: { type: Boolean, default: false },
    paidAt: { type: Date },
  },
  { _id: false }
);

const billSchema = new Schema(
  {
    messId: { type: Schema.Types.ObjectId, ref: "Mess", required: true },
    name: { type: String, required: true },
    totalAmount: { type: Number, required: true },
    perHeadAmount: { type: Number, required: true },
    month: { type: Number, required: true }, // 1-12
    year: { type: Number, required: true },
    date: { type: Date, required: true },
    members: [memberPaymentSchema],
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

// Index for efficient querying
billSchema.index({ messId: 1, year: 1, month: 1 });
billSchema.index({ messId: 1, date: 1 });

export default model("Bill", billSchema);
