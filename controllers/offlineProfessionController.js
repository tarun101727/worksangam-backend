import OfflineProfession from "../models/OfflineProfession.js";

export const getOfflineProfessions = async (req, res) => {
  try {
    const professions = await OfflineProfession
      .find({}, { name: 1 })
      .sort({ name: 1 });

    res.json({
      professions
    });

  } catch (err) {
    console.error("Offline professions error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};
