import express from "express";
import { getOfflineProfessions } from "../controllers/offlineProfessionController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", getOfflineProfessions);

export default router;