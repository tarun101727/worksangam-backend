// backend/controllers/languageController.js
import Language from "../models/Language.js";

/* ================= GET LANGUAGES ================= */
export const getLanguages = async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};
    if (search && search.trim()) {
      query = { name: { $regex: search.trim(), $options: "i" } };
    }

    const languages = await Language.find(query)
      .sort({ name: 1 })
      .limit(20); // limit suggestions

    res.json(languages);
  } catch (err) {
    console.error("Error fetching languages:", err);
    res.status(500).json({ msg: "Server error" });
  }
};