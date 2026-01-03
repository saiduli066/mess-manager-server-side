// import { Schema, model } from "mongoose";

// const messEntrySchema = new Schema(
//   {
//     userId: {
//       type: Schema.Types.ObjectId,
//       ref: "User",
//       required: true,
//     },
//     messId: {
//       type: Schema.Types.ObjectId,
//       ref: "Mess",
//       required: true,
//     },
//     type: {
//       type: String,
//       enum: ["meal", "deposit"],
//       require: true,
//     },
//     amount: {
//       type: Number,
//       require: true,
//     },
//     date: {
//       type: Date,
//       default: Date.now,
//     },
//   },
//   {
//     timestamps: true,
//   }
// );

// const MessEntry = model("MessEntry", messEntrySchema);

// export default MessEntry;


// models/messEntry.model.js
import { Schema, model } from "mongoose";

const messEntrySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    messId: { type: Schema.Types.ObjectId, ref: "Mess", required: true },
    type: { type: String, enum: ["deposit","meal"], required: true },
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

export default model("MessEntry", messEntrySchema);