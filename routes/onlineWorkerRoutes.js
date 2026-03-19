import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { getHirerOnlinePost, getTopWorkers } from "../controllers/onlineWorkerController.js";

const router = express.Router();

// Get latest online post of logged-in hirer
router.get("/my-post", authMiddleware, getHirerOnlinePost);

// Get top workers by profession, supports skip & limit for pagination
router.get("/top-workers", authMiddleware, getTopWorkers);

export default router;