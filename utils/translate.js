import { Translate } from "@google-cloud/translate/build/src/v2/index.js";

const translate = new Translate({
  key: process.env.GOOGLE_TRANSLATE_API_KEY, // or use credentials file
});

export const translateText = async (text, targetLang) => {
  try {
    if (!text) return text;

    const [translation] = await translate.translate(text, targetLang);
    return translation;
  } catch (err) {
    console.error("Translation error:", err.message);
    return text; // fallback
  }
};