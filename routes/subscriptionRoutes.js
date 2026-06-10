import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";

import {
  createSubscriptionOrder,
  verifySubscription,
} from "../controllers/subscriptionController.js";

const router =
  express.Router();

router.post(
  "/create-order",
  authMiddleware,
  createSubscriptionOrder
);

router.post(
  "/verify",
  authMiddleware,
  verifySubscription
);

export default router;
