import { TranslationServiceClient } from "@google-cloud/translate";

const client = new TranslationServiceClient({ key: process.env.GOOGLE_API_KEY });

export const transliterateText = async (text, targetLanguageCode = "te") => {
  if (!text) return "";

  const request = {
    parent: `projects/${process.env.GOOGLE_PROJECT_ID}/locations/global`,
    contents: [text],
    mimeType: "text/plain",
    sourceLanguageCode: "en",
    targetLanguageCode,
    model: "nmt",
  };

  const [response] = await client.translateText(request);

  // Transliteration comes from `translations[0].transliteratedText`
  const transliterated = response.translations[0]?.transliteratedText || "";
  return transliterated;
};
