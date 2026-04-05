// backend/utils/translate.js
import { TranslationServiceClient } from "@google-cloud/translate";

const client = new TranslationServiceClient({
  key: process.env.GOOGLE_API_KEY,
});

const projectId = process.env.GOOGLE_PROJECT_ID;
const location = "global"; // or your preferred location

/**
 * Translate or transliterate text using Google Cloud Translate v3
 * @param {string} text
 * @param {string} targetLanguageCode - e.g., "te" for Telugu
 * @param {string} sourceLanguageCode - optional, e.g., "en"
 * @param {boolean} isTransliterate - if true, performs transliteration
 */
export const translateText = async (
  text,
  targetLanguageCode = "te",
  sourceLanguageCode = "en",
  isTransliterate = false
) => {
  if (!text) return "";

  const parent = `projects/${projectId}/locations/${location}`;

  const request = {
    parent,
    contents: [text],
    mimeType: "text/plain",
    targetLanguageCode,
  };

  if (sourceLanguageCode) request.sourceLanguageCode = sourceLanguageCode;
  if (isTransliterate) request.transliterationConfig = { 
    // v3 allows transliteration only for supported languages
    targetScript: "TML" // for Telugu; adjust for other languages
  };

  const [response] = await client.translateText(request);

  // v3 returns array of translations
  if (response.translations && response.translations.length > 0) {
    return response.translations[0].translatedText;
  }

  return text;
};
