import axios from "axios";

import User from "../models/User.js";
import SubscriptionPayment from "../models/SubscriptionPayment.js";

import { SUBSCRIPTION_PLANS } from "../utils/subscriptionPlans.js";

export const getSubscriptionPlans = async (req, res) => {
  try {
    const plans = Object.entries(SUBSCRIPTION_PLANS).map(
      ([key, value]) => ({
        id: key,
        name: value.name,
        amount: value.amount,
        duration: value.duration,
      })
    );

    res.json({
      plans,
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      msg: "Server error",
    });
  }
};


export const createSubscriptionOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { planId } = req.body;

    const plan = SUBSCRIPTION_PLANS[planId];

    if (!plan) {
      return res.status(400).json({
        msg: "Invalid subscription plan",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        msg: "User not found",
      });
    }

    const orderId = `sub_${Date.now()}`;

    await SubscriptionPayment.create({
      userId,
      orderId,
      amount: plan.amount,
      planName: plan.name,
      durationDays: plan.duration,
      status: "PENDING",
    });

    const response = await axios.post(
      "https://api.cashfree.com/pg/orders",
      {
        order_id: orderId,

        order_amount: plan.amount,

        order_currency: "INR",

        customer_details: {
          customer_id: user._id.toString(),
          customer_email: user.email,
          customer_phone:
            "9" +
            Math.floor(
              100000000 + Math.random() * 900000000
            ),
        },

        order_meta: {
          return_url: `https://worksangam.in/subscription-success?order_id=${orderId}`,
        },
      },
      {
        headers: {
          "x-client-id": process.env.CASHFREE_APP_ID,
          "x-client-secret": process.env.CASHFREE_SECRET_KEY,
          "x-api-version": "2022-09-01",
        },
      }
    );

    res.status(200).json({
      payment_session_id: response.data.payment_session_id,
      order_id: response.data.order_id,
    });

  } catch (err) {
    console.error(
      "Subscription Order Error:",
      err.response?.data || err.message
    );

    res.status(500).json({
      msg: "Subscription creation failed",
    });
  }
};


export const cashfreeSubscriptionWebhook = async (req, res) => {
  try {
    const data = req.body;

    const orderId = data.data?.order?.order_id;
    const paymentStatus = data.data?.payment?.payment_status;

    if (!orderId) {
      return res.sendStatus(400);
    }

    const payment = await SubscriptionPayment.findOne({
      orderId,
    });

    if (!payment) {
      return res.sendStatus(404);
    }

    // Prevent duplicate processing
    if (payment.status === "SUCCESS") {
      return res.sendStatus(200);
    }

    if (paymentStatus === "SUCCESS") {

      payment.status = "SUCCESS";
      await payment.save();

      const user = await User.findById(payment.userId);

      if (!user) {
        return res.sendStatus(404);
      }

      const now = new Date();

      // Extend existing subscription if still active
      let startDate = now;

      if (
        user.premiumExpiresAt &&
        user.premiumExpiresAt > now
      ) {
        startDate = new Date(user.premiumExpiresAt);
      }

      const expiresAt = new Date(startDate);

      expiresAt.setDate(
        expiresAt.getDate() + payment.durationDays
      );

      user.isPremium = true;
      user.subscriptionPlan = payment.planName;

      if (!user.premiumPurchasedAt) {
        user.premiumPurchasedAt = now;
      }

      user.premiumExpiresAt = expiresAt;

      await user.save();

      console.log(
        `✅ Premium activated for user ${user._id}`
      );

    } else {

      payment.status = "FAILED";
      await payment.save();

      console.log(
        `❌ Subscription payment failed: ${orderId}`
      );
    }

    res.sendStatus(200);

  } catch (err) {

    console.error(
      "Subscription Webhook Error:",
      err
    );

    res.sendStatus(500);
  }
};


export const getSubscriptionStatus = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId).select(
      `
      isPremium
      subscriptionPlan
      premiumPurchasedAt
      premiumExpiresAt
      `
    );

    if (!user) {
      return res.status(404).json({
        msg: "User not found",
      });
    }

    // Auto-expire subscription if needed
    if (
      user.isPremium &&
      user.premiumExpiresAt &&
      new Date() > user.premiumExpiresAt
    ) {
      user.isPremium = false;
      user.subscriptionPlan = null;
      user.premiumPurchasedAt = null;
      user.premiumExpiresAt = null;

      await user.save();
    }

    return res.status(200).json({
      isPremium: user.isPremium,
      subscriptionPlan: user.subscriptionPlan,
      premiumPurchasedAt: user.premiumPurchasedAt,
      premiumExpiresAt: user.premiumExpiresAt,
      daysRemaining:
        user.isPremium && user.premiumExpiresAt
            ? Math.max(
                0,
                Math.ceil(
                  (new Date(user.premiumExpiresAt) - new Date()) /
                      (1000 * 60 * 60 * 24)
                )
              )
            : 0,
    });

  } catch (err) {
    console.error("Get Subscription Status Error:", err);

    return res.status(500).json({
      msg: "Server error",
    });
  }
};
