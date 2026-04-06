// models/Translate.js
import mongoose from "mongoose";

const TranslateSchema = new mongoose.Schema({
  languageCode: { type: String, required: true, unique: true }, // e.g., "en", "te", "hi"
  languageName: { type: String, required: true }, // e.g., "English", "తెలుగు", "हिन्दी"
  translations: { type: Object, required: true }, // JSON object of key -> value
}, { timestamps: true });

const Translate = mongoose.model("Translate", TranslateSchema);

export default Translate;