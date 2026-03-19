import mongoose from "mongoose";

const OnlineProfessionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  }
});

export default mongoose.model("OnlineProfession", OnlineProfessionSchema);