import mongoose from "mongoose";
const { Schema, Types } = mongoose;

// ✅ Recursive reply schema
const replySchema = new Schema({
  replier: { type: Types.ObjectId, ref: "User", required: true },
  username: { type: String },
  profileImage: { type: String },
  text: { type: String, required: true },
  likes: [{ type: Types.ObjectId, ref: "User" }],
  dislikes: [{ type: Types.ObjectId, ref: "User" }],
  createdAt: { type: Date, default: Date.now },
  replies: [] // Placeholder to be added recursively
}, { _id: true });

// ✅ Add recursive nesting once
replySchema.add({
  replies: [replySchema]
});

// ✅ Comment schema (uses recursive replies)
const commentSchema = new Schema({
  commenter: { type: Types.ObjectId, ref: "User", required: true },
  username: { type: String },
  text: { type: String, required: true },
  likes: [{ type: Types.ObjectId, ref: "User" }],
  dislikes: [{ type: Types.ObjectId, ref: "User" }],
  replies: [replySchema],
  createdAt: { type: Date, default: Date.now }
}, { _id: true });

// ✅ Media schema
const mediaSchema = new Schema({
  owner: { type: Types.ObjectId, ref: "User", required: true },
  url: { type: String, required: true },
  type: { type: String, enum: ["image", "video", "shot"], required: true },
  title: { type: String },
  description: { type: String },
  duration: { type: Number },
likes: [{ user: { type: Types.ObjectId, ref: "User" }, createdAt: { type: Date, default: Date.now } }],
  dislikes: [{
    user: { type: Types.ObjectId, ref: "User" },
    createdAt: { type: Date, default: Date.now }
  }],
  comments: [commentSchema],
  visibility: { type: String, default: "public", enum: ["public", "private"] },
  reportCount: { type: Number, default: 0 },
  
  userId: { type: Types.ObjectId, ref: "User", required: true },

  // 👁 View tracking
views: { type: Number, default: 0 },
viewedBy: [
  {
    user: { type: Types.ObjectId, ref: "User" },
    createdAt: { type: Date, default: Date.now }
  }
],


  // 🌍 Country view tracking
  countryViews: [{
    country: { type: String },
    city: { type: String },
    count: { type: Number, default: 0 }
  }],

  accessType: {
  type: String,
  enum: ["free", "subscriber"],
  default: "free"
},


  qualityUrls: {
  type: Map,
  of: String, // key = quality (e.g., "720p"), value = URL
  default: {},
      label: String,
    url: String
},

qualityOptions: {
  type: [ { label: String, url: String } ],
  default: [],
},

poster: { type: String, default: null },
 watchLater: [{ type: Types.ObjectId, ref: "Media" }],

  // Media.js
notInterestedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // users who marked this media as not interested
dontRecommendBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }] ,// users who don't want this creator

trendingScore: { type: Number, default: 0 }, // computed hourly
lastTrendingUpdate: { type: Date, default: null }


}, { timestamps: true });

export default mongoose.model("Media", mediaSchema);
