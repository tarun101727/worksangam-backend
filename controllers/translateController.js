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

/* Get translations by language code */
export const getTranslations = async (req, res) => {
  try {
    const { lang } = req.params;

    console.log("=================================");
    console.log("Requested language:", lang);

    const translations = await Translate.findOne({
      languageCode: lang,
    });

    console.log("MongoDB result:", translations);

    if (!translations) {
      return res.status(404).json({
        msg: "Language not found",
      });
    }

    res.json(translations.translations);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      msg: "Server error",
    });
  }
};
