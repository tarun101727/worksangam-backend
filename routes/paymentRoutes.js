// routes/paymentRoutes.js
import express from "express";
import { createOrder, cashfreeWebhook } from "../controllers/paymentController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/create-order", authMiddleware, createOrder);
router.post("/webhook", cashfreeWebhook);

export default router;
