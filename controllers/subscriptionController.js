import { Cashfree } from "cashfree-pg";
import User from "../models/User.js";

Cashfree.XClientId =
  process.env.CASHFREE_APP_ID;

Cashfree.XClientSecret =
  process.env.CASHFREE_SECRET_KEY;

Cashfree.XEnvironment =
  process.env.CASHFREE_ENV;

export const createSubscriptionOrder =
async (req, res) => {

  try {

    const user =
      await User.findById(
        req.user.id
      );

    if (!user) {
      return res.status(404).json({
        msg: "User not found",
      });
    }

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

    const orderId =
      `SUB_${Date.now()}`;

    const request = {

      order_amount: amount,

      order_currency: "INR",

      order_id: orderId,

      customer_details: {

        customer_id:
          user._id.toString(),

        customer_email:
          user.email,

        customer_phone:
          "9999999999",
      },

      order_meta: {

        return_url:
          "https://worksangam.in",
      },
    };

    const response =
      await Cashfree.PGCreateOrder(
        request
      );

    res.json({

      orderId,

      paymentSessionId:
        response.data
          .payment_session_id,
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      msg: "Server Error",
    });
  }
};

export const verifySubscription =
async (req, res) => {

  try {

    const { orderId, plan } =
      req.body;

    const response =
      await Cashfree.PGFetchOrder(
        orderId
      );

    if (
      response.data.order_status
      !== "PAID"
    ) {

      return res.status(400).json({
        msg: "Payment not completed",
      });
    }

    const user =
      await User.findById(
        req.user.id
      );

    let months = 1;

    const startDate =
      new Date();

    const endDate =
      new Date();

    endDate.setMonth(
      endDate.getMonth() + months
    );

    user.subscriptionPlan =
      plan;

    user.subscriptionStatus =
      "active";

    user.subscriptionStart =
      startDate;

    user.subscriptionEnd =
      endDate;

    await user.save();

    res.json({
      msg: "Subscription Activated",
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      msg: "Server Error",
    });
  }
};
