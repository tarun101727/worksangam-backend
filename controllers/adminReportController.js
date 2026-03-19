import Report from "../models/Report.js";

export const getReports = async (req, res) => {
  const reports = await Report.find().sort({ createdAt: -1 });
  res.json({ reports });
};

export const resolveReport = async (req, res) => {
  await Report.findByIdAndUpdate(req.params.id, {
    status: "resolved",
  });
  res.json({ msg: "Report resolved" });
};
