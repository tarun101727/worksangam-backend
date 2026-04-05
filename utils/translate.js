import pkg from "@google-cloud/translate";
const { v2 } = pkg;

const translate = new v2.Translate({
  key: process.env.GOOGLE_API_KEY,
});

export const translateText = async (text, target = "te") => {
  if (!text) return "";

  const [translation] = await translate.translate(text, target);
  return translation;
};
