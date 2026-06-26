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
