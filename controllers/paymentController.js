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
      return res.status(400).json({ msg: "Invalid plan" });
    }

    // ✅ GET USER FROM DB
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    const orderId = `order_${Date.now()}`;

    await Payment.create({
      userId,
      orderId,
      amount,
      credits,
    });

    const response = await axios.post(
      "https://sandbox.cashfree.com/pg/orders",
      {
        order_id: orderId,
        order_amount: amount,
        order_currency: "INR",
        customer_details: {
          customer_id: userId,
          customer_email: user.email, // ✅ FIXED
            customer_phone: "9" + Math.floor(100000000 + Math.random() * 900000000),

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

    res.json({
      payment_session_id: response.data.payment_session_id,
    });

  } catch (err) {
    console.error("🔥 CASHFREE ERROR:", err.response?.data || err.message);
    res.status(500).json({ msg: "Order creation failed" });
  }
};



export const cashfreeWebhook = async (req, res) => {
  try {
    const data = req.body;

    const orderId = data.order.order_id;
    const paymentStatus = data.order.order_status;

    const payment = await Payment.findOne({ orderId });

    if (!payment) return res.sendStatus(404);

    // Prevent duplicate credit
    if (payment.status === "SUCCESS") {
      return res.sendStatus(200);
    }

    if (paymentStatus === "PAID") {
      payment.status = "SUCCESS";
      await payment.save();

      // ADD CREDITS
      await User.findByIdAndUpdate(payment.userId, {
        $inc: { credits: payment.credits },
      });
    } else {
      payment.status = "FAILED";
      await payment.save();
    }

    res.sendStatus(200);

  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
};
