import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import multer from "multer";
import {
  createChat,
  deleteMessage,
  getChatNotifications,
  getChats,
  getMessages,
  markChatNotificationsRead,
  reportMessage,
  sendMedia,
  sendMessage,
  stopLiveLocation,
  updateLiveLocation
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

    console.log("MIME TYPE:", file.mimetype);

    const allowed = [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/webp",
      "image/heic",
      "image/heif",
      "video/mp4",
      "video/webm",
      "video/ogg"
    ];

    if (allowed.includes(file.mimetype)) {

      cb(null, true);

    } else {

      return cb(
        new Error("Unsupported file type"),
        false
      );
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
  upload.single("media"),
  sendMedia
);

router.get("/notifications", authMiddleware, getChatNotifications);
router.put("/notifications/read", authMiddleware, markChatNotificationsRead);

router.delete("/message/:id", authMiddleware, deleteMessage);
router.post("/report/:id", authMiddleware, reportMessage);

router.put(
  "/stop-live/:id",
  authMiddleware,
  stopLiveLocation
);


router.put(
  "/update-live/:id",
  authMiddleware,
  updateLiveLocation,
);

export default router;
