import express from "express";

import authMiddleware
from "../middleware/authMiddleware.js";

import {
getPlans,
getSubscriptionStatus
}
from "../controllers/subscriptionController.js";

const router = express.Router();

router.get(
"/plans",
getPlans
);

router.get(
"/status",
authMiddleware,
getSubscriptionStatus
);

export default router;
