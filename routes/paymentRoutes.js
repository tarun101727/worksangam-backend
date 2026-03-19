import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { addCredits } from "../controllers/paymentController.js";

const router = express.Router();

router.post("/add-credits", authMiddleware, addCredits);

export default router;