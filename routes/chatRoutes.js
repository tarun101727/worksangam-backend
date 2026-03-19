import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import multer from "multer";
import {
  createChat,
  getChatNotifications,
  getChats,
  getMessages,
  markChatNotificationsRead,
  sendMedia,
  sendMessage
} from "../controllers/chatController.js";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },

  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {

    const allowed = [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/webp",
      "video/mp4",
      "video/webm",
      "video/ogg"
    ];

    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only image or video allowed"));
    }

  }
});

const router = express.Router();

router.post("/create/:userId", authMiddleware, createChat);
router.get("/", authMiddleware, getChats);
router.get("/messages/:chatId", authMiddleware, getMessages);
router.post("/send/:chatId", authMiddleware, sendMessage);
router.post(
  "/send-media/:chatId",
  authMiddleware,
  upload.single("image"),
  sendMedia
);

router.get("/notifications", authMiddleware, getChatNotifications);
router.put("/notifications/read", authMiddleware, markChatNotificationsRead);

export default router;