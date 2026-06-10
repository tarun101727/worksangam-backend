import express from "express";

import authMiddleware
from "../middleware/authMiddleware.js";

import {
getPlans,
createSubscription,
subscriptionWebhook,
mySubscription,
verifySubscriptionPayment
}
from "../controllers/subscriptionController.js";

const router=
express.Router();

router.get(
"/plans",
getPlans
);

router.post(
"/create",
authMiddleware,
createSubscription
);

router.post(
"/webhook",
subscriptionWebhook
);

router.get(
"/my-subscription",
authMiddleware,
mySubscription
);

router.get(
"/verify/:orderId",
verifySubscriptionPayment
);

export default router;
