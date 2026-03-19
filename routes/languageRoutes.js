// backend/routes/languageRoutes.js
import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { getLanguages } from "../controllers/languageController.js";

const router = express.Router();

// GET /api/languages?search=english
router.get("/", authMiddleware, getLanguages);

export default router;