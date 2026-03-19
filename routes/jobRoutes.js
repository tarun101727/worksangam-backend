import express from "express";
const router = express.Router();
import authMiddleware from "../middleware/authMiddleware.js";
import {  acceptApplication, acceptJob, applyForJob, createOfflinePost, createOnlinePost, getAllJobs, getJobById, getMyHirerPosts, getMyNotifications, getNearbyJobs, getNotificationById,  getOfflineJobsByDistance,  markNotificationsAsRead, rejectApplication } from "../controllers/jobController.js";

router.get("/offline-nearby", authMiddleware, getOfflineJobsByDistance);

// routes/jobRoutes.js
router.get("/all", authMiddleware, getAllJobs);

router.get("/nearby", authMiddleware, getNearbyJobs);

router.get(
  "/hirer/my-posts",
  authMiddleware,
  getMyHirerPosts
);

router.get(
  "/notifications",
  authMiddleware,
  getMyNotifications
);

router.post("/accept/:jobId", authMiddleware, acceptJob);

router.post("/apply/:jobId", authMiddleware, applyForJob);

router.post(
  "/application/accept/:notificationId",
  authMiddleware,
  acceptApplication
);

router.post(
  "/application/reject/:notificationId",
  authMiddleware,
  rejectApplication
);
router.get(
  "/notifications/:notificationId",
  authMiddleware,
  getNotificationById
);
router.put("/notifications/read", authMiddleware, markNotificationsAsRead);

router.post(
  "/create-online-post",
  authMiddleware,
  createOnlinePost
);
router.post("/create-offline-post", authMiddleware, createOfflinePost);
router.get("/:jobId", authMiddleware, getJobById);


export default router;