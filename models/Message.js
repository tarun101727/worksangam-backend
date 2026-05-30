import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  chatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Chat",
    required: true,
  },

  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },

  encryptedMessage: {
  type: String
},

  image:{
  type:String
} ,

location: {
  lat: Number,
  lng: Number,

  address: {
    type: String,
    default: "",
  },

  type: {
    type: String,
    enum: ["current", "live"],
  },
},

liveLocationActive: {
  type: Boolean,
  default: true,
},

replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Message",
    default: null,
  },

  replyText: {
  type: String,
  default: "",
},

replyImage: {
  type: String,
  default: "",
},

replyType: {
  type: String,
  enum: ["text", "image", "video"],
  default: "text",
}


}, { timestamps: true });

export default mongoose.model("Message", messageSchema);
