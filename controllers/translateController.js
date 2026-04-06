// controllers/translateController.js
import Translate from "../models/Translate.js";

/* Upload / Add translations */
export const addLanguageTranslations = async (req, res) => {
  try {
    const { languageCode, languageName, translations } = req.body;

    if (!languageCode || !languageName || !translations) {
      return res.status(400).json({ msg: "All fields are required" });
    }

    const existing = await Translate.findOne({ languageCode });

    if (existing) {
      existing.translations = translations;
      existing.languageName = languageName;
      await existing.save();
      return res.json({ msg: "Translations updated", language: existing });
    }

    const newLang = new Translate({ languageCode, languageName, translations });
    await newLang.save();

    res.json({ msg: "Translations added", language: newLang });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};

export const getTranslations = async (req, res) => {
  try {
    const { lang } = req.params;

    // Fetch all documents for this language
    const docs = await Translate.find({ languageCode: lang });

    if (!docs || docs.length === 0) {
      return res.status(404).json({ msg: "Language not found" });
    }

    // Combine key/value into a single object
    const translations = {};
    docs.forEach(doc => {
      translations[doc.key] = doc.value;
    });

    res.json(translations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};
