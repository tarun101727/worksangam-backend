import { Cashfree, CFEnvironment } from "cashfree-pg";
import User from "../models/User.js";

console.log("CASHFREE =", Cashfree);

if (Cashfree) {
  console.log(
    "CASHFREE METHODS =",
    Object.getOwnPropertyNames(Cashfree)
  );
}

Cashfree.XClientId =
  process.env.CASHFREE_APP_ID;

Cashfree.XClientSecret =
  process.env.CASHFREE_SECRET_KEY;

Cashfree.XEnvironment =
  CFEnvironment.PRODUCTION;


  console.log(
  "Cashfree Object =",
  Cashfree
);

console.log(
  "Cashfree Keys =",
  Object.keys(Cashfree)
);

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

    console.log("REQUEST =", request);

const response =
  await Cashfree.PGCreateOrder(
    request
  );

console.log(
  "CREATE ORDER RESPONSE =",
  response?.data
);

console.log(
  "CASHFREE FULL OBJECT =>",
  Cashfree
);

console.log(
  "CASHFREE KEYS =>",
  Object.keys(Cashfree)
);

console.log(
  "CASHFREE PROPERTY NAMES =>",
  Object.getOwnPropertyNames(Cashfree)
);

    res.json({

      orderId,

      paymentSessionId:
        response.data
          .payment_session_id,
    });

  } catch (err) {

  console.log(
    "CASHFREE ERROR =>",
    err
  );

  console.log(
    "CASHFREE RESPONSE =>",
    err?.response?.data
  );

  res.status(500).json({

    msg: "Server Error",

    error: err?.message,

    cashfree:
      err?.response?.data,
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

  console.log(
    "CASHFREE ERROR =>",
    err
  );

  console.log(
    "CASHFREE RESPONSE =>",
    err?.response?.data
  );

  res.status(500).json({

    msg: "Server Error",

    error: err?.message,

    cashfree:
      err?.response?.data,
  });
}
};
