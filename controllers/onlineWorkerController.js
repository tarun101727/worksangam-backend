import User from "../models/User.js";
import HirerPost from "../models/HirerPost.js";

export const getHirerOnlinePost = async (req, res) => {
  try {
    const hirerId = req.user.id;

    const post = await HirerPost.findOne({
      hirer: hirerId,
    })
      .sort({ createdAt: -1 })
      .populate("hirer", "firstName lastName profileImage");

    if (!post) return res.status(404).json({ msg: "No post found" });

    res.json({ post });
  } catch (err) {
    console.error("Get hirer post error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

export const getTopWorkers = async (req, res) => {
  try {
    const { profession, languages = [], skip = 0, limit = 5 } = req.query;

    if (!profession) return res.status(400).json({ msg: "Profession required" });

    const query = {
      role: "employee",
      profession: new RegExp(`^${profession}$`, "i"),
    };

    // 🔥 Handle languages properly: array of trimmed lowercase
    let langArray = [];
    if (languages) {
      if (typeof languages === "string") {
        // If string (from query), split by comma
        langArray = languages.split(",").map((l) => l.trim().toLowerCase());
      } else if (Array.isArray(languages)) {
        langArray = languages.map((l) => l.trim().toLowerCase());
      }
    }

    if (langArray.length > 0) {
      query.languages = {
        $elemMatch: { $in: langArray.map((l) => new RegExp(`^${l}$`, "i")) },
      };
    }

    const workers = await User.find(query)
      .sort({ ratingAverage: -1 })
      .skip(Number(skip))
      .limit(Number(limit))
      .select("firstName lastName profileImage bio ratingAverage ratingCount languages");

    res.json({
      workers: workers.map((w) => ({
        _id: w._id,
        name: `${w.firstName} ${w.lastName}`,
        profileImage: w.profileImage || "/default-avatar.png",
        bio: w.bio || "",
        ratingAverage: w.ratingAverage || 0,
        ratingCount: w.ratingCount || 0,
        languages: w.languages || [],
      })),
    });
  } catch (err) {
    console.error("Get top workers error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};