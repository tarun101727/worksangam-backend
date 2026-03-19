import HirerPost from "../models/HirerPost.js";

export const approveJob = async (req, res) => {
  await HirerPost.findByIdAndUpdate(req.params.id, {
    status: "approved",
  });
  res.json({ msg: "Job approved" });
};

export const rejectJob = async (req, res) => {
  await HirerPost.findByIdAndUpdate(req.params.id, {
    status: "rejected",
  });
  res.json({ msg: "Job rejected" });
};

export const getAllJobsForAdmin = async (req, res) => {
  try {
    const jobs = await HirerPost.find()
      .populate("hirer", "email")
      .sort({ createdAt: -1 });

    res.json({ jobs });
  } catch (err) {
    console.error("Fetch admin jobs error:", err);
    res.status(500).json({ msg: "Failed to fetch jobs" });
  }
};
