import mongoose from "mongoose";

const creditTransactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  type: {
    type: String,
    enum: ["CREDIT", "DEBIT", "WELCOME_BONUS"],
    required: true,
  },

  credits: {
    type: Number,
    required: true,
  },

  description: {
    type: String,
    default: "",
  },

  paymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Payment",
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model(
  "CreditTransaction",
  creditTransactionSchema
);
