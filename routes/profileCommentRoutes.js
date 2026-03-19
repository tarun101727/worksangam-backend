import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import {
  addComment,
  deleteComment,
  getComments,
  toggleLike,
} from "../controllers/profileCommentController.js";

const router = express.Router();

router.post("/add", authMiddleware, addComment);

router.post("/like/:commentId", authMiddleware, toggleLike);

router.get("/:profileId", getComments);

router.delete("/delete/:commentId", authMiddleware, deleteComment);

export default router;