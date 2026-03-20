import express from "express";
import webpush from "../utils/push.js"; // your configured web-push

const router = express.Router();
let subscriptions = [];

// Endpoint to get public key
router.get("/public-key", (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

// Subscribe endpoint
router.post("/subscribe", (req, res) => {
  const sub = req.body;
  subscriptions.push(sub);
  res.json({ msg: "Subscribed" });
});

export { subscriptions };
export default router;
