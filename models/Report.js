import mongoose from "mongoose";

const ReportSchema = new mongoose.Schema({
  reporterId: mongoose.Schema.Types.ObjectId,
  targetType: String,
  targetId: String,
  reason: String,
  status: { type: String, default: "open" },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Report", ReportSchema);
