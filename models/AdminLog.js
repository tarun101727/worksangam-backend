// models/AdminLog.js
import mongoose from "mongoose";

const AdminLogSchema = new mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  action: String,
  targetType: String, // user, job, system
  targetId: String,
  meta: Object,
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("AdminLog", AdminLogSchema);
