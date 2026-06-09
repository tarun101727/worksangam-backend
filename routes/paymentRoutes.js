import express from "express";

import authMiddleware
from "../middleware/authMiddleware.js";

import {
createOrder
}
from "../controllers/paymentController.js";

import {
paymentWebhook
}
from "../controllers/webhookController.js";

const router = express.Router();

router.post(
"/create-order",
authMiddleware,
createOrder
);

router.post(
"/webhook",
paymentWebhook
);

export default router;
