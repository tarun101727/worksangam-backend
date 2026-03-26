import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import http from 'http';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import jobRoutes from "./routes/jobRoutes.js";
import authRoutes from './routes/authRoutes.js';
import hirerPostRoutes from './routes/hirerPostRoutes.js';
import { initSocket } from './socket.js';
import userRoutes from "./routes/userRoutes.js";
import mapRoutes from "./routes/mapRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import profileCommentRoutes from "./routes/profileCommentRoutes.js";
import professionRoutes from "./routes/professionRoutes.js";
import onlineProfessionRoutes from "./routes/onlineProfessionRoutes.js";
import offlineProfessionRoutes from "./routes/offlineProfessionRoutes.js";
import onlineWorkerRoutes from "./routes/onlineWorkerRoutes.js"
import languageRoutes from "./routes/languageRoutes.js";
import pushRoutes from './routes/pushRoutes.js';


dotenv.config();

const app = express();
const server = http.createServer(app); // ✅ CORRECT

/* -------------------- MongoDB -------------------- */
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('📦 MongoDB connected successfully'))
  .catch(err => console.error('❌ MongoDB connection failed:', err.message));

/* ✅ INIT SOCKET (your added code) */
initSocket(server);

const allowedOrigins = [
  "https://www.worksangam.in",
  "https://worksangam.in",
  "http://localhost:5173", // for local testing
];

app.use(cors({
  origin: function (origin, callback) {
    console.log("🌐 Origin:", origin);

    // allow no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("CORS not allowed for: " + origin));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ extended: true, limit: '500mb' }));
app.use(cookieParser());


app.options("*", cors());
/* -------------------- Routes -------------------- */
app.get('/favicon.ico', (_, res) => res.sendStatus(204));
app.use('/api/auth', authRoutes);
app.use('/api/hirer-post', hirerPostRoutes);
app.use('/uploads', express.static('uploads'));
app.use("/api/jobs", jobRoutes);
app.use("/api/users", userRoutes);
app.use("/api/maps", mapRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/profile-comments", profileCommentRoutes);
app.use("/api/professions", professionRoutes);
app.use("/api/online-professions", onlineProfessionRoutes);
app.use("/api/offline-professions", offlineProfessionRoutes);
app.use("/api/online-workers" , onlineWorkerRoutes)
app.use("/api/languages", languageRoutes);
app.use('/api/push', pushRoutes); 

/* -------------------- Start Server -------------------- */
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
