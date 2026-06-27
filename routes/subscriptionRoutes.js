import express from "express";

import authMiddleware from "../middleware/authMiddleware.js";

import {
  getSubscriptionPlans,
  createSubscriptionOrder,
  cashfreeSubscriptionWebhook,
  getSubscriptionStatus,
} from "../controllers/subscriptionController.js";

const router = express.Router();

/*
---------------------------------------
GET ALL SUBSCRIPTION PLANS
---------------------------------------
*/
router.get(
  "/plans",
  getSubscriptionPlans
);

/*
---------------------------------------
CREATE SUBSCRIPTION ORDER
---------------------------------------
*/
router.post(
  "/create-order",
  authMiddleware,
  createSubscriptionOrder
);

/*
---------------------------------------
CASHFREE WEBHOOK
---------------------------------------
*/
router.post(
  "/webhook",
  cashfreeSubscriptionWebhook
);

/*
---------------------------------------
CURRENT USER SUBSCRIPTION STATUS
---------------------------------------
*/
router.get(
  "/status",
  authMiddleware,
  getSubscriptionStatus
);

export default router;
