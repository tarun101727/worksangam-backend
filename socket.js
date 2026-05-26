import { Server } from "socket.io";

import Message from "./models/Message.js";

import Chat from "./models/Chat.js";

import ChatNotification from "./models/ChatNotification.js";

import { encryptMessage } from "./utils/encryption.js";

let io;

const activeUrgentRequests = new Map();

export const initSocket = (server) => {

  io = new Server(server, {

    cors: {

      origin: true,

      credentials: true,
    },

    transports: ["websocket"],
  });

  io.on("connection", (socket) => {

    const userId =
        socket.handshake.auth.userId;

    /*
    USER ROOM
    */

    if (userId) {

      socket.join(userId);

      console.log(
        "👤 Joined personal room:",
        userId,
      );
    }

    console.log(
      "🔌 Socket connected:",
      socket.id,
    );

    /*
    JOIN CHAT
    */

    socket.on(
      "join-chat",
      (chatId) => {

        socket.join(chatId);

        console.log(
          `💬 User joined chat ${chatId}`,
        );
      },
    );

    /*
    TYPING
    */

    socket.on(
      "typing",
      ({ chatId, userId }) => {

        socket.to(chatId).emit(
          "user-typing",
          { userId },
        );
      },
    );

    /*
    STOP TYPING
    */

    socket.on(
      "stop-typing",
      ({ chatId, userId }) => {

        socket.to(chatId).emit(
          "user-stop-typing",
          { userId },
        );
      },
    );

    /*
    SEND MESSAGE
    */

    socket.on(
      "send-message",

      async ({
        chatId,
        message,
        sender,
        receiverId,
        replyTo,
        replyText,
      }) => {

        try {

          /*
          ENCRYPT
          */

          const encrypted =
              encryptMessage(message);

          /*
          SAVE MESSAGE
          */

          const msg =
              await Message.create({

            chatId,

            sender: sender._id,

            encryptedMessage:
                encrypted,

            replyTo:
                replyTo || null,

            replyText:
                replyText || "",
          });

          /*
          PREPARE PAYLOAD
          */

          const payload = {

            _id: msg._id,

            chatId,

            message,

            sender,

            replyTo:
                replyTo || null,

            replyText:
                replyText || "",

            createdAt:
                msg.createdAt,
          };

          /*
          SEND TO CHAT ROOM
          */

          io.to(chatId).emit(
            "receive-message",
            payload,
          );

          /*
          CREATE NOTIFICATION
          */

          await ChatNotification.create({

            chat: chatId,

            sender: sender._id,

            receiver: receiverId,

            message,
          });

          /*
          SEND NOTIFICATION
          */

          io.to(receiverId).emit(
            "new-chat-notification",
            {
              chat: chatId,
              message,
              sender,
              createdAt:
                  new Date(),
            },
          );

        } catch (err) {

          console.log(
            "❌ send-message error:",
            err,
          );
        }
      },
    );

    /*
    DELETE MESSAGE
    */

    socket.on(
      "delete-message",

      async ({
        messageId,
        chatId,
      }) => {

        try {

          await Message.findByIdAndDelete(
            messageId,
          );

          io.to(chatId).emit(
            "message-deleted",
            messageId,
          );

        } catch (err) {

          console.log(
            "❌ delete-message error:",
            err,
          );
        }
      },
    );

    /*
    DISCONNECT
    */

    socket.on(
      "disconnect",
      () => {

        console.log(
          "❌ Socket disconnected:",
          socket.id,
        );
      },
    );
  });

  return io;
};

export { io };
