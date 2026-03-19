// controllers/adminController.js
import User from "../models/User.js";
import HirerPost from "../models/HirerPost.js";
import { logAdminAction } from "../utils/adminLogger.js";

export const getAllUsers = async (req, res) => {
  const users = await User.find().select(
    "email role isGuest isVerified createdAt"
  );

  res.json({ users });
};

export const getAdminStats = async (req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      totalEmployees,
      totalHirers,
      liveEmployees,
      totalJobPosts,
      jobsFilledToday,
    ] = await Promise.all([
      User.countDocuments({ role: { $ne: "guest" } }),
      User.countDocuments({ role: "employee" }),
      User.countDocuments({ role: "hirer" }),
      User.countDocuments({ role: "employee", isAvailable: true }),
      HirerPost.countDocuments(),
      HirerPost.countDocuments({
        status: "filled",
        updatedAt: { $gte: todayStart },
      }),
    ]);

    res.json({
      totalUsers,
      totalEmployees,
      totalHirers,
      liveEmployees,
      totalJobPosts,
      jobsFilledToday,
    });
  } catch (err) {
    console.error("Admin stats error:", err);
    res.status(500).json({ msg: "Failed to load admin stats" });
  }
};

/**
 * PATCH /admin/users/:id/toggle-disable
 */
export const toggleUserDisable = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ msg: "User not found" });

    user.isDisabled = !user.isDisabled;
    await user.save();

    // ✅ admin action log
    await logAdminAction({
      adminId: req.user.id,
      action: "TOGGLE_USER_DISABLE",
      targetType: "user",
      targetId: user._id,
    });

    res.json({
      msg: user.isDisabled ? "User disabled" : "User enabled",
      isDisabled: user.isDisabled,
    });
  } catch (err) {
    res.status(500).json({ msg: "Action failed" });
  }
};

/**
 * PATCH /admin/users/:id/role
 */
export const changeUserRole = async (req, res) => {
  try {
    const { role } = req.body;

    if (!["hirer", "employee", "guest"].includes(role)) {
      return res.status(400).json({ msg: "Invalid role" });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    );

    // ✅ admin action log
    await logAdminAction({
      adminId: req.user.id,
      action: "CHANGE_USER_ROLE",
      targetType: "user",
      targetId: user._id,
      meta: { newRole: role },
    });

    res.json({ msg: "Role updated", role: user.role });
  } catch (err) {
    res.status(500).json({ msg: "Role update failed" });
  }
};

/**
 * PATCH /admin/users/:id/soft-delete
 */
export const softDeleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    // Prevent double delete
    if (user.isDeleted) {
      return res.status(400).json({ msg: "User already deleted" });
    }

    user.isDeleted = true;
    user.deletedAt = new Date();
    await user.save();

    // ✅ admin action log
    await logAdminAction({
      adminId: req.user.id,
      action: "SOFT_DELETE_USER",
      targetType: "user",
      targetId: user._id,
    });

    res.json({ msg: "User soft deleted successfully" });
  } catch (err) {
    console.error("Soft delete error:", err);
    res.status(500).json({ msg: "Failed to delete user" });
  }
};
