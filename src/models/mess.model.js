import { model, Schema } from "mongoose";

const messSchema = new Schema({
  name: {
    type: String,
    required: true,
  },

  // HEX invite code
  code: {
    type: String,
    required: true,
    unique: true,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  members: [
    {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Mess = model("Mess", messSchema);

export default Mess;
