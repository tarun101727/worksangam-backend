import { TranslationServiceClient } from "@google-cloud/translate";

const client = new TranslationServiceClient({
  key: process.env.GOOGLE_API_KEY
});

export const transliterateText = async (text, targetLanguage = "te") => {
  if (!text) return "";

  const request = {
    parent: `projects/${process.env.GOOGLE_PROJECT_ID}/locations/global`,
    contents: [text],
    mimeType: "text/plain",
    sourceLanguageCode: "en",  // Latin input
    targetLanguageCode: targetLanguage, // Telugu
  };

  const [response] = await client.transliterateText(request);

  // Returns transliterated text
  return response.translations.map(t => t.translatedText).join(" ");
};
