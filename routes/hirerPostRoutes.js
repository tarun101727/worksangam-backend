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
  (req, res, next) => {
    upload.array("media", 6)(req, res, function (err) {
      if (err) {
        console.error("MULTER ERROR:", err);

        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({ msg: "File too large (max 30MB)" });
        }

        if (err.code === "LIMIT_UNEXPECTED_FILE") {
          return res.status(400).json({ msg: "Too many files or wrong field name (use 'media')" });
        }

        return res.status(400).json({ msg: err.message });
      }

      next();
    });
  },
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

router.get("/geocode" ,  getLocationFromCoordinates);

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
