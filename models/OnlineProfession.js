import mongoose from "mongoose";

const OnlineProfessionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },

 translations: {
  en: { type: String },
  te: { type: String },
  hi: { type: String },
  as: { type: String },
  bn: { type: String },
  brx: { type: String },
  doi: { type: String },
  gu: { type: String },
  kn: { type: String },
  ks: { type: String },
  kok: { type: String },
  mai: { type: String },
  ml: { type: String },
  mni: { type: String },
  mr: { type: String },
  ne: { type: String },
  or: { type: String },
  pa: { type: String },
  sa: { type: String },
  sat: { type: String },
  sd: { type: String },
  ta: { type: String },
  ur: { type: String }
}
});

export default mongoose.model("OnlineProfession", OnlineProfessionSchema);
