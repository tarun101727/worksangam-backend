import { Translate } from "@google-cloud/translate/build/src/v2/index.js";

const translate = new Translate({
  key: process.env.GOOGLE_API_KEY,
});

export const translateText = async (text, target = "te") => {
  if (!text) return "";

  const [translation] = await translate.translate(text, target);
  return translation;
};
