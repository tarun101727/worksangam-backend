import { TranslationServiceClient } from "@google-cloud/translate";

const client = new TranslationServiceClient({ key: process.env.GOOGLE_API_KEY });

export const translateText = async (text, targetLanguageCode = "te") => { 
  if (!text) return "";

  const request = {
    parent: `projects/${process.env.GOOGLE_PROJECT_ID}/locations/global`,
    contents: [text],
    mimeType: "text/plain",
    sourceLanguageCode: "en",
    targetLanguageCode,  // e.g., "te" for Telugu
    model: "nmt",        // optional
  };

  const [response] = await client.translateText(request);
  return response.translations[0].translatedText;
};
