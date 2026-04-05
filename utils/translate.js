import { TranslationServiceClient } from "@google-cloud/translate";

const client = new TranslationServiceClient({ key: process.env.GOOGLE_API_KEY });

export const translateText = async (text, targetLanguageCode = "te") => {
  if (!text) return "";

  const request = {
    parent: `projects/${process.env.GOOGLE_PROJECT_ID}/locations/global`,
    contents: [text],
    mimeType: "text/plain",
    targetLanguageCode,
    model: "base",
    // 🔑 Specify transliteration
    sourceLanguageCode: "en",
  };

  const [response] = await client.translateText(request);

  // Transliteration result is in response.translations[0].translatedText
  return response.translations[0].translatedText;
};
