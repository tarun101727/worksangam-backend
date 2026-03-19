import ProfileComment from "../models/ProfileComment.js";
import { io } from "../socket.js";

export const addComment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { profileId, text, parentComment } = req.body;

    let depth = 0;

    if (parentComment) {
      const parent = await ProfileComment.findById(parentComment);

      if (!parent) {
        return res.status(404).json({ msg: "Parent comment not found" });
      }

      depth = parent.depth + 1;

      if (depth > 4) {
        return res.status(400).json({ msg: "Max reply depth reached" });
      }
    }

    const comment = await ProfileComment.create({
      profileId,
      user: userId,
      text,
      parentComment: parentComment || null,
      depth,
    });

    const populated = await ProfileComment.findById(comment._id)
      .populate("user", "firstName lastName avatarInitial avatarColor profileImage");

    io.to(`profile-${profileId}`).emit("profile-comment-added", populated);

    res.json(populated);

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};

export const getComments = async (req, res) => {
  try {
    const { profileId } = req.params;

    const comments = await ProfileComment.find({ profileId })
      .populate("user", "firstName lastName avatarInitial avatarColor profileImage")
      .sort({ createdAt: -1 });

    res.json(comments);
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
};

export const toggleLike = async (req, res) => {
  try {

    const userId = req.user.id;
    const { commentId } = req.params;

    const comment = await ProfileComment.findById(commentId);

    if (!comment) {
      return res.status(404).json({ msg: "Comment not found" });
    }

    const alreadyLiked = comment.likes.includes(userId);

    if (alreadyLiked) {
      comment.likes.pull(userId);
    } else {
      comment.likes.push(userId);
    }

    await comment.save();

    /* 🔥 SOCKET EMIT */
    io.to(`profile-${comment.profileId}`).emit("profile-comment-liked", {
      commentId,
      likes: comment.likes,
    });

    res.json({
      likes: comment.likes.length,
      liked: !alreadyLiked,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};

export const deleteComment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { commentId } = req.params;

    const comment = await ProfileComment.findById(commentId);

    if (!comment) {
      return res.status(404).json({ msg: "Comment not found" });
    }

    // only owner can delete
    if (comment.user.toString() !== userId) {
      return res.status(403).json({ msg: "Not allowed" });
    }

    await ProfileComment.deleteMany({
      $or: [
        { _id: commentId },
        { parentComment: commentId },
      ],
    });

    /* 🔥 SOCKET EMIT */
    io.to(`profile-${comment.profileId}`).emit(
  "profile-comment-deleted",
  commentId
);

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};