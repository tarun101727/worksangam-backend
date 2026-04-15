import mongoose from "mongoose";

const ProfessionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  category: {
    type: String,
    default: "Other"
  },
  type: {
    type: String,
    enum: ["online", "offline"],
    default: "offline"
  },

    // ✅ ADD THIS BLOCK (VERY IMPORTANT)
  translations: {
    type: Map,
    of: String,
    default: {}
  }

});

export default mongoose.model("Profession", ProfessionSchema);
