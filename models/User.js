import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },

  firstName: {
    type: String,
    default: null,
  },

  lastName: {
    type: String,
    default: null,
  },

  age: {
    type: Number,
    min: 18,
    max: 100,
    default: null,
  },

  gender: {
    type: String,
    enum: ["Male", "Female", "Other"],
    default: null,
  },
  genderLabel: {
  type: String,
  default: null,
},

  profession: { type: String, default: null },

  skills: { type: String, default: null },
  experience: { type: Number, default: null },
  bio: { type: String, default: null },
  languages: {
    type: [String],
    default: [],
  },
  password: { type: String, default: null },

  role: {
    type: String,
    enum: ['owner', 'admin', 'hirer', 'employee', 'guest'],
    default: 'hirer',
  },

  isGuest: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },

  location: {
    type: {
      type: String,
      enum: ["Point"],
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
     
    },
  },

  profileImage: { type: String, default: null },
  avatarInitial: { type: String },
  avatarColor: { type: String },

  onboardingStep: {
    type: String,
    enum: ['role', 'employee_profile', 'hirer_profile', 'completed'],
    default: 'role',
  },

  isAvailable: {
    type: Boolean,
    default: false, // OFF by default
  },

  isDisabled: {
    type: Boolean,
    default: false,
  },


  ratingAverage: {
  type: Number,
  default: 0,
},

ratingCount: {
  type: Number,
  default: 0,
},

ratings: [
  {
    hirer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    value: {
      type: Number,
      min: 0.5,   // ✅ FIX HERE
      max: 5,
    },
  },
],

profession: { type: String, default: null },
professionType: { 
  type: String, 
  enum: ["online", "offline", "guest"],  // ✅ ADD guest
  default: "offline" 
},
preferredLanguage: {
  type: String,
  default: "en",
},
credits: {
  type: Number,
  default: 0
},
welcomeBonusClaimed: {
  type: Boolean,
  default: false
},

subscriptionPlan: {
  type: String,
  enum: ["none", "silver", "gold", "platinum"],
  default: "none",
},

subscriptionStatus: {
  type: String,
  enum: ["inactive", "active", "expired"],
  default: "inactive",
},

subscriptionStart: {
  type: Date,
  default: null,
},

subscriptionEnd: {
  type: Date,
  default: null,
},

  createdAt: { type: Date, default: Date.now },
});

UserSchema.index({ location: "2dsphere" });

export default mongoose.model('User', UserSchema); 
