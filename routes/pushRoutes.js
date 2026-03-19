import express from "express";

const router = express.Router();

let subscriptions = [];

router.post("/subscribe", (req, res) => {
  const sub = req.body;
  subscriptions.push(sub);
  res.json({ msg: "Subscribed" });
});

export { subscriptions };
export default router;