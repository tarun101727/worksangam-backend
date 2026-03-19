import mongoose from "mongoose";

const ProfileCommentSchema = new mongoose.Schema(
  {
    profileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true, // employee profile
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true, // who commented
    },

    text: {
      type: String,
      required: true,
      trim: true,
    },

    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProfileComment",
      default: null,
    },

    depth: {
      type: Number,
      default: 0,
      max: 4,
    },

    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model("ProfileComment", ProfileCommentSchema);