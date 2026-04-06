// backend/routes/languageRoutes.js
import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { getLanguages } from "../controllers/languageController.js";
import { addLanguageTranslations, getTranslations } from "../controllers/translateController.js";
import { requireAdmin } from "../middleware/adminRoleMiddleware.js";

const router = express.Router();

// GET /api/languages?search=english
router.get("/", authMiddleware, getLanguages);

// ✅ Add / update translations (admin only)
router.post("/add", authMiddleware, requireAdmin, addLanguageTranslations);

// ✅ Get translations by code
router.get("/:lang", getTranslations);

export default router;
