import { Server } from "socket.io";

let io;
const onlineUsers = new Map(); // userId → socketId

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: true,
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    const userId = socket.handshake.auth.userId;

    if (userId) {
      onlineUsers.set(userId, socket.id); // ✅ FIXED
      socket.join(userId);                // personal room
    }

    console.log("🔌 Socket connected:", userId);

    /* -------------------- VIDEO ROOM -------------------- */
    socket.on("join-room", ({ roomId, role }) => {
      socket.join(roomId);

      socket.to(roomId).emit("user-joined", {
        socketId: socket.id,
        role,
      });
    });

    /* -------------------- PROFILE ROOM -------------------- */
    socket.on("join-profile", (profileId) => {
      socket.join(`profile-${profileId}`);
      console.log(`👤 Joined profile room profile-${profileId}`);
    });

    /* -------------------- CHAT -------------------- */
    socket.on("join-chat", (chatId) => {
      socket.join(chatId);
      console.log(`💬 User ${userId} joined chat ${chatId}`);
    });

    socket.on("typing", ({ chatId, userId }) => {
      socket.to(chatId).emit("user-typing", { userId });
    });

    socket.on("stop-typing", ({ chatId, userId }) => {
      socket.to(chatId).emit("user-stop-typing", { userId });
    });

    socket.on("send-message", ({ chatId, message, sender }) => {
      socket.to(chatId).emit("receive-message", {
        message,
        sender,
      });
    });

    /* -------------------- USER ROOM -------------------- */
    socket.on("join-user", (userId) => {
      socket.join(userId);
      console.log(`👤 Joined user room ${userId}`);
    });

    /* -------------------- DISCONNECT -------------------- */
    socket.on("disconnect", () => {
      console.log("❌ Socket disconnected:", userId);

      if (userId) {
        onlineUsers.delete(userId); // ✅ CLEANUP
      }
    });
  });

  return io;
};

/* 🔥 EXPORT */
export { io, onlineUsers };
