import User from "../models/User.js";
import HirerPost from "../models/HirerPost.js";
import { io } from "../socket.js";
import axios from "axios";
import cloudinary from "../config/cloudinary.js";
import streamifier from "streamifier";

const uploadToCloudinary = (file, isVideo) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "hirer_posts",
        resource_type: isVideo ? "video" : "image",
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );

    streamifier.createReadStream(file.buffer).pipe(stream);
  });
};


/* ================= CREATE POST ================= */
export const createHirerPost = async (req, res) => {
  try {
    const userId = req.user.id;
    const { profession, description, price, location } = req.body;

    if (!location || !location.coordinates) {
      return res.status(400).json({ msg: "Location coordinates required" });
    }

    const post = await HirerPost.create({
      hirer: userId,
      profession,
      description,
      price,
      location, // Ensure location is included
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    });

    res.status(201).json({
      msg: "Job created",
      job: post,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};

/* ================= ACCEPT JOB ================= */
export const acceptJob = async (req, res) => {
  try {
    const userId = req.user.id;
    const { postId } = req.params;

    const post = await HirerPost.findById(postId);
    if (!post) return res.status(404).json({ msg: "Job not found" });

    if (post.status !== "pending") {
      return res.status(400).json({ msg: "Job already taken" });
    }

    post.status = "accepted";
    post.acceptedBy = userId;
    await post.save();

    res.json({ msg: "Job accepted" });
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
};


export const createPost = async (req, res) => {
  try {
    const hirerId = req.user.id;

    let {
      profession,
      description,
      price,
      postType,
      location,
      preferredTime,
      addressDetails,
      safetyWarnings,
    } = req.body;

    if (safetyWarnings && typeof safetyWarnings === "string") {
  safetyWarnings = JSON.parse(safetyWarnings);
}

    /* ================= PARSE JSON STRINGS ================= */
    if (location && typeof location === "string") {
      location = JSON.parse(location);
    }

    if (price && typeof price === "string") {
      price = JSON.parse(price);
    }

    if (preferredTime && typeof preferredTime === "string") {
      preferredTime = JSON.parse(preferredTime);
    }

    /* ================= BASIC VALIDATION ================= */
    if (!profession || !profession.trim()) {
      return res.status(400).json({ msg: "Profession is required" });
    }

    if (!description || !description.trim()) {
      return res.status(400).json({ msg: "Description is required" });
    }

    if (!location?.coordinates?.length) {
      return res.status(400).json({ msg: "Location coordinates are required" });
    }

    /* ================= PRICE VALIDATION ================= */
    if (price) {
      if (price.type === "fixed" || price.type === "hourly") {
        if (!price.value || price.value <= 0) {
          return res.status(400).json({ msg: "Price value required" });
        }
      }

      if (price.type === "negotiable") {
        if (
          !price.min ||
          !price.max ||
          price.min <= 0 ||
          price.max <= 0 ||
          price.min > price.max
        ) {
          return res.status(400).json({ msg: "Invalid price range" });
        }
      }

      // inspect_quote → no validation needed
    }

    /* ================= PREFERRED TIME VALIDATION ================= */
    if (
      preferredTime &&
      preferredTime.type === "custom" &&
      (!preferredTime.from || !preferredTime.to)
    ) {
      return res.status(400).json({ msg: "Custom time range required" });
    }

    /* ================= HANDLE FILES (CLOUDINARY) ================= */
const files = req.files || [];

const media = [];

for (const file of files) {
  const isVideo = file.mimetype.startsWith("video");

  const result = await uploadToCloudinary(file, isVideo);

  media.push({
    url: result.secure_url,
    type: isVideo ? "video" : "image",
    public_id: result.public_id,
  });
}

    /* ================= CREATE POST ================= */
    const post = await HirerPost.create({
  hirer: hirerId,
  profession: profession.trim(),
  description: description.trim(),
  professionType: "offline",
  price: price ? { ...price, currency: price.currency || "INR" } : null,
  postType: postType || "normal",
  preferredTime: preferredTime || null,
  location: {
    type: "Point",
    coordinates: location.coordinates,
    address: location.address,
  },
  addressDetails: addressDetails?.trim() || "",
  safetyWarnings: safetyWarnings || {},
  media,
  expiresAt: new Date(Date.now() + 60 * 60 * 1000),
});

    res.status(201).json({
      msg: "Post created successfully",
      job: post,
    });
  } catch (err) {
    console.error("CREATE POST ERROR:", err);
    res.status(500).json({ msg: "Server error" });
  }
};


/* ===========================
   UNLOCK URGENT (PAYMENT)
=========================== */
export const unlockUrgentProfiles = async (req, res) => {
  try {
    const hirerId = req.user.id;
    const { postId } = req.params;

    /* ================= POST ================= */
    const post = await HirerPost.findOne({
      _id: postId,
      hirer: hirerId,
      postType: "urgent",
    });

    if (!post) {
      return res.status(404).json({ msg: "Post not found" });
    }

    /* ================= LOCATION CHECK ================= */
    if (!post.location || !post.location.coordinates) {
      return res.status(400).json({
        msg: "Post location not set",
      });
    }

    /* ================= PAYMENT META ================= */
    post.urgentMeta.isPaid = true;
    post.urgentMeta.amount = 30;
    post.urgentMeta.unlockedAt = new Date();
    await post.save();

    /* ================= EMPLOYEE SEARCH ================= */
    const employees = await User.find({
      role: "employee",
      isAvailable: true,
      profession: new RegExp(`^${post.profession}$`, "i"),
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: post.location.coordinates, // 🔥 POST LOCATION
          },
          $maxDistance: 3000, // 3 KM
        },
      },
    })
      .limit(5)
      .select(
        "firstName lastName profileImage profession skills experience languages"
      );

    /* ================= RESPONSE ================= */
    res.json({
      employees,
    });
  } catch (err) {
    console.error("Unlock urgent error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};


/* ================= UPDATE POST ================= */
export const updateMyPost = async (req, res) => {
  try {
    const hirerId = req.user.id;
    const { postId } = req.params;
    let { profession, description, price } = req.body;

    if (typeof price === "string") {
      price = JSON.parse(price);
    }

    const post = await HirerPost.findOne({ _id: postId, hirer: hirerId });
    if (!post) return res.status(404).json({ msg: "Post not found" });

    if (profession) post.profession = profession;
    if (description) post.description = description;
    if (price) post.price = price;

    await post.save();

    res.json({ msg: "Post updated", post });
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
};


/* ================= DELETE POST ================= */
export const deleteMyPost = async (req, res) => {
  try {
    const hirerId = req.user.id;
    const { postId } = req.params;

    const post = await HirerPost.findOneAndDelete({
      _id: postId,
      hirer: hirerId,
    });

    if (!post) return res.status(404).json({ msg: "Post not found" });

    res.json({ msg: "Post deleted successfully" });
  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
};

/* ================= UPDATE POST LOCATION ================= */
export const updatePostLocation = async (req, res) => {
  const hirerId = req.user.id; // Get hirer ID from authenticated request
  const { postId } = req.params; // Get the post ID from the URL parameters
  const { latitude, longitude, address } = req.body; // Get latitude, longitude, and address from the request body

  if (!latitude || !longitude || !address) {
    return res.status(400).json({ msg: "Latitude, longitude, and address required" });
  }

  // Update the HirerPost location
  const post = await HirerPost.findOneAndUpdate(
    { _id: postId, hirer: hirerId }, // Find the post by ID and hirer
    {
      location: {
        type: "Point", // GeoJSON type for point
        coordinates: [longitude, latitude], // [longitude, latitude]
        address, // Update the address
      },
    },
    { new: true } // Return the updated post document
  );

  if (!post) {
    return res.status(404).json({ msg: "Post not found" });
  }

  res.json({ msg: "Location updated", location: post.location }); // Return updated post location
};


export const getLocationFromCoordinates = async (req, res) => {
  const { lat, lng } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ msg: "Latitude and longitude are required" });
  }

  try {
    const response = await axios.get(
      "https://api.opencagedata.com/geocode/v1/json",
      {
        params: {
          q: `${lat},${lng}`,
          key: process.env.OPENCAGE_API_KEY,
        },
      }
    );

    const address =
      response.data.results[0]?.formatted || "Address not found";

    res.json({ address });

  } catch (err) {
    console.error("OpenCage error:", err.message);
    res.status(500).json({ msg: "Failed to fetch address" });
  }
};

export const getUrgentMatches = async (req, res) => {
  try {
    const { postId } = req.params;
    const radius = Number(req.query.radius || 1000); // Default radius is 1 km
    const hirerId = req.user.id;

    // Fetch the hirer post
    const post = await HirerPost.findById(postId)
      .populate("hirer", "firstName lastName profileImage profession description");

    if (!post) return res.status(404).json({ msg: "Post not found" });
    if (post.hirer._id.toString() !== hirerId)
      return res.status(403).json({ msg: "Unauthorized" });
    if (!post.location || !post.location.coordinates)
      return res.status(400).json({ msg: "Post location not set" });

    // Fetch employees within radius (optional)
    const employees = await User.aggregate([
      {
        $geoNear: {
          near: { type: "Point", coordinates: post.location.coordinates },
          distanceField: "distance",
          maxDistance: radius,
          spherical: true,
          query: {
            role: "employee",
            profession: new RegExp(post.profession, "i"),
            isAvailable: true,
          },
        },
      },
      { $sort: { distance: 1 } },
    ]);

    res.json({
      hirer: {
        firstName: post.hirer.firstName,
        lastName: post.hirer.lastName,
        profileImage: post.hirer.profileImage,
        profession: post.profession,
        description: post.description,
        preferredTime: post.preferredTime || null,
        media: post.media || [],
        safetyWarnings: post.safetyWarnings || {},
        price: post.price || null,
        addressDetails: post.addressDetails || "",
        location: post.location || null,
      },
      location: post.location.coordinates,
      // NEW
allMatches: employees.map((e) => ({
  _id: e._id,
  name: `${e.firstName || ""} ${e.lastName || ""}`,
  profileImage: e.profileImage || "/default-avatar.png",
  profession: e.profession || "",
  distance: e.distance,
})),
    });
  } catch (err) {
    console.error("Urgent match error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

export const urgentSearchEmployees = async (req, res) => {
  try {
    const { profession, lat, lng, radius = 1000 } = req.query;

    if (!profession || !lat || !lng) {
      return res.status(400).json({ msg: "Missing parameters" });
    }

    const employees = await User.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [Number(lng), Number(lat)],
          },
          distanceField: "distance",
          maxDistance: Number(radius),
          spherical: true,
          query: {
            role: "employee",
            isAvailable: true,
            profession: new RegExp(`^${profession}$`, "i"),
          },
        },
      },
      { $sort: { distance: 1 } },
      { $limit: 20 },
    ]);

    res.json({
      employees: employees.map(e => ({
        _id: e._id,
        name: `${e.firstName} ${e.lastName}`,
        profession: e.profession,
        description: e.description,
        price: e.price,
        profileImage: e.profileImage,
        address: e.address,
        distance: e.distance,
      })),
    });
  } catch (err) {
    console.error("Urgent search error:", err);
    res.status(500).json({ msg: "Server error" });
  }
}; 

/* ================= SEARCH LOCATION (FOR DROPDOWN) ================= */
export const searchLocationSuggestions = async (req, res) => {
  const { query } = req.query;

  if (!query) {
    return res.status(400).json({ msg: "Query required" });
  }

  try {
    const response = await axios.get(
      "https://nominatim.openstreetmap.org/search",
      {
        params: {
          q: query,
          format: "json",
          addressdetails: 1,
          limit: 5,
        },
        headers: {
          "User-Agent": "MyJobApp/1.0 (support@myjobapp.com)",
        },
      }
    );

    res.json(response.data);
  } catch (err) {
    console.error("Search location error:", err.message);
    res.status(500).json({ msg: "Failed to fetch suggestions" });
  }
};
