import mongoose from "mongoose";

const DeleteReasonSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  role: {
    type: String,
    enum: ["hirer", "employee", "admin", "owner", "guest"],
  },

  email: {
    type: String
  },

  reason: {
    type: String,
    required: true
  },

  description: {
    type: String,
    default: null
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model("DeleteReason", DeleteReasonSchema);