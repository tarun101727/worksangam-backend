import { TranslationServiceClient } from "@google-cloud/translate";

const client = new TranslationServiceClient({ key: process.env.GOOGLE_API_KEY });

export const transliterateText = async (text, targetLanguageCode = "te") => {
  if (!text) return "";

  const request = {
    parent: `projects/${process.env.GOOGLE_PROJECT_ID}/locations/global`,
    contents: [text],
    mimeType: "text/plain",
    sourceLanguageCode: "en",
    targetLanguageCode, // Telugu 'te'
    model: "projects/google/locations/global/models/online_transliteration",
  };

  const [response] = await client.transliterateText(request);
  return response.translations[0].translatedText;
};
