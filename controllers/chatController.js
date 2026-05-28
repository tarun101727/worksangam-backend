import cloudinary from "../config/cloudinary.js";
import fs from "fs";
import Chat from "../models/Chat.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import { encryptMessage, decryptMessage } from "../utils/encryption.js";
import { io } from "../socket.js";
import ChatNotification from "../models/ChatNotification.js";

/* create or get chat */
export const createChat = async (req, res) => {
  const senderId = req.user.id;
  const receiverId = req.params.userId;

  let chat = await Chat.findOne({
    participants: { $all: [senderId, receiverId] }
  });

  if (!chat) {
    chat = await Chat.create({
      participants: [senderId, receiverId]
    });
  }

  res.json(chat);
};


/* get user chats */
export const getChats = async (req, res) => {
  try {

    const chats = await Chat.find({
      participants: req.user.id
    })
      .populate(
        "participants",
        "firstName lastName profileImage avatarInitial avatarColor"
      )
      .sort({ updatedAt: -1 });

    const chatsWithUnread = await Promise.all(
      chats.map(async (chat) => {

        const unreadCount =
          await ChatNotification.countDocuments({
            chat: chat._id,
            receiver: req.user.id,
            isRead: false,
          });

        return {
          ...chat._doc,
          unreadCount,
        };
      })
    );

    res.json(chatsWithUnread);

  } catch (err) {
    console.error(err);

    res.status(500).json({
      msg: "Server error"
    });
  }
};



/* get messages */

/* get messages */

export const getMessages = async (req, res) => {

  const chat = await Chat.findById(req.params.chatId)
  .populate("participants","firstName lastName profileImage");

  const messages = await Message.find({
  chatId: req.params.chatId
})
.sort({ createdAt: 1 })

.populate("sender", "profileImage firstName lastName");

  const decrypted = messages.map(m => ({
    ...m._doc,
    message: decryptMessage(m.encryptedMessage)
  }));

  res.json({
    messages: decrypted,
    participants: chat.participants
  });

};



/* send message */

export const sendMessage = async (req, res) => {

  const {
  message,
  replyTo,
  replyText,
  replyImage,
  replyType
} = req.body;

  const encrypted = encryptMessage(message);

  const msg = await Message.create({
  chatId: req.params.chatId,

  sender: req.user.id,

  encryptedMessage: encrypted,

  replyTo: replyTo || null,

  replyText: replyText || "",

  replyImage: replyImage || "",

  replyType: replyType || "text",
});

  // inside sendMessage
const populated = await msg.populate("sender","profileImage firstName lastName");

// Emit message to chat participants
io.to(req.params.chatId).emit("receive-message", {
  ...populated._doc,
  message
});

// 🔔 Create notification for receiver
const chat = await Chat.findById(req.params.chatId);
const receiverId = chat.participants.find(id => id.toString() !== req.user.id);

const chatNotification = await ChatNotification.create({
  chat: chat._id,
  sender: req.user.id,
  receiver: receiverId,
  message,
});

const populatedNotif = await chatNotification.populate("sender", "firstName lastName profileImage");

// Emit notification to receiver
io.to(receiverId.toString()).emit("new-chat-notification", populatedNotif);

res.json(populated);
};

export const sendMedia = async (req, res) => {
  try {

    const caption = req.body?.caption || "";

const {
  replyTo,
  replyText,
  replyImage,
  replyType
} = req.body;

    let imageUrl = null;

    /*
    CHECK FILE
    */

    if (!req.file) {
      return res.status(400).json({
        error: "No file uploaded"
      });
    }

    /*
    UPLOAD TO CLOUDINARY
    */

    const result = await cloudinary.uploader.upload(
      req.file.path,
      {
        folder: "chat_media",
        resource_type: "auto",
      }
    );

    imageUrl = result.secure_url;

    /*
    DELETE TEMP FILE
    */

    fs.unlinkSync(req.file.path);

    /*
    ENCRYPT MESSAGE
    */

    const encrypted = encryptMessage(caption);

    /*
    SAVE MESSAGE
    */

    const msg = await Message.create({
  chatId: req.params.chatId,

  sender: req.user.id,

  encryptedMessage: encrypted,

  image: imageUrl,

  replyTo: replyTo || null,

  replyText: replyText || "",

  replyImage: replyImage || "",

  replyType: replyType || "text",
});

    /*
    POPULATE SENDER
    */

    const populated = await msg.populate(
      "sender",
      "profileImage firstName lastName"
    );

    /*
    SOCKET EMIT
    */

    io.to(req.params.chatId).emit(
      "receive-message",
      {
        ...populated._doc,
        message: caption,
      }
    );

    /*
    RETURN RESPONSE
    */

    res.json({
      ...populated._doc,
      message: caption,
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: "Failed to send media"
    });
  }
};


export const getChatNotifications = async (req, res) => {
  try {
    const notifications = await ChatNotification.find({ receiver: req.user.id })
      .populate("sender", "firstName lastName profileImage avatarInitial avatarColor")
      .sort({ createdAt: -1 });
    
    res.json({ notifications });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};

export const markChatNotificationsRead = async (req, res) => {
  try {

    const { chatId } = req.body;

    /*
    MARK ALL CHAT NOTIFICATIONS READ
    */

    await ChatNotification.updateMany(
      {
        receiver: req.user.id,
        chat: chatId,
        isRead: false,
      },
      {
        $set: {
          isRead: true,
        },
      }
    );

    /*
    🔥 EMIT GLOBAL CHAT READ EVENT
    */

    io.to(req.user.id).emit(
      "chat-read",
      {
        chatId,
      }
    );

    res.json({
      msg: "Chat notifications marked as read",
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      msg: "Server error",
    });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const msg = await Message.findById(req.params.id);

    if (!msg) {
      return res.status(404).json({ msg: "Message not found" });
    }

    if (msg.sender.toString() !== req.user.id) {
      return res.status(403).json({ msg: "Unauthorized" });
    }

    await Message.findByIdAndDelete(req.params.id);

    res.json({ msg: "Deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};

export const reportMessage = async (req, res) => {
  try {
    console.log("Reported Message:", req.params.id, "By:", req.user.id);

    res.json({ msg: "Reported successfully" });
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
};
