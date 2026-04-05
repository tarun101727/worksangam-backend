// translate.js
import { TranslationServiceClient } from "@google-cloud/translate";

const client = new TranslationServiceClient({ key: process.env.GOOGLE_API_KEY });

// Transliteration / phonetic mapping
export const transliterateText = async (text, targetLanguageCode = "te") => {
  if (!text) return "";

  const request = {
    parent: `projects/${process.env.GOOGLE_PROJECT_ID}/locations/global`,
    contents: [text],
    mimeType: "text/plain",
    sourceLanguageCode: "en",
    targetLanguageCode: targetLanguageCode,
    model: "nmt",
  };

  const [response] = await client.translateText(request);
  return response.translations.map(t => t.translatedText).join("");
};

// Normal translation
export const translateText = async (text, targetLanguageCode = "te") => {
  if (!text) return "";

  const request = {
    parent: `projects/${process.env.GOOGLE_PROJECT_ID}/locations/global`,
    contents: [text],
    mimeType: "text/plain",
    sourceLanguageCode: "auto",
    targetLanguageCode: targetLanguageCode,
    model: "nmt",
  };

  const [response] = await client.translateText(request);
  return response.translations.map(t => t.translatedText).join("");
};
