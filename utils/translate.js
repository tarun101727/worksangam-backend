import { TranslationServiceClient } from "@google-cloud/translate";

const client = new TranslationServiceClient({ key: process.env.GOOGLE_API_KEY });
 
export const transliterateText = async (text, targetLanguageCode = "te") => {
  if (!text) return "";

  const request = {
    parent: `projects/${process.env.GOOGLE_PROJECT_ID}/locations/global`,
    contents: [text],
    mimeType: "text/plain",
    sourceLanguageCode: "en",
    targetLanguageCode: targetLanguageCode,
    model: "nmt", // Neural Machine Translation model
  };

  const [response] = await client.translateText(request);

  // Google automatically returns phonetic transliteration if source language is Latin + target is non-Latin
  return response.translations.map(t => t.translatedText).join("");
};
