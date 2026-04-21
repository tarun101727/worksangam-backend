import { Server } from "socket.io";

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: true,
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    const userId = socket.handshake.auth?.userId;

    console.log("🔌 CONNECTED USER:", userId);

    if (userId) {
      socket.join(userId); // personal room
      console.log("✅ Joined room:", userId);
    } else {
      console.log("❌ No userId received in socket");
    }

    /* -------------------- VIDEO ROOM -------------------- */
    socket.on("join-room", ({ roomId, role }) => {
      socket.join(roomId);

      console.log(`🎥 ${userId} joined video room ${roomId}`);

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

    /* -------------------- TYPING -------------------- */
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
    socket.on("join-user", (joinUserId) => {
      socket.join(joinUserId);
      console.log(`👤 Joined user room ${joinUserId}`);
    });

    /* -------------------- DISCONNECT -------------------- */
    socket.on("disconnect", () => {
      console.log("❌ Socket disconnected:", userId);
    });
  });

  return io;
};

/* 🔥 EXPORT EMITTER */
export const emitJobToEmployees = (job) => {
  if (!io) {
    console.log("❌ Socket.io not initialized");
    return;
  }

  console.log("📢 Emitting job:", job);

  // ❗ TEMP: broadcast to all (for testing)
  io.emit("job-added-to-home", job);
};

export { io };
