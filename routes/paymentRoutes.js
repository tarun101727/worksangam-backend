// routes/paymentRoutes.js
import express from "express";
import { createOrder, cashfreeWebhook, getUserPayments, verifyPayment } from "../controllers/paymentController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/create-order", authMiddleware, createOrder);
router.post(
  "/verify",
  authMiddleware,
  verifyPayment
);
router.post("/webhook", cashfreeWebhook);
router.get("/my-payments", authMiddleware, getUserPayments);

export default router;
