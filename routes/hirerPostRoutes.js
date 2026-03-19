
import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import {
  createPost,
  acceptJob,
  getUrgentMatches,
  unlockUrgentProfiles,
  updateMyPost,
  deleteMyPost,
  updatePostLocation,
  getLocationFromCoordinates,
  urgentSearchEmployees,
  searchLocationSuggestions,
} from "../controllers/hirerPostController.js";
import { upload } from "../middleware/uploadMiddleware.js";

const router = express.Router();


router.post(
  "/create",
  authMiddleware,
  upload.array("media", 6), // max 6 files
  createPost
);
router.get("/urgent-matches/:postId", authMiddleware, getUrgentMatches);
router.post("/unlock/:postId", authMiddleware, unlockUrgentProfiles);
router.post("/accept/:postId", authMiddleware, acceptJob);
router.put("/update/:postId", authMiddleware, updateMyPost);
router.delete("/delete/:postId", authMiddleware, deleteMyPost);
router.post(
  "/update-location/:postId",
  authMiddleware,
  updatePostLocation
);

router.get("/geocode" , authMiddleware,  getLocationFromCoordinates);

router.get(
  "/urgent-search",
  authMiddleware,
  urgentSearchEmployees
);

router.get(
  "/search-location",
  authMiddleware,
  searchLocationSuggestions
);
export default router;
