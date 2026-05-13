// controllers/paymentController.js
import axios from "axios";
import Payment from "../models/Payment.js";
import { CREDIT_PLANS } from "../utils/creditPlans.js";
import User from "../models/User.js";



export const createOrder = async (req, res) => {
  try {

    const userId = req.user.id;
    const { amount } = req.body;

    const credits = CREDIT_PLANS[amount];

    if (!credits) {
      return res.status(400).json({
        msg: "Invalid plan",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        msg: "User not found",
      });
    }

    const orderId = `order_${Date.now()}`;

    await Payment.create({
      userId,
      orderId,
      amount,
      credits,
    });

    // ✅ CASHFREE PAYMENT LINK API
    const response = await axios.post(
      "https://api.cashfree.com/pg/links",
      {
        customer_details: {
          customer_name:
            user.firstName || "User",

          customer_email: user.email,

          customer_phone:
            "9" +
            Math.floor(
              100000000 +
              Math.random() * 900000000
            ),
        },

        link_notify: {
          send_sms: false,
          send_email: false,
        },

        link_id: orderId,

        link_amount: amount,

        link_currency: "INR",

        link_purpose:
          "WorkSangam Credits",

        link_meta: {
          return_url:
            `https://worksangam.in/payment-success?order_id=${orderId}`,
        },
      },
      {
        headers: {
          "x-client-id":
            process.env.CASHFREE_APP_ID,

          "x-client-secret":
            process.env.CASHFREE_SECRET_KEY,

          "x-api-version":
            "2022-09-01",

          "Content-Type":
            "application/json",
        },
      }
    );

    // ✅ RETURN PAYMENT LINK
    res.json({
      payment_link:
        response.data.link_url,
    });

  } catch (err) {

    console.error(
      "🔥 CASHFREE ERROR:",
      err.response?.data || err.message
    );

    res.status(500).json({
      msg: "Order creation failed",
    });
  }
};

export const cashfreeWebhook = async (req, res) => {
  try {
    console.log("🔥 Cashfree webhook received:", req.body);

    const data = req.body;

    // ✅ FIXED: correct Cashfree structure
    const orderId = data.data?.order?.order_id;
    const paymentStatus = data.data?.payment?.payment_status;

    console.log("OrderId:", orderId);
    console.log("Payment Status:", paymentStatus);

    if (!orderId) return res.sendStatus(400);

    const payment = await Payment.findOne({ orderId });
    if (!payment) return res.sendStatus(404);

    // prevent duplicate credits
    if (payment.status === "SUCCESS") return res.sendStatus(200);

    if (paymentStatus === "SUCCESS") {
      payment.status = "SUCCESS";
      await payment.save();

      // ✅ ADD CREDITS
      await User.findByIdAndUpdate(payment.userId, {
        $inc: { credits: payment.credits },
      });

      console.log(`✅ Credits added: +${payment.credits}`);
    } else {
      payment.status = "FAILED";
      await payment.save();
      console.log("❌ Payment failed");
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("🔥 Webhook error:", err);
    res.sendStatus(500);
  }
};

// ✅ GET USER PAYMENT HISTORY
export const getUserPayments = async (req, res) => {
  try {
    const userId = req.user.id;

    const payments = await Payment.find({ userId })
      .sort({ createdAt: -1 }); // latest first

    res.json({ payments });
  } catch (err) {
    console.error("Get payments error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};
