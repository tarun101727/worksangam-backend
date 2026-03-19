import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { getEmployeesByType, getUserById } from "../controllers/userController.js";

const router = express.Router();

// /api/users/online?professionType=virtual
// /api/users/offline?professionType=onsite
router.get("/:status", authMiddleware, getEmployeesByType);

router.get("/profile/:userId", authMiddleware, getUserById);

export default router;
