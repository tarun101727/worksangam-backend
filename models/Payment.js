// models/Payment.js
import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  orderId: String,
  amount: Number,
  credits: Number,
  status: {
    type: String,
    enum: ["PENDING", "SUCCESS", "FAILED"],
    default: "PENDING",
  },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Payment", paymentSchema);