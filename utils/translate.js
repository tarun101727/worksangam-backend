import { Translate } from "@google-cloud/translate";

const translate = new Translate({
  key: process.env.GOOGLE_API_KEY,
});

export const translateText = async (text, target = "te") => {
  try {
    if (!text) return "";

    const [translation] = await translate.translate(text, target);
    return translation;
  } catch (err) {
    console.error("❌ Google Translate Error:", err);
    return text; // 🔥 fallback (prevents crash)
  }
};
