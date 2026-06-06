// routes/paymentRoutes.js
import express from "express";
import { createOrder, cashfreeWebhook, getUserPayments, getSubscription, getPaymentStatus, verifySubscriptionPayment } from "../controllers/paymentController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/create-order", authMiddleware, createOrder);
router.post("/webhook", cashfreeWebhook);
router.get("/my-payments", authMiddleware, getUserPayments);
router.get(
  "/subscription",
  authMiddleware,
  getSubscription
);

router.get(
  "/payment-status/:orderId",
  authMiddleware,
  getPaymentStatus
);

router.post(
  "/verify-subscription",
  authMiddleware,
  verifySubscriptionPayment
);

export default router;
