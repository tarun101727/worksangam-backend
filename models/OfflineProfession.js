import mongoose from "mongoose";

const OfflineProfessionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },

  translations: {
    te: { type: String }, // Telugu
    hi: { type: String }, // Hindi
    ta: { type: String }, // Tamil
    kn: { type: String }, // Kannada
  }
});

export default mongoose.model("OfflineProfession", OfflineProfessionSchema);
