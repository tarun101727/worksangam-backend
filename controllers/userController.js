import User from "../models/User.js";

export const getEmployeesByType = async (req, res) => {
  try {

    const { status } = req.params;
    const { profession } = req.query;

    if (!["online", "offline"].includes(status)) {
      return res.status(400).json({
        msg: "Invalid status"
      });
    }

   const query = {
  role: "employee",
  onboardingStep: "completed",
};

// Only filter online/offline when a profession is selected
if (profession) {
  query.profession = {
    $regex: new RegExp(`^${profession}$`, "i"),
  };

  query.isAvailable = status === "online";
}

const employees = await User.find(query)
  .sort({ createdAt: -1 }) // newest employees first
  .select(
    "firstName lastName profession profileImage isAvailable avatarInitial avatarColor location"
  );

    res.json({ employees });

  } catch (err) {

    console.error("Get employees error:", err);

    res.status(500).json({
      msg: "Server error"
    });
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
