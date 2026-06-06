import User from "../models/User.js";

const subscriptionMiddleware =
  async (req, res, next) => {

    const user =
      await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        msg: "User not found",
      });
    }

    if (
      !user.subscriptionEnd ||
      new Date() > user.subscriptionEnd
    ) {
      return res.status(403).json({
        msg:
          "Subscription required",
      });
    }

    next();
};

export default subscriptionMiddleware;
