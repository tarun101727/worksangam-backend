
import mongoose from "mongoose";

const PriceSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        "fixed",          // fixed price
        "hourly",         // hourly rate
        "negotiable",     // range
        "inspect_quote",  // inspect first, then quote
      ],
      required: true,
    },

    value: Number,     // fixed OR hourly value
    min: Number,       // negotiable
    max: Number,       // negotiable

    currency: {
      type: String,
      default: "INR",
    },
  },
  { _id: false }
);

const MediaSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    type: {
      type: String,
      enum: ["image", "video"],
      required: true,
    },
  },
  { _id: false }
);

const SafetyWarningsSchema = new mongoose.Schema(
  {
    pets: { type: Boolean, default: false },
    elderly: { type: Boolean, default: false },
    children: { type: Boolean, default: false },
    safetyConcerns: { type: Boolean, default: false },
  },
  { _id: false }
);

/* ===========================
   PREFERRED TIME SUB SCHEMA
=========================== */
const PreferredTimeSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["asap", "today", "custom"],
      required: true,
    },
    from: {
      type: Date,
      default: null,
    },
    to: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

const HirerPostSchema = new mongoose.Schema({
  hirer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", // Make sure 'User' is the correct model
    required: true,
  },

  profession: {
    type: String,
    required: true,
  },
  professionType: {
  type: String,
  enum: ["online", "offline"],
  required: true,
},
  description: { type: String, required: true, },

  price: {
    type: PriceSchema,
    default: null, // ✅ NOW THIS IS VALID
  },

  postType: {
    type: String,
    enum: ["normal", "urgent"],
    default: "normal",
  },

  urgentMeta: {
    isPaid: { type: Boolean, default: false },
    amount: { type: Number, default: 0 },
    unlockedAt: { type: Date },
  },

  status: {
    type: String,
    enum: ["pending", "approved", "rejected", "filled", "accepted"],
    default: "pending",
  },

  acceptedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },

  expiresAt: {
    type: Date,
    required: true,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },

  location: {
    type: {
      type: String,
      enum: ["Point"],
      required: false,
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: false,
    },
    address: {
      type: String, // 👈 display only
    },
  },

  media: {
  type: [MediaSchema],
  default: [],
},

preferredTime: {
  type: PreferredTimeSchema,
  default: null, // ✅ only for standard posts
},
addressDetails: {
  type: String,
  default: "",
},
  safetyWarnings: {
    type: SafetyWarningsSchema,
    default: () => ({}),
  },

  applications: [
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    distance: Number,
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
    appliedAt: {
      type: Date,
      default: Date.now,
    },
  },
],

languages: {
  type: [String],
  default: [],
},
});

// Add a spatial index on the location field to enable geospatial queries
HirerPostSchema.index({ location: "2dsphere" });

export default mongoose.model("HirerPost", HirerPostSchema);

