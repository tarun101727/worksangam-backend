import React, { useEffect, useState, useMemo, useRef } from "react";
import axios from "axios";
import { BASE_URL } from "./config";
import { socket } from "./utils/socket";
import { countComments } from "../utils/countComment";
import i18n from "./i18n"; // ⬅️ import i18n

const getImageUrl = (img) => {
  if (!img) return "";
  if (img.startsWith("http")) return img;
  return `${BASE_URL}${img}`;
};

function timeAgo(dateString) {
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now - date) / 1000);
  const intervals = [
    { label: "year", seconds: 31536000 },
    { label: "month", seconds: 2592000 },
    { label: "week", seconds: 604800 },
    { label: "day", seconds: 86400 },
    { label: "hour", seconds: 3600 },
    { label: "minute", seconds: 60 },
  ];
  for (const interval of intervals) {
    const count = Math.floor(seconds / interval.seconds);
    if (count >= 1) {
      return `${count} ${interval.label}${count > 1 ? "s" : ""} ago`;
    }
  }
  return "Just now";
}

function formatLikes(num) {
  if (!num) return "";
  if (num >= 1000000) return (num / 1000000).toFixed(num % 1000000 === 0 ? 0 : 1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(num % 1000 === 0 ? 0 : 1) + "K";
  return num;
}

let translitTimer;
let latestTranslitRequest = "";

const transliterate = async (value, field, setState) => {
  const currentLang = i18n.language || "en";

  latestTranslitRequest = value;
  const words = value.split(" ");
  const lastWord = words[words.length - 1];
  if (!lastWord) return;

  try {
    const res = await fetch(
      `https://inputtools.google.com/request?text=${lastWord}&itc=${currentLang}-t-i0-und&num=5`
    );
    const data = await res.json();
    if (latestTranslitRequest !== value) return; // outdated response
    if (data[0] === "SUCCESS") {
      const bestMatch = data[1][0][1][0];
      words[words.length - 1] = bestMatch;
      setState(words.join(" "));
    }
  } catch (err) {
    console.error(err);
  }
};

const translateText = async (text, targetLang) => {
  try {
    if (!text) return text;
    const res = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(
        text
      )}`
    );
    const data = await res.json();
    return data[0].map((item) => item[0]).join("");
  } catch (err) {
    console.error("Translation failed:", err);
    return text;
  }
};

const CommentItem = React.memo(function CommentItem({
  comment,
  depth,
  profileId,
  replyText,
  setReplyText,
  showReply,
  setShowReply,
  showReplies,
  setShowReplies,
  sendReply,
  toggleLike,
  deleteComment,
  visibleReplies,
  setVisibleReplies,
  loggedInUserId,
}) {
  const [expanded, setExpanded] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const [translatedText, setTranslatedText] = useState("");
  const textRef = useRef(null);
  const hasReplies = comment.replies.length > 0;

  const userId = loggedInUserId;
  const isOwner =
  comment?.user?._id &&
  userId &&
  String(comment.user._id) === String(userId);
  const isProfileOwner = comment.user?._id === profileId;
  const visibleCount = visibleReplies[comment._id] || 5;

  useEffect(() => {
    const el = textRef.current;
    if (el) setShowButton(el.scrollHeight > el.clientHeight);
  }, [comment.text]);

  const handleTranslation = async () => {
    const currentLang = localStorage.getItem("lang") || "en";
    const translated = await translateText(comment.text, currentLang);
    setTranslatedText(translated);
  };

  return (
    <div className="relative">
      <div
        className="flex justify-between mb-4 relative"
        style={{ marginLeft: `${depth * 32}px` }}
      >
        <div className="flex gap-3 flex-1">
          {comment.user?.profileImage ? (
            <img
              src={getImageUrl(comment.user.profileImage)}
              alt="profile"
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
              style={{ background: comment.user?.avatarColor }}
            >
              {comment.user?.avatarInitial}
            </div>
          )}

          <div className="flex-1">
            <p className="font-semibold text-sm flex items-center gap-2">
              {comment.user?.firstName} {comment.user?.lastName}
              <span className="text-xs text-gray-400 ml-2">
                {timeAgo(comment.createdAt)}
              </span>
              {isProfileOwner && (
                <span className="text-xs bg-indigo-500 px-2 py-[1px] rounded text-white">
                  Owner
                </span>
              )}
            </p>

            <p
              ref={textRef}
              className={`text-sm text-gray-300 transition-all ${
                !expanded ? "line-clamp-2 overflow-hidden" : ""
              }`}
            >
              {translatedText || comment.text}
            </p>

            {showButton && (
              <button
                onClick={() => setExpanded((prev) => !prev)}
                className="text-xs text-indigo-400 mt-1"
              >
                {expanded ? "View Less" : "View More"}
              </button>
            )}

            <div className="flex gap-4 mt-1 items-center">
              {depth < 3 && (
                <button
                  onClick={() =>
                    setShowReply((prev) => ({
                      ...prev,
                      [comment._id]: !prev[comment._id],
                    }))
                  }
                  className="text-xs text-indigo-400"
                >
                  Reply
                </button>
              )}

              {hasReplies && (
                <button
                  onClick={() =>
                    setShowReplies((prev) => ({
                      ...prev,
                      [comment._id]: !prev[comment._id],
                    }))
                  }
                  className="text-xs text-gray-400"
                >
                  {showReplies[comment._id]
                    ? "Hide replies"
                    : `View replies (${comment.replies.length})`}
                </button>
              )}

              {isOwner && (
                <button
                  onClick={() => deleteComment(comment._id)}
                  className="text-xs text-red-400"
                >
                  Delete
                </button>
              )}

              {/* Translate button */}
              <button
                onClick={handleTranslation}
                className="text-xs text-indigo-400"
              >
                Translate
              </button>
            </div>

            {showReply[comment._id] && (
  <div className="flex gap-2 mt-2">
    {loggedInUserId?.role === "guest" ? (
      <div className="flex-1 p-2 rounded bg-gray-800 text-gray-400 flex items-center justify-center">
        Comment / reply can't be posted in guest mode
      </div>
    ) : (
      <>
                <input
                  value={replyText[comment._id] || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setReplyText((prev) => ({ ...prev, [comment._id]: val }));
                    const currentLang = i18n.language || "en";
                    if (!["te", "hi", "ta", "kn"].includes(currentLang)) return;

                    clearTimeout(translitTimer);
                    translitTimer = setTimeout(() => {
                      transliterate(val, comment._id, (newVal) =>
                        setReplyText((prev) => ({ ...prev, [comment._id]: newVal }))
                      );
                    }, 1000);
                  }}
                  className="bg-gray-800 p-1 rounded text-sm flex-1"
                  placeholder="Write reply..."
                />
                <button
                  onClick={() => sendReply(comment._id)}
                  className="bg-indigo-500 px-3 rounded text-sm"
                >
                  Post
                </button>
               </>
    )}
  </div>
)}
          </div>
        </div>

        <div className="flex items-start">
          <button
            onClick={() => toggleLike(comment._id)}
            className="flex items-center gap-1 text-xs hover:text-red-400"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill={comment.likes?.includes(userId) ? "red" : "none"}
              stroke={comment.likes?.includes(userId) ? "red" : "currentColor"}
              strokeWidth="2"
            >
              <path d="M20.8 4.6c-1.5-1.5-4-1.5-5.5 0L12 7.9l-3.3-3.3c-1.5-1.5-4-1.5-5.5 0s-1.5 4 0 5.5L12 21l8.8-10.9c1.5-1.5 1.5-4 0-5.5z" />
            </svg>
            {comment.likes?.length > 0 && formatLikes(comment.likes.length)}
          </button>
        </div>
      </div>

      {/* Replies */}
      {showReplies[comment._id] &&
        comment.replies.slice(0, visibleCount).map((r) => (
          <CommentItem
            key={r._id}
            comment={r}
            depth={depth + 1}
            profileId={profileId}
            replyText={replyText}
            setReplyText={setReplyText}
            showReply={showReply}
            setShowReply={setShowReply}
            showReplies={showReplies}
            setShowReplies={setShowReplies}
            sendReply={sendReply}
            toggleLike={toggleLike}
            deleteComment={deleteComment}
            visibleReplies={visibleReplies}
            setVisibleReplies={setVisibleReplies}
            loggedInUserId={loggedInUserId}
          />
        ))}

      {showReplies[comment._id] && visibleCount < comment.replies.length && (
        <button
          onClick={() =>
            setVisibleReplies((prev) => ({
              ...prev,
              [comment._id]: visibleCount + 5,
            }))
          }
          className="text-xs text-indigo-400 ml-10"
        >
          View more replies
        </button>
      )}
    </div>
  );
});

export default function ProfileComments({ profileId, loggedInUserId }) {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const [replyText, setReplyText] = useState({});
  const [showReply, setShowReply] = useState({});
  const [showReplies, setShowReplies] = useState({});
  const [visibleComments, setVisibleComments] = useState(5);
  const [visibleReplies, setVisibleReplies] = useState({});

  useEffect(() => {
    if (!profileId) return;
    socket.emit("join-profile", profileId);

    const loadComments = async () => {
      const res = await axios.get(`${BASE_URL}/api/profile-comments/${profileId}`);
      setComments(res.data);
    };

    loadComments();

    socket.off("profile-comment-added");
    socket.off("profile-comment-liked");
    socket.off("profile-comment-deleted");

    socket.on("profile-comment-added", (newComment) => {
      if (newComment.profileId === profileId) setComments((prev) => [...prev, newComment]);
    });
    socket.on("profile-comment-liked", ({ commentId, likes }) => {
      setComments((prev) =>
        prev.map((c) => (String(c._id) === String(commentId) ? { ...c, likes } : c))
      );
    });
    socket.on("profile-comment-deleted", (commentId) => {
      setComments((prev) =>
        prev.filter(
          (c) => String(c._id) !== String(commentId) && String(c.parentComment) !== String(commentId)
        )
      );
    });
  }, [profileId]);

  const commentTree = useMemo(() => {
    const map = {};
    const roots = [];
    comments.forEach((c) => (map[c._id] = { ...c, replies: [] }));
    comments.forEach((c) => {
      if (c.parentComment) map[c.parentComment]?.replies.push(map[c._id]);
      else roots.push(map[c._id]);
    });
    return roots;
  }, [comments]);

  const sendComment = async () => {
    if (!text.trim()) return;
    await axios.post(
      `${BASE_URL}/api/profile-comments/add`,
      { profileId, text },
      { withCredentials: true }
    );
    setText("");
  };

  const sendReply = async (parentId) => {
    if (!replyText[parentId]?.trim()) return;
    await axios.post(
      `${BASE_URL}/api/profile-comments/add`,
      { profileId, text: replyText[parentId], parentComment: parentId },
      { withCredentials: true }
    );
    setReplyText((prev) => ({ ...prev, [parentId]: "" }));
    setShowReply((prev) => ({ ...prev, [parentId]: false }));
  };

  const toggleLike = async (commentId) => {
    await axios.post(`${BASE_URL}/api/profile-comments/like/${commentId}`, {}, { withCredentials: true });
  };

  const deleteComment = async (commentId) => {
    await axios.delete(`${BASE_URL}/api/profile-comments/delete/${commentId}`, { withCredentials: true });
  };

  const totalCommentCount = useMemo(() => countComments(commentTree), [commentTree]);

  const currentLang = i18n.language || "en";

  // Transliterate input text as user types
  const handleCommentChange = (val) => {
    setText(val);
    if (!["te", "hi", "ta", "kn"].includes(currentLang)) return;

    clearTimeout(translitTimer);
    translitTimer = setTimeout(() => {
      transliterate(val, "comment", setText);
    }, 1000);
  };

  return (
    <div className="mt-10 text-white">
      <h2 className="text-xl font-bold mb-4">Comments ({totalCommentCount})</h2>

      <div className="flex gap-2 mb-5">
  {loggedInUserId?.role === "guest" ? (
    <div className="flex-1 p-2 rounded bg-gray-800 text-gray-400 flex items-center justify-center">
      Comment / reply can't be posted in guest mode
    </div>
  ) : (
    <>
      <input
        value={text}
        onChange={(e) => handleCommentChange(e.target.value)}
        className="flex-1 bg-gray-800 p-2 rounded"
        placeholder="Write a comment..."
      />
      <button onClick={sendComment} className="bg-indigo-500 px-4 rounded">
        Post
      </button>
    </>
  )}
</div>

      {commentTree.slice(0, visibleComments).map((c) => (
        <div key={c._id}>
          <CommentItem
            comment={c}
            depth={0}
            profileId={profileId}
            replyText={replyText}
            setReplyText={setReplyText}
            showReply={showReply}
            setShowReply={setShowReply}
            showReplies={showReplies}
            setShowReplies={setShowReplies}
            sendReply={sendReply}
            toggleLike={toggleLike}
            deleteComment={deleteComment}
            visibleReplies={visibleReplies}
            setVisibleReplies={setVisibleReplies}
            loggedInUserId={loggedInUserId}
          />
          <div style={{ height: "1px", background: "#444", margin: "20px 0" }} />
        </div>
      ))}

      {visibleComments < commentTree.length && (
        <div className="flex justify-center mt-4">
          <button
            onClick={() => setVisibleComments((prev) => prev + 5)}
            className="text-indigo-400 text-sm"
          >
            View more comments
          </button>
        </div>
      )}
    </div>
  );
}
