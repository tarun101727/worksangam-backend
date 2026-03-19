import express from "express";
import { getOnlineProfessions } from "../controllers/onlineProfessionController.js";

const router = express.Router();

router.get("/", getOnlineProfessions);

export default router;