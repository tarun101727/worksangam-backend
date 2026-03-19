import User from "../models/User.js";

/* ADD CREDITS AFTER SUCCESS */
export const addCredits = async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount } = req.body;

    const creditsToAdd = amount; // ₹100 = 100 credits

    const user = await User.findByIdAndUpdate(
      userId,
      { $inc: { credits: creditsToAdd } },
      { new: true }
    );

    res.json({
      msg: "Credits added successfully",
      credits: user.credits,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};