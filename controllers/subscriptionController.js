import { Cashfree, CFEnvironment } from "cashfree-pg";
import User from "../models/User.js";

Cashfree.XClientId = process.env.CASHFREE_APP_ID;
Cashfree.XClientSecret = process.env.CASHFREE_SECRET_KEY;
Cashfree.XEnvironment = CFEnvironment.PRODUCTION;

export const createSubscriptionOrder = async (req, res) => {
  try {
    const userId = req.user.id;

    const { plan } = req.body;

    let amount = 0;

    switch (plan) {
      case "silver":
        amount = 99;
        break;

      case "gold":
        amount = 199;
        break;

      case "platinum":
        amount = 499;
        break;

      default:
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

    const orderId =
      "sub_" +
      Date.now() +
      "_" +
      Math.floor(Math.random() * 10000);

    const request = {
      order_amount: amount,
      order_currency: "INR",

      order_id: orderId,

      customer_details: {
        customer_id: user._id.toString(),
        customer_email: user.email,
        customer_phone: "9999999999",
      },

      order_meta: {
        return_url:
          "https://worksangam.in/payment-success?order_id={order_id}",
      },
    };

    const response =
      await Cashfree.PGCreateOrder(request);

    res.json({
      orderId,
      paymentSessionId:
        response.data.payment_session_id,
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      msg: "Order creation failed",
    });
  }
};

export const cashfreeWebhook =
  async (req, res) => {
    try {
      const data = req.body;

      if (
        data.type !==
        "PAYMENT_SUCCESS_WEBHOOK"
      ) {
        return res.sendStatus(200);
      }

      const customerId =
        data.data.customer_details
          .customer_id;

      const user =
        await User.findById(customerId);

      if (!user) {
        return res.sendStatus(200);
      }

      user.subscriptionStatus =
        "active";

      await user.save();

      res.sendStatus(200);

    } catch (err) {
      console.error(err);

      res.sendStatus(500);
    }
  };

  export const verifySubscriptionPayment =
  async (req, res) => {
    try {
      const userId = req.user.id;

      const { orderId, plan } = req.body;

      const payment =
        await Cashfree.PGFetchOrder(orderId);

      if (
        payment.data.order_status !==
        "PAID"
      ) {
        return res.status(400).json({
          msg: "Payment not completed",
        });
      }

      const user =
        await User.findById(userId);

      const startDate = new Date();

      const endDate = new Date();

      endDate.setMonth(
        endDate.getMonth() + 1
      );

      user.subscriptionPlan = plan;

      user.subscriptionStatus =
        "active";

      user.subscriptionStart =
        startDate;

      user.subscriptionEnd =
        endDate;

      await user.save();

      res.json({
        msg:
          "Subscription activated",
      });

    } catch (err) {
      console.error(err);

      res.status(500).json({
        msg:
          "Verification failed",
      });
    }
  };
