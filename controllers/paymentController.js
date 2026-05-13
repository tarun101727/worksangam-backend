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

    res.json({

  order_id: orderId,

  upi_id: "worksangam@ibl",

  receiver_name: "Worksangam",

  amount,
});

  } catch (err) {
    console.error("🔥 CASHFREE ERROR:", err.response?.data || err.message);
    res.status(500).json({ msg: "Order creation failed" });
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
