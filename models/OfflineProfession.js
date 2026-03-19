import mongoose from "mongoose";

const OfflineProfessionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  }
});

export default mongoose.model("OfflineProfession", OfflineProfessionSchema);