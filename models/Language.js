// backend/models/Language.js
import mongoose from "mongoose";

const LanguageSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true }, // e.g., "en", "hi"
  region: { type: String, default: "" },  // e.g., "IN", "US"
});

export default mongoose.model("Language", LanguageSchema);