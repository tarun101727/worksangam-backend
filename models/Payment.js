import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },

  orderId: String,

  amount: Number,

  plan: {
    type: String,
    enum: ["BASIC", "PREMIUM", "VIP"],
  },

  status: {
    type: String,
    enum: ["PENDING", "SUCCESS", "FAILED"],
    default: "PENDING",
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});


export default mongoose.model("Payment", paymentSchema);
