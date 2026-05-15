import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import {
  getEmployeesByType,
  getUserById
} from "../controllers/userController.js";

const router = express.Router();

/* ✅ PUT PROFILE ROUTE FIRST */
router.get(
  "/profile/:userId",
  authMiddleware,
  getUserById
);

/* ✅ PUT DYNAMIC ROUTE AFTER */
router.get(
  "/:status",
  authMiddleware,
  getEmployeesByType
);

export default router;
