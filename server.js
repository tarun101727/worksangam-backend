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
  "https://worksangam.in"
];

app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      "https://www.worksangam.in",
      "https://worksangam.in"
    ];

    console.log("🌐 Origin:", origin);

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("❌ Not allowed by CORS"));
    }
  },
  credentials: true
}));

/* ✅ ADD THIS LINE (VERY IMPORTANT) */
app.options('*', cors());

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "https://www.worksangam.in");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});

app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ extended: true, limit: '500mb' }));
app.use(cookieParser());

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

/* -------------------- Start Server -------------------- */
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
