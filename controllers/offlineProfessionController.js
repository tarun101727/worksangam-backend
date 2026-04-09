import OfflineProfession from "../models/OfflineProfession.js";

export const getOfflineProfessions = async (req, res) => {
  try {
    const lang = req.query.lang || "en";

    const professions = await OfflineProfession.find({}).sort({ name: 1 });

    const formatted = professions.map((p) => ({
      _id: p._id,
      name: lang === "en"
        ? p.name
        : p.translations?.[lang] || p.name,
      originalName: p.name // optional (for better search)
    }));

    res.json({ professions: formatted });

  } catch (err) {
    console.error("Offline professions error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};
