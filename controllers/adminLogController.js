import AdminLog from "../models/AdminLog.js";

export const getAdminLogs = async (req, res) => {
  try {
    const logs = await AdminLog.find()
      .populate("adminId", "email role")
      .sort({ createdAt: -1 })
      .limit(200); // safety limit

    res.json({ logs });
  } catch (err) {
    console.error("Fetch admin logs error:", err);
    res.status(500).json({ msg: "Failed to fetch admin logs" });
  }
};
