import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";

import {
    getBalance,
    spendCredits,
    getHistory,
} from "../controllers/creditController.js";

const router = express.Router();

router.get(
    "/balance",
    authMiddleware,
    getBalance
);

router.post(
    "/spend",
    authMiddleware,
    spendCredits
);

router.get(
    "/history",
    authMiddleware,
    getHistory
);

export default router;
