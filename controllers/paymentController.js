import axios from "axios";
import Payment from "../models/Payment.js";

export const createOrder = async (req, res) => {
  try {

    const { planName, amount } = req.body;

    const orderId = "WS_" + Date.now();

    const response = await axios.post(
      "https://api.cashfree.com/pg/links",
      {
        customer_details: {
          customer_name: "WorkSangam User",
          customer_email: req.user.email,
          customer_phone: "9999999999"
        },

        link_id: orderId,
        link_amount: amount,
        link_currency: "INR",
        link_purpose: `${planName} Subscription`,

        link_notify: {
          send_sms: false,
          send_email: false
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

    await Payment.create({
      userId: req.user.id,
      orderId,
      amount,
      planName
    });

    res.json({
      payment_link: response.data.link_url,
      orderId
    });

  } catch (err) {

    console.log(
      "CASHFREE ERROR:",
      err.response?.data || err.message
    );

    res.status(500).json({
      message: "Payment link creation failed",
      error: err.response?.data || err.message
    });
  }
};
