import mongoose from "mongoose";

const creditTransactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  type: {
    type: String,
    enum: ["CREDIT", "DEBIT", "WELCOME_BONUS"],
    required: true,
  },

  credits: {
    type: Number,
    required: true,
  },

  description: {
    type: String,
    default: "",
  },

  paymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Payment",
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model(
  "CreditTransaction",
  creditTransactionSchema
);

9)creditController.js:-
import User from "../models/User.js";
import CreditTransaction from "../models/CreditTransaction.js";

export const getBalance = async (req, res) => {

    try {

        const user = await User.findById(req.user.id)
            .select("credits");

        res.json({
            credits: user.credits,
        });

    } catch (err) {

        res.status(500).json({
            msg: "Server error",
        });

    }

};

export const spendCredits = async (req, res) => {

    try {

        const { credits, description } = req.body;

        const user = await User.findById(req.user.id);

        if (!user)
            return res.status(404).json({
                msg: "User not found",
            });

        if (credits <= 0)
            return res.status(400).json({
                msg: "Invalid credits",
            });

        if (user.credits < credits)
            return res.status(400).json({
                msg: "Not enough credits",
            });

        user.credits -= credits;

        await user.save();

        await CreditTransaction.create({

            userId: user._id,

            type: "DEBIT",

            credits,

            description:
                description || "Credit Used",

        });

        res.json({

            msg: "Credits deducted",

            credits: user.credits,

        });

    } catch (err) {

        res.status(500).json({
            msg: "Server error",
        });

    }

};

export const getHistory = async (req, res) => {

    try {

        const history =
            await CreditTransaction.find({
                userId: req.user.id,
            })
                .sort({
                    createdAt: -1,
                });

        res.json({
            history,
        });

    } catch (err) {

        res.status(500).json({
            msg: "Server error",
        });

    }

};

10)creditRoutes.js:-
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
