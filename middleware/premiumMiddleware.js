import User from "../models/User.js";

export const requirePremium = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    // auto-expire check (important)
    if (
      user.isPremium &&
      user.premiumExpiresAt &&
      new Date() > user.premiumExpiresAt
    ) {
      user.isPremium = false;
      user.subscriptionPlan = null;
      user.premiumPurchasedAt = null;
      user.premiumExpiresAt = null;
      await user.save();
    }

    if (!user.isPremium) {
      return res.status(403).json({
        msg: "Subscription required to access chat",
        code: "SUBSCRIPTION_REQUIRED",
      });
    }

    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};
