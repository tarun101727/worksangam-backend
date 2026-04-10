// backend/models/Language.js
import mongoose from "mongoose";

const LanguageSchema = new mongoose.Schema({
  name: { type: String, required: true },        // English name
  nativeName: { type: String, required: true },  // Native language name
  code: { type: String, required: true },
  region: { type: String, default: "" },
});

export default mongoose.model("Language", LanguageSchema);
