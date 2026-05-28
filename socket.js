import { Server } from "socket.io";

let io;


const activeUrgentRequests = new Map();


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
      socket.join(userId); // personal notification room
    }

    console.log("🔌 Socket connected:", userId);

    /* -------------------- VIDEO ROOM (NEW) -------------------- */

    socket.on("join-room", ({ roomId, role }) => {

socket.join(roomId);

socket.to(roomId).emit("user-joined",{
socketId:socket.id,
role
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

    /* -------------------- USER ROOM -------------------- */

    socket.on("join-user", (userId) => {
      socket.join(userId);
      console.log(`👤 Joined user room ${userId}`);
    });


    /* -------------------- URGENT HIRER -------------------- */

socket.on("join-profession", (profession) => {

  const room = `profession-${profession.toLowerCase()}`;

  socket.join(room);

  console.log(`🟢 Joined profession room ${room}`);
});

/*
CREATE URGENT HIRE REQUEST
*/

socket.on("create-urgent-hire", (data) => {

  const room =
    `profession-${data.profession.toLowerCase()}`;

  const payload = {
    requestId: data.requestId,
    hirerId: data.hirerId,
    hirerName: data.hirerName,
    profileImage: data.profileImage,
    profession: data.profession,
    createdAt: Date.now(),
  };

  /*
  SEND TO ALL USERS OF SAME PROFESSION
  */

  io.to(room).emit(
    "urgent-hire-request",
    payload,
  );

  console.log(
    `🚨 Urgent hire sent to ${room}`,
  );
});

/*
ACCEPT URGENT HIRE
*/

socket.on("accept-urgent-hire", (data) => {

  /*
  ALREADY ACCEPTED
  */

  if (
    activeUrgentRequests.has(
      data.requestId,
    )
  ) {
    return;
  }

  activeUrgentRequests.set(
    data.requestId,
    data.employeeId,
  );

  io.to(data.hirerId).emit(
    "urgent-hire-accepted",
    {
      requestId: data.requestId,
      employeeId: data.employeeId,
    },
  );

  /*
  EXPIRE FOR OTHERS
  */

  io.emit(
    "urgent-hire-expired",
    {
      requestId: data.requestId,
    },
  );
});

/*
DENY URGENT HIRE
*/

socket.on("deny-urgent-hire", (data) => {

  socket.emit(
    "urgent-hire-denied",
    data,
  );
});

/*
EXPIRE URGENT HIRE
*/

socket.on("expire-urgent-hire", (data) => {

  io.emit(
    "urgent-hire-expired",
    {
      requestId: data.requestId,
    },
  );
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
  if (!io) return;
  io.emit("job-added-to-home", job); // broadcast to all connected users
};

export { io };
