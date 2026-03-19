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
}

}, { timestamps: true });

export default mongoose.model("Message", messageSchema);