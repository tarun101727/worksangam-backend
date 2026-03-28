import webpush from "../utils/push.js";
import { subscriptions } from "../routes/pushRoutes.js";
import HirerPost from "../models/HirerPost.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import { io } from "../socket.js";
import Profession from "../models/Profession.js";


/* ================= GET NEARBY JOBS (EMPLOYEE) ================= */
export const getNearbyJobs = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId);

    if (!user || user.role !== "employee") {
      return res.json({ jobs: [] });
    }

    const jobs = await HirerPost.find({
      status: "pending",
      hirer: { $ne: userId },

      // ✅ ONLY SAME PROFESSION
      profession: user.profession
    })
      .populate("hirer", "firstName lastName profileImage")

      // newest jobs first
      .sort({ createdAt: -1 });

    res.json({ jobs });

  } catch (err) {
    console.error("Nearby jobs error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

export const getMyHirerPosts = async (req, res) => {
  try {
    const userId = req.user.id;

    const posts = await HirerPost.find({ hirer: userId })
      .populate("hirer", "firstName lastName profileImage avatarColor avatarInitial")
      .sort({ createdAt: -1 });

    res.json({ jobs: posts });
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
};

/* ================= ACCEPT JOB ================= */
export const acceptJob = async (req, res) => {
  try {
    const employeeId = req.user.id;
    const { jobId } = req.params;

    const job = await HirerPost.findOneAndUpdate(
      {
        _id: jobId,
        status: "pending",
        acceptedBy: null,
      },
      {
        status: "accepted",
        acceptedBy: employeeId,
      },
      { new: true }
    );

    if (!job) {
      return res.status(409).json({ msg: "Job already accepted" });
    }

    /* 🔥 INFORM ALL OTHER WORKERS */
    io.emit("job-taken", {
      jobId: job._id,
      acceptedBy: employeeId,
    });

    /* 🔔 INFORM HIRER */
    io.to(job.hirer.toString()).emit("job-accepted", {
      jobId: job._id,
      employeeId,
    });

    res.json({
      msg: "Job accepted successfully",
      job,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};

/* ================= GET ALL JOBS (HIRER + EMPLOYEE) ================= */
export const getAllJobs = async (req, res) => {
  try {
    const type = req.query.type; // online / offline
    const query = { status: "pending" };
    if (type === "online" || type === "offline") query.professionType = type;

    const jobs = await HirerPost.find(query)
      .populate("hirer", "firstName lastName profileImage avatarInitial avatarColor")
      .sort({ createdAt: -1 });

    res.json({ jobs });
  } catch (err) {
    console.error("Get all jobs error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};


/* ================= GET SINGLE JOB ================= */
export const getJobById = async (req, res) => {
  try {
    const { jobId } = req.params;

    const job = await HirerPost.findById(jobId)
      .populate("hirer", "firstName lastName profileImage");

    if (!job) {
      return res.status(404).json({ msg: "Job not found" });
    }

    res.json({ job });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};

export const applyForJob = async (req, res) => {
  try {
    const employeeId = req.user.id;
    const { jobId } = req.params;

    const job = await HirerPost.findById(jobId);

    if (!job) {
      return res.status(404).json({ msg: "Job not found" });
    }

    // 🔴 Check if already applied
    const existingApplication = await Notification.findOne({
      type: "job_application",
      sender: employeeId,
      receiver: job.hirer,
      job: jobId,
    });

    if (existingApplication) {
      return res.json({ msg: "Already applied to this job" });
    }

    // ✅ Create notification
    const notification = await Notification.create({
      type: "job_application",
      sender: employeeId,
      receiver: job.hirer,
      job: jobId,
    });

    const populated = await Notification.findById(notification._id)
      .populate(
        "sender",
        "firstName lastName profileImage avatarInitial avatarColor"
      )
      .populate("job", "profession");

    // realtime notification
    io.to(job.hirer.toString()).emit("new-notification", populated);

    res.json({ msg: "Application sent" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};

export const acceptApplication = async (req, res) => {
  try {
    const { notificationId } = req.params;

    const notification = await Notification.findById(notificationId)
      .populate("sender")
      .populate("job");

    if (!notification) {
      return res.status(404).json({ msg: "Notification not found" });
    }

    notification.status = "accepted";
    await notification.save();

    // Notify employee
    const newNotification = await Notification.create({
      type: "application_accepted",
      sender: notification.receiver,
      receiver: notification.sender._id,
      job: notification.job._id,
    });

    io.to(notification.sender._id.toString()).emit(
      "new-notification",
      newNotification
    );

    for (const sub of subscriptions) {
  await webpush.sendNotification(
    sub,
    JSON.stringify({
      title: "New Job Application",
      body: "Someone applied to your job",
    })
  );
}

    res.json({ msg: "Application accepted" });

  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
};

export const rejectApplication = async (req, res) => {
  try {
    const { notificationId } = req.params;

    const notification = await Notification.findById(notificationId)
      .populate("sender")
      .populate("job");

    if (!notification) {
      return res.status(404).json({ msg: "Notification not found" });
    }

    notification.status = "rejected";
    await notification.save();

    // 🔔 create rejection notification for employee
    const newNotification = await Notification.create({
      type: "application_rejected",
      sender: notification.receiver, // hirer
      receiver: notification.sender._id, // employee
      job: notification.job._id,
    });

    // realtime notification
    io.to(notification.sender._id.toString()).emit(
      "new-notification",
      newNotification
    );

    res.json({ msg: "Application rejected" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};

export const getMyNotifications = async (req, res) => {
  try {

    if (!req.user) {
      return res.status(401).json({ msg: "Unauthorized" });
    }

    const userId = req.user.id;

    const notifications = await Notification.find({
      receiver: userId,
    })
      .populate("sender", "firstName lastName profileImage avatarInitial avatarColor")
      .populate("job", "profession")
      .sort({ createdAt: -1 });

    res.json({ notifications });

  } catch (err) {
    console.error("Notifications error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

export const getNotificationById = async (req, res) => {
  try {
    const { notificationId } = req.params;

    const notification = await Notification.findById(notificationId)
      .populate(
        "sender",
        "firstName lastName profession profileImage avatarInitial avatarColor"
      )
      .populate({
        path: "job",
        populate: {
          path: "hirer",
          select: "firstName lastName profileImage avatarInitial avatarColor",
        },
      });

    if (!notification) {
      return res.status(404).json({ msg: "Notification not found" });
    }

    res.json({
      employee: notification.sender,
      job: notification.job,
      notification,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};

export const markNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    await Notification.updateMany(
      { receiver: userId, isRead: false },
      { $set: { isRead: true } }
    );

    res.json({ msg: "Notifications marked as read" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};

export const createOnlinePost = async (req, res) => {
  try {
    const hirerId = req.user.id;
    const { profession, description, priceType, expectedPrice, minPrice, maxPrice, currency, languages = [] } = req.body;

    if (!profession || !description) {
      return res.status(400).json({ msg: "Profession and description required" });
    }

    // ✅ Fetch profession type
    const prof = await Profession.findOne({ name: profession });
    const professionType = prof?.type || "online"; // default to online if not found

    let price = null;
    if (priceType === "fixed") price = { type: "fixed", value: expectedPrice, currency };
    if (priceType === "negotiable") price = { type: "negotiable", min: minPrice, max: maxPrice, currency };

    const post = await HirerPost.create({
      hirer: hirerId,
      profession,
      professionType, // save type
      description,
      price,
      postType: "normal",
      status: "pending",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      languages,
    });

    // Notify relevant employees
    const workers = await User.find({ role: "employee", profession });
    workers.forEach((worker) => {
      io.to(worker._id.toString()).emit("new-job-request", {
        jobId: post._id,
        profession,
        languages,
      });
    });

    io.emit("job-added-to-home", post);

    res.json({ msg: "Online job post created", job: post });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};

export const createOfflinePost = async (req, res) => {
  try {
    const hirerId = req.user.id;
    const { profession, description, priceType, expectedPrice, minPrice, maxPrice, currency, languages = [] } = req.body;

    if (!profession || !description) {
      return res.status(400).json({ msg: "Profession and description required" });
    }

    const prof = await Profession.findOne({ name: profession });
    const professionType = prof?.type || "offline"; // default offline

    let price = null;
    if (priceType === "fixed") price = { type: "fixed", value: expectedPrice, currency };
    if (priceType === "negotiable") price = { type: "negotiable", min: minPrice, max: maxPrice, currency };

    const post = await HirerPost.create({
      hirer: hirerId,
      profession,
      professionType,
      description,
      price,
      postType: "normal",
      status: "pending",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      languages,
    });

    io.emit("job-added-to-home", post);

    res.json({ msg: "Offline job post created", job: post });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};

// ================= GET OFFLINE JOBS BY DISTANCE =================
export const getOfflineJobsByDistance = async (req, res) => {
  try {
    const userId = req.user.id;
    const { distanceKm } = req.query; // e.g., 1, 2, 5
    const radiusInMeters = Number(distanceKm) * 1000;

    const user = await User.findById(userId);

    if (!user || !user.location?.coordinates) {
      return res.status(400).json({ jobs: [], msg: "User location not found" });
    }

    // Geospatial query: find jobs within the radius
    const jobs = await HirerPost.find({
      professionType: "offline",
      status: "pending",
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: user.location.coordinates, // [lng, lat]
          },
          $maxDistance: radiusInMeters,
        },
      },
    })
      .populate("hirer", "firstName lastName profileImage avatarInitial avatarColor")
      .sort({ createdAt: -1 });

    res.json({ jobs });
  } catch (err) {
    console.error("Offline jobs by distance error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

export const deleteJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.user.id;

    const job = await HirerPost.findById(jobId);

    if (!job) {
      return res.status(404).json({ msg: "Job not found" });
    }

    // 🔥 only owner can delete
    if (job.hirer.toString() !== userId) {
      return res.status(403).json({ msg: "Not allowed" });
    }

    await job.deleteOne();

    res.json({ msg: "Job deleted successfully" });
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
};

