import OnlineProfession from "../models/OnlineProfession.js";

export const getOnlineProfessions = async (req, res) => {
  try {
    const lang = req.query.lang || "en";

    const professions = await OnlineProfession
      .find({})
      .sort({ name: 1 });

    const formatted = professions.map((p) => ({
      _id: p._id,
      name: lang === "en"
        ? p.name
        : p.translations?.[lang] || p.name,
      originalName: p.name // for search support
    }));

    res.json({ professions: formatted });

  } catch (err) {
    console.error("Online professions error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};
