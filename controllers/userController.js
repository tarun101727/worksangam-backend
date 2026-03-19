import User from "../models/User.js";

export const getEmployeesByType = async (req, res) => {
  try {
    const { status } = req.params; // online | offline
    const { professionType, profession } = req.query;

    if (!["online", "offline"].includes(status)) {
      return res.status(400).json({ msg: "Invalid status" });
    }

    if (!["online", "offline"].includes(professionType)) {
      return res.status(400).json({ msg: "Invalid professionType" });
    }

    // ✅ Only filter by professionType, not availability
    const query = {
      role: "employee",
      professionType,           // online/offline
      onboardingStep: "completed",
    };

    if (profession) {
      query.profession = { $regex: new RegExp(`^${profession}$`, "i") };
    }

    const employees = await User.find(query).select(
      "firstName lastName profession profileImage isAvailable avatarInitial avatarColor location"
    );

    res.json({ employees });

  } catch (err) {
    console.error("Get employees error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

export const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select(`
      firstName lastName age gender email role
      profession skills experience languages bio
      profileImage
      avatarInitial avatarColor
      isAvailable
    `);

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    res.json({ user });
  } catch (err) {
    console.error("Get user by id error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};