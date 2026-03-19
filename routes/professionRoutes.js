import express from "express";
import { createProfession, getOfflineProfessions, getOnlineProfessions, getProfessions } from "../controllers/professionController.js";

const router = express.Router();

router.get("/", getProfessions);
router.get("/online", getOnlineProfessions);
router.get("/offline", getOfflineProfessions);

router.post("/create", createProfession);


export default router;