import Profession from "../models/Profession.js";

/* GET ALL PROFESSIONS */
export const getProfessions = async (req, res) => {
  try {
    const professions = await Profession.find().sort({ name: 1 });
    res.json({ professions });
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
};

/* AUTO ADD PROFESSION IF NOT EXISTS */
export const addProfessionIfNotExists = async (name, type = "offline") => {
  const normalized = name.trim();
  if (!normalized) return;

  const exists = await Profession.findOne({
    name: new RegExp(`^${normalized}$`, "i")
  });

  if (!exists) {
    await Profession.create({
      name: normalized,
      type
    });
  }
};

/* CREATE NEW PROFESSION */
export const createProfession = async (req, res) => {
  try {
    const { name, type } = req.body;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ msg: "Profession name required" });
    }

    const normalized = name.trim();

    const exists = await Profession.findOne({
      name: new RegExp(`^${normalized}$`, "i")
    });

    if (exists) {
      return res.json({ profession: exists });
    }

    const profession = await Profession.create({
      name: normalized,
      type: type === "online" ? "online" : "offline"
    });

    res.json({ profession });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};

/* GET ONLINE PROFESSIONS */
export const getOnlineProfessions = async (req, res) => {
  try {
    const professions = await Profession.find({ type: "online" }).sort({ name: 1 });
    res.json({ professions });
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
};

/* GET OFFLINE PROFESSIONS */
export const getOfflineProfessions = async (req, res) => {
  try {
    const professions = await Profession.find({ type: "offline" }).sort({ name: 1 });
    res.json({ professions });
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
};