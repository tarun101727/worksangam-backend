import { Cashfree, CFEnvironment } from "cashfree-pg";

import User from "../models/User.js";

Cashfree.XClientId =
  process.env.CASHFREE_APP_ID;

Cashfree.XClientSecret =
  process.env.CASHFREE_SECRET_KEY;

Cashfree.XEnvironment =
  process.env.CASHFREE_ENV === "PRODUCTION"
    ? CFEnvironment.PRODUCTION
    : CFEnvironment.SANDBOX;

/*
CREATE ORDER
*/

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

    console.log(
      "CASHFREE RESPONSE =>",
      response.data,
    );

    return res.json({

      orderId,

      paymentSessionId:
        response.data.payment_session_id,
    });

  } catch (err) {

    console.error(
      "CREATE ORDER ERROR =>",
      err.response?.data || err,
    );

    return res.status(500).json({

      msg: "Server Error",

      error:
        err.response?.data ||
        err.message,
    });
  }
};

/*
VERIFY PAYMENT
*/

export const verifySubscription =
async (req, res) => {

  try {

    const {
      orderId,
      plan,
    } = req.body;

    const response =
      await Cashfree.PGFetchOrder(
        orderId
      );

    console.log(
      "VERIFY RESPONSE =>",
      response.data,
    );

    if (
      response.data.order_status !==
      "PAID"
    ) {

      return res.status(400).json({

        msg:
          "Payment not completed",
      });
    }

    const user =
      await User.findById(
        req.user.id
      );

    if (!user) {

      return res.status(404).json({
        msg: "User not found",
      });
    }

    const startDate =
      new Date();

    const endDate =
      new Date();

    endDate.setMonth(
      endDate.getMonth() + 1
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

    return res.json({

      msg:
        "Subscription Activated",

      subscriptionEnd:
        user.subscriptionEnd,
    });

  } catch (err) {

    console.error(
      "VERIFY ERROR =>",
      err.response?.data || err,
    );

    return res.status(500).json({

      msg: "Server Error",

      error:
        err.response?.data ||
        err.message,
    });
  }
};
