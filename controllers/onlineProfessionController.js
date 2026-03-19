import OnlineProfession from "../models/OnlineProfession.js";

export const getOnlineProfessions = async (req, res) => {
  try {
    const professions = await OnlineProfession
      .find({}, { name: 1 })   // return name + _id
      .sort({ name: 1 });

    res.json({
      professions
    });

  } catch (err) {
    console.error("Online professions error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};
