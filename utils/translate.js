import { TranslationServiceClient } from "@google-cloud/translate";

const client = new TranslationServiceClient({ key: process.env.GOOGLE_API_KEY });

export const transliterateText = async (text, targetLanguageCode = "te") => {
  if (!text) return "";

  const request = {
    parent: `projects/${process.env.GOOGLE_PROJECT_ID}/locations/global`,
    contents: [text],
    sourceLanguageCode: "en",
    targetLanguageCode,
  };

  const [response] = await client.transliterateText(request);
  return response.translations[0].translatedText;
};
