import mongoose from "mongoose";

const OnlineProfessionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },

  translations: {
    te: { type: String }, // Telugu
    hi: { type: String }, // Hindi (optional)
    ta: { type: String },
    kn: { type: String }
  }
}, { collection: "online_professions" });

export default mongoose.model("OnlineProfession", OnlineProfessionSchema);
