import express from "express";

import authMiddleware
from "../middleware/authMiddleware.js";

import {
createSubscription,
verifySubscription,
cashfreeSubscriptionWebhook,
getSubscriptionStatus,
cancelSubscription
}
from "../controllers/subscriptionController.js";

const router=express.Router();

router.post(
"/create",
authMiddleware,
createSubscription
);

router.post(
"/verify",
authMiddleware,
verifySubscription
);

router.post(
"/webhook",
cashfreeSubscriptionWebhook
);

router.get(
"/status",
authMiddleware,
getSubscriptionStatus
);

router.post(
"/cancel",
authMiddleware,
cancelSubscription
);


export default router;
