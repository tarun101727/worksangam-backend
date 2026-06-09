import axios from "axios";
import Payment from "../models/Payment.js";

export const createOrder = async (req, res) => {
  try {

    const { planName, amount } = req.body;

    const orderId = "WS_" + Date.now();

    const response = await axios.post(
  "https://api.cashfree.com/pg/orders",
  {
    order_id: orderId,
    order_amount: amount,
    order_currency: "INR",

    customer_details: {
      customer_id: req.user.id,
      customer_email: req.user.email,
      customer_phone: "9999999999"
    }
  },
  {
    headers: {
      "x-client-id": process.env.CASHFREE_APP_ID,
      "x-client-secret": process.env.CASHFREE_SECRET_KEY,
      "x-api-version": "2023-08-01",
      "Content-Type": "application/json"
    }
  }
);

    console.log(
      "CASHFREE RESPONSE:",
      response.data
    );

    await Payment.create({
      userId: req.user.id,
      orderId,
      amount,
      planName
    });

    res.json({
  payment_session_id:
    response.data.payment_session_id,

  order_id:
    response.data.order_id
});

  } catch (err) {

    console.log(
      err.response?.data || err.message
    );

    res.status(500).json({
      message:
        "Payment link creation failed"
    });
  }
};
