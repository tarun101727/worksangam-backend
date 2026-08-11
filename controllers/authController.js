import Translate from "../models/Translate.js";
import postmark from "postmark";
import User from '../models/User.js';  
import bcrypt from 'bcryptjs'; 
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv'; 
import nodemailer from 'nodemailer'; 
import twilio from 'twilio';
import Media from '../models/Media.js'; 
import OTP from '../models/OTP.js'; 
import { io } from "../socket.js";
import { validateEmail } from "../utils/emailValidator.js";
import DeleteReason from "../models/DeleteReason.js";
import cloudinary from '../config/cloudinary.js';
import Profession from "../models/Profession.js" 

const MIN_AGE = 18;
const MAX_AGE = 100;
const ALLOWED_GENDERS = ["Male", "Female", "Other"];

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

function is18OrOlder(dob) {
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

const setAuthCookie = (res, token, user) => {
  const tenYearsInMs = 10 * 365 * 24 * 60 * 60 * 1000;

  const isProduction = process.env.NODE_ENV === 'production';

  res.cookie('token', token, {
    httpOnly: true,
    secure: isProduction,                 // ✅ HTTPS only in prod
    sameSite: isProduction ? 'None' : 'Lax',
    maxAge: tenYearsInMs,
  });

  res.cookie('username', user.firstName || 'Guest', {
    httpOnly: false,
    secure: isProduction,
    sameSite: 'Lax',
    maxAge: tenYearsInMs,
  });

  res.cookie('userId', user._id.toString(), {
    httpOnly: false,
    secure: isProduction,
    sameSite: 'Lax',
    maxAge: tenYearsInMs,
  });
};


const AVATAR_COLORS = [
  '#C9A24D',
  '#1C1C1C',
  '#7A5C2E',
  '#5E3A87',
  '#2F6F6A',
  '#8B2F2F',
];

const getAvatarColor = (name = '') => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const client = twilio(
  process.env.TWILIO_SID,
  process.env.TWILIO_AUTH_TOKEN
);


const getGuestFromRequest = async (req) => {
  const token = req.cookies?.token;
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (user && user.isGuest) return user;
    return null;
  } catch {
    return null;
  }
};

const sendOtpEmail = async (email, subject = "Your OTP Code") => {
  // Normalize email
  email = email.toLowerCase().trim();

  // Validate email
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Invalid email address");
  }

  // ============================================================
  // 60 SECOND OTP RATE LIMIT
  // ============================================================

  const cooldownMs = 60 * 1000;

  const recentOtp = await OTP.findOne({
    email,
    createdAt: {
      $gt: new Date(Date.now() - cooldownMs),
    },
  }).sort({
    createdAt: -1,
  });

  if (recentOtp) {
    const elapsedMs =
      Date.now() - recentOtp.createdAt.getTime();

    const remainingMs =
      cooldownMs - elapsedMs;

    const remainingSeconds = Math.max(
      1,
      Math.ceil(remainingMs / 1000),
    );

    // Throw an object so the API can return
    // the exact remaining seconds.
    const error = new Error(
      "Please wait before requesting another OTP",
    );

    error.code = "OTP_COOLDOWN";
    error.retryAfterSeconds = remainingSeconds;

    throw error;
  }

  // ============================================================
  // GENERATE OTP
  // ============================================================

  const otp = Math.floor(
    100000 + Math.random() * 900000,
  ).toString();

  // ============================================================
  // SAVE OTP
  // ============================================================

  await OTP.create({
    email,
    otp,
    createdAt: new Date(),
  });

  // ============================================================
  // SEND EMAIL
  // ============================================================

  await postmarkClient.sendEmail({
    From: "Worksangam <info@worksangam.in>",
    To: email,
    Subject: subject,

    HtmlBody: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Worksangam Verification</h2>

        <h1 style="letter-spacing: 4px;">
          ${otp}
        </h1>

        <p>
          This OTP is valid for <b>5 minutes</b>.
        </p>

        <p>
          If you didn’t request this, ignore this email.
        </p>
      </div>
    `,

    TextBody:
      `Your OTP is ${otp}. Valid for 5 minutes.`,
  });

  return otp;
};

export const signup = async (req, res) => {
  try {
    const { email, firstName, lastName, age, gender, password } = req.body;

    if (!email || !firstName || !lastName || !age || !gender || !password) {
      return res.status(400).json({ msg: 'Please fill in all fields' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ msg: 'Email already registered.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const avatarInitial = firstName.charAt(0).toUpperCase();
    const avatarColor = getAvatarColor(firstName);

    const newUser = new User({
      email,
      firstName,
      lastName,
      age,
      gender,
      password: hashedPassword,

      // ✅ FIX
      role: 'hirer',
      isGuest: false,
      isVerified: true,

      avatarInitial,
      avatarColor,
      createdAt: new Date(),
    });

    await newUser.save();

    res.status(201).json({
      msg: 'User registered successfully',
      userId: newUser._id,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Internal Server Error' });
  }
};


export const verifyOtp = async (req, res) => {
  try {
    const { email, password, otp } = req.body;

    if (!email || !otp || !password) {
      return res.status(400).json({
        msg: "Email, password and OTP required",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check OTP
    const otpRecord = await OTP.findOne({
      email: normalizedEmail,
      otp,
    });

    if (!otpRecord) {
      return res.status(400).json({
        msg: "Invalid or expired OTP",
      });
    }

    const isExpired =
      Date.now() - otpRecord.createdAt.getTime() > 5 * 60 * 1000;

    if (isExpired) {
      return res.status(400).json({
        msg: "OTP expired",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Get guest user from cookie
    let user = await getGuestFromRequest(req);

    if (user) {
      // Convert guest to verified user
      user.email = normalizedEmail;
      user.password = hashedPassword;

      user.isGuest = false;
      user.isVerified = true;

      // No role selected yet
      user.role = null;

      // Next screen should be role selection
      user.onboardingStep = "select_role";

      await user.save();
    } else {
      // No guest exists, create new verified account
      user = await User.create({
  email: normalizedEmail,
  password: hashedPassword,

  role: null,

  isVerified: true,
  isGuest: false,
  onboardingStep: "select_role",
});
    }

    // Delete OTP after successful verification
    await OTP.deleteMany({
      email: normalizedEmail,
    });

    // Generate JWT
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      {
        expiresIn: "10y",
      }
    );

    // Set auth cookie
    setAuthCookie(res, token, user);

    return res.json({
      msg: "OTP verified",
      token,
      userId: user._id,
      role: user.role,
      onboardingStep: user.onboardingStep,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      msg: "Server error",
    });
  }
};


export const createAccount = async (req, res) => {
  try {
    const userId = req.user.id;
    const { firstName, lastName, age, gender, genderLabel } = req.body;

    // ✅ VALIDATIONS
    if (!firstName || !firstName.trim()) {
      return res.status(400).json({ msg: "First name required" });
    }

    if (!lastName || !lastName.trim()) {
      return res.status(400).json({ msg: "Last name required" });
    }

    const ageNum = Number(age);
    if (!Number.isInteger(ageNum) || ageNum < MIN_AGE || ageNum > MAX_AGE) {
      return res.status(400).json({ msg: "Invalid age" });
    }

    if (!ALLOWED_GENDERS.includes(gender)) {
      return res.status(400).json({ msg: "Invalid gender" });
    }

    // 🔥 STEP 1: GET USER FIRST
    const existingUser = await User.findById(userId);

    if (!existingUser) {
      return res.status(404).json({ msg: "User not found" });
    }

    // 🔥 STEP 2: FORCE CONVERT GUEST → HIRER
    if (existingUser.isGuest) {
      existingUser.isGuest = false;
      existingUser.role = "hirer";
      await existingUser.save();
    }

    // 🔥 STEP 3: HANDLE IMAGE
    let profileImage = existingUser.profileImage || null;

    console.log("BODY =>", req.body);
console.log("FILE =>", req.file);

    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "profile_images",
        public_id: `user_${userId}_${Date.now()}`,
      });

      profileImage = result.secure_url;
    }

    // 🔥 STEP 4: AVATAR
    const avatarInitial = firstName.charAt(0).toUpperCase();
    const avatarColor = getAvatarColor(firstName);

    // 🔥 STEP 5: UPDATE USER
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        firstName,
        lastName,
        age: ageNum,
        gender,
        genderLabel,
        profileImage,
        avatarInitial,
        avatarColor,
        isGuest: false,
        onboardingStep: "completed",
        role: "hirer", // ✅ ENSURE ROLE IS SET
      },
      { new: true }
    );

    res.json({ msg: "Account completed", user: updatedUser });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};

/* POSTMARK CLIENT */
const postmarkClient = new postmark.ServerClient(process.env.POSTMARK_API_TOKEN);

export const sendOtp = async (req, res) => {
  try {
    let { email } = req.body;

    if (!email) {
      return res.status(400).json({
        msg: "Email is required",
      });
    }

    email = email.toLowerCase().trim();

    // ==========================================================
    // EMAIL VALIDATION
    // ==========================================================

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        msg: "Invalid email address",
      });
    }

    // ==========================================================
    // CHECK EXISTING USER
    // ==========================================================

    const existingUser = await User.findOne({
      email,
    });

    if (existingUser) {
      return res.status(400).json({
        msg: "Email already registered",
      });
    }

    // ==========================================================
    // SEND OTP
    // ==========================================================

    await sendOtpEmail(
      email,
      "Signup OTP",
    );

    return res.status(200).json({
      success: true,
      msg: "OTP sent successfully",

      // This tells Flutter that a new
      // 60-second cooldown has started.
      cooldownSeconds: 60,
    });

  } catch (err) {
    console.error(
      "sendOtp error:",
      err.message,
    );

    // ==========================================================
    // OTP COOLDOWN
    // ==========================================================

    if (err.code === "OTP_COOLDOWN") {
      return res.status(429).json({
        success: false,

        msg:
          "Please wait before requesting another OTP",

        retryAfterSeconds:
          err.retryAfterSeconds || 1,
      });
    }

    // ==========================================================
    // OTHER ERRORS
    // ==========================================================

    return res.status(400).json({
      success: false,
      msg:
        err.message ||
        "Failed to send OTP",
    });
  }
};

export const getCurrentUser = async (req, res) => {
  try {
    const userId = req.user?.id; // ✅ FIXED

    if (!userId) {
      return res.status(401).json({ msg: 'Unauthorized' });
    }

  const user = await User.findById(userId).select(
`
_id
firstName lastName age gender genderLabel email role
profession skills experience languages bio
profileImage
avatarInitial avatarColor
isGuest location onboardingStep isAvailable
ratingAverage ratingCount ratings
credits
welcomeBonusClaimed
subscriptionPlan
subscriptionStart
subscriptionEnd
professionType
`
);


    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    res.status(200).json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Internal Server Error' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email only
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    // Compare password
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    // 🔥 CHECK CURRENT SESSION GUEST
    const guestUser = await getGuestFromRequest(req);

    if (guestUser && guestUser._id.toString() !== user._id.toString()) {
      // ✅ DELETE OLD GUEST ACCOUNT
      await User.findByIdAndDelete(guestUser._id);
    }

    // Create JWT
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '10y' }
    );

    // Set auth cookie
    setAuthCookie(res, token, user);

    res.json({
      msg: 'Login successful',
      token,
      user: {
        _id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isGuest: user.isGuest,
        isVerified: user.isVerified,
        onboardingStep: user.onboardingStep,
        avatarInitial: user.avatarInitial,
        avatarColor: user.avatarColor,
      },
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Login error' });
  }
};

export const logout = (req, res) => {
  const isProduction = process.env.NODE_ENV === 'production';

  res.clearCookie('token', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'None' : 'Lax',
  });

  res.clearCookie('username', {
    httpOnly: false,
    secure: isProduction,
    sameSite: 'Lax',
  });

  res.clearCookie('userId', {
    httpOnly: false,
    secure: isProduction,
    sameSite: 'Lax',
  });

  res.status(200).json({ msg: 'Logout successful. Cookies cleared.' });
};

// Function to send OTP for password reset
export const sendOtpForgotPassword = async (req, res) => {
  try {
    let { email } = req.body;

    email = email.toLowerCase().trim();

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: "Email not found" });
    }

    await sendOtpEmail(email, "Reset Password OTP");

    res.json({ msg: "OTP sent successfully" });

  } catch (err) {
    console.error("Forgot OTP error:", err.message);
    res.status(400).json({ msg: err.message });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ msg: 'All fields are required' });
    }

    const otpRecord = await OTP.findOne({ email, otp });
    if (!otpRecord) {
      return res.status(400).json({ msg: 'Invalid OTP' });
    }

    const otpAge = (Date.now() - otpRecord.createdAt) / 1000 / 60;
    if (otpAge > 5) {
      return res.status(400).json({ msg: 'OTP expired' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: 'User not found' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    await OTP.deleteMany({ email });

    res.json({ msg: 'Password reset successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Internal Server Error' });
  }
};


export const verifyOtpForgotPassword = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ msg: 'Email and OTP are required' });
    }

    const otpRecord = await OTP.findOne({ email, otp });
    if (!otpRecord) {
      return res.status(400).json({ msg: 'Invalid OTP' });
    }

    const otpAge = (Date.now() - otpRecord.createdAt) / 1000 / 60;
    if (otpAge > 5) {
      return res.status(400).json({ msg: 'OTP expired' });
    }

    return res.json({ msg: 'OTP verified successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Internal Server Error' });
  }
};



export const adminSignup = async (req, res) => {
  try {
    const { username, password, adminSecret } = req.body;

    if (!username || !password || !adminSecret) {
      return res.status(400).json({
        msg: "All fields required",
      });
    }

    if (adminSecret !== process.env.ADMIN_SECRET) {
      return res.status(403).json({
        msg: "Unauthorized admin access",
      });
    }

    const existingAdmin = await User.findOne({
      email: username,
    });

    if (existingAdmin) {
      return res.status(400).json({
        msg: "Admin already exists",
      });
    }

    const ownerExists = await User.findOne({
      role: "owner",
    });

    const hashedPassword = await bcrypt.hash(
      password,
      10,
    );

    let profileImage = null;

    /*
    UPLOAD IMAGE
    */

    if (req.file) {

      const result =
          await cloudinary.uploader.upload(
        req.file.path,
        {
          folder: "profile_images",
          public_id: `admin_${Date.now()}`,
        },
      );

      profileImage =
          result.secure_url;
    }

    /*
    CREATE ADMIN
    */

    const admin = new User({

      email: username,

      password: hashedPassword,

      role:
          ownerExists
              ? "admin"
              : "owner",

      isVerified: true,

      isGuest: false,

      onboardingStep: "completed",

      professionType: null,

      profileImage,

      avatarInitial: "A",

      avatarColor: "#1C1C1C",
    });

    await admin.save();

    /*
    GENERATE TOKEN
    */

    const token = jwt.sign(

      {
        id: admin._id,
        role: admin.role,
      },

      process.env.JWT_SECRET,

      {
        expiresIn: "10y",
      },
    );

    /*
    SET COOKIE
    */

    setAuthCookie(
      res,
      token,
      admin,
    );

    /*
    RESPONSE
    */

    res.status(201).json({

      msg:
          `${admin.role.toUpperCase()} account created`,

      token, // ✅ IMPORTANT FIX

      user: {

        _id: admin._id,

        email: admin.email,

        role: admin.role,

        isGuest: false,

        onboardingStep: "completed",

        avatarInitial:
            admin.avatarInitial,

        avatarColor:
            admin.avatarColor,

        profileImage:
            admin.profileImage,
      },
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      msg: "Server error",
    });
  }
};



export const adminLogin = async (req, res) => {

  try {

    const {
      username,
      password,
    } = req.body;

    /*
    VALIDATION
    */

    if (!username || !password) {

      return res.status(400).json({
        msg:
            "Username and password required",
      });
    }

    /*
    FIND ADMIN
    */

    const admin = await User.findOne({

      email: username,

      role: {
        $in: ["admin", "owner"],
      },

      isGuest: false,
    });

    if (!admin) {

      return res.status(403).json({
        msg:
            "Unauthorized admin access",
      });
    }

    /*
    PASSWORD CHECK
    */

    const match =
        await bcrypt.compare(
      password,
      admin.password,
    );

    if (!match) {

      return res.status(400).json({
        msg: "Invalid credentials",
      });
    }

    /*
    GENERATE TOKEN
    */

    const token = jwt.sign(

      {
        id: admin._id,
        role: admin.role,
      },

      process.env.JWT_SECRET,

      {
        expiresIn: "10y",
      },
    );

    /*
    SET COOKIE
    */

    setAuthCookie(
      res,
      token,
      admin,
    );

    /*
    RESPONSE
    */

    res.status(200).json({

      msg:
          "Admin login successful",

      token, // ✅ IMPORTANT FIX

      user: {

        _id: admin._id,

        email: admin.email,

        role: admin.role,

        isGuest: false,

        onboardingStep: "completed",

        avatarInitial:
            admin.avatarInitial,

        avatarColor:
            admin.avatarColor,

        profileImage:
            admin.profileImage,
      },
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      msg:
          "Admin login failed",
    });
  }
};


export const confirmEmailChange = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const userId = req.user.id;

    if (!email || !otp) {
      return res.status(400).json({ msg: 'Email and OTP required' });
    }

    // Verify OTP
    const otpRecord = await OTP.findOne({ email, otp });
    if (!otpRecord) {
      return res.status(400).json({ msg: 'Invalid OTP' });
    }

    // Check expiry
    const otpAge = (Date.now() - otpRecord.createdAt) / 60000;
    if (otpAge > 5) {
      return res.status(400).json({ msg: 'OTP expired' });
    }

    // Update user email
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    user.email = email;
    await user.save();

    // Cleanup OTP
    await OTP.deleteMany({ email });

    res.json({
      msg: 'Email updated successfully',
      email: user.email,
    });
  } catch (err) {
    console.error('Confirm email error:', err);
    res.status(500).json({ msg: 'Internal server error' });
  }
};


export const verifyToken = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ msg: 'No token provided' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ msg: 'Invalid token' });

    return res.status(200).json({ msg: 'Token is valid' });
  } catch (err) {
    return res.status(401).json({ msg: 'Invalid or expired token' });
  }
};


export const deleteAccount = async (req, res) => {
  try {
    const userId = req.user.id;
    const { reason, description } = req.body;

    if (!reason) {
      return res.status(400).json({ msg: "Reason required" });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    /* SAVE DELETE REASON */
    await DeleteReason.create({
      userId: user._id,
      role: user.role,
      email: user.email,
      reason,
      description
    });

    /* DELETE MEDIA */
    await Media.deleteMany({
      $or: [
        { owner: userId },
        { userId: userId }
      ]
    });

    /* DELETE USER */
    await User.findByIdAndDelete(userId);

    /* CLEAR COOKIES */
    res.clearCookie("token");
    res.clearCookie("username");
    res.clearCookie("userId");

    res.json({
      msg: "Account deleted successfully"
    });

  } catch (err) {
    console.error("Delete account error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};


// authController.js
export const createGuestUser = async (req, res) => {
  try {

    const guestEmail =
      `guest_${Date.now()}_${Math.floor(Math.random() * 10000)}@guest.local`;

    const guestUser = new User({
      email: guestEmail,
      role: 'guest',
      isGuest: true,
      isVerified: false,
      onboardingStep: "completed",
      professionType: "guest",
      avatarInitial: 'G',
      avatarColor: '#999999',
    });

    await guestUser.save();

    const token = jwt.sign(
      {
        id: guestUser._id,
        role: 'guest'
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '10y'
      }
    );

    setAuthCookie(res, token, guestUser);

    // ✅ IMPORTANT FIX
    res.status(201).json({
      msg: 'Guest created',

      token, // ✅ ADD THIS

      user: {
        _id: guestUser._id,
        role: guestUser.role,
      },
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      msg: 'Guest creation failed'
    });
  }
};

// authController.js
export const verifyOldPassword = async (req, res) => {

  try {

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        msg: "User not found",
      });
    }

    const match = await bcrypt.compare(
      req.body.oldPassword,
      user.password,
    );

    if (!match) {
      return res.status(400).json({
        msg: "Incorrect old password",
      });
    }

    res.json({
      msg: "Old password verified",
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      msg: "Server error",
    });
  }
};

// Enhanced search location method with additional checks
export const saveUserLocation = async (req, res) => {
  try {
    const userId = req.user.id; // Get user ID from authenticated request
    const { latitude, longitude } = req.body; // Get latitude and longitude from the request body

    if (latitude == null || longitude == null) {
      return res.status(400).json({ msg: "Latitude & longitude required" });
    }

    // Update the user's location
    const user = await User.findByIdAndUpdate(
      userId,
      {
        location: {
          type: "Point", // GeoJSON type for point
          coordinates: [longitude, latitude], // [longitude, latitude]
        },
      },
      { new: true } // Return the updated user document
    );

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    return res.json({
      msg: "Location saved successfully",  
      location: user.location,            
    });
  } catch (err) {
    console.error("Save location error:", err);
    res.status(500).json({ msg: "Server error" }); 
  }
};


export const createEmployeeAccount = async (req, res) => {
  try {
    const userId = req.user.id;

    const {
      firstName,
      lastName,
      age,
      gender,
      genderLabel,
      profession,
      professionType,
      skills,
      experience,
      bio,
      languages,
    } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    // ✅ FORCE CONVERT GUEST → EMPLOYEE (ADD HERE)
    if (user.isGuest) {
      user.isGuest = false;
      user.role = "employee";
      await user.save();
    }

    const updateData = {
      firstName,
      lastName,
      age: Number(age),
      gender,
      genderLabel,
      skills,
      experience: Number(experience),
      bio,
      languages: languages
  ? languages.split(",").map((l) => l.trim())
  : [],
      avatarInitial: firstName.charAt(0).toUpperCase(),
      avatarColor: getAvatarColor(firstName),
      role: "employee",        // still keep (safe)
      isGuest: false,          // still keep (safe)
      onboardingStep: "completed",
    };

    // Only update profession if changed
    if (profession && profession !== user.profession) {
      updateData.profession = profession;
      updateData.professionType = professionType || "offline";
    }

    // ✅ Upload profile image if exists
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "profile_images",
        public_id: `user_${userId}_${Date.now()}`,
      });

      updateData.profileImage = result.secure_url;
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
    });

    res.json({
      msg: "Employee profile updated successfully",
      user: updatedUser,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};



export const toggleAvailability = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ msg: "User not found" });

    if (user.role !== "employee") {
      return res.status(403).json({ msg: "Only employees can go live" });
    }

    user.isAvailable = !user.isAvailable;
    await user.save();

    // 🔴🟢 NOTIFY ALL HIRERS
    io.emit("employee-availability-changed", {
      employeeId: user._id,
      profession: user.profession,
      isAvailable: user.isAvailable,
    });

    res.json({
      msg: user.isAvailable ? "You are LIVE now" : "You are OFFLINE now",
      isAvailable: user.isAvailable,
    });
  } catch (err) {
    console.error("Toggle availability error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};


export const rateEmployee = async (req, res) => {
  try {
    const hirerId = req.user.id;
    const hirer = await User.findById(hirerId);

    if (!hirer) return res.status(404).json({ msg: "User not found" });

    // ✅ Prevent guests from rating
    if (hirer.isGuest) {
      return res.status(403).json({ msg: "Guests cannot rate employees" });
    }

    const { employeeId, rating } = req.body;
    if (!employeeId || rating == null) {
      return res.status(400).json({ msg: "Employee and rating required" });
    }

    if (rating < 0.5 || rating > 5) {
      return res.status(400).json({ msg: "Rating must be between 0.5 and 5" });
    }

    if (Math.round(rating * 2) / 2 !== rating) {
      return res.status(400).json({ msg: "Rating must be in 0.5 steps" });
    }

    const employee = await User.findById(employeeId);

    if (!employee || employee.role !== "employee") {
      return res.status(404).json({ msg: "Employee not found" });
    }

    const existingRating = employee.ratings.find(
      r => r.hirer.toString() === hirerId
    );

    if (existingRating) {
      existingRating.value = rating;
    } else {
      employee.ratings.push({ hirer: hirerId, value: rating });
    }

    // Recalculate average
    const total = employee.ratings.reduce((sum, r) => sum + r.value, 0);
    employee.ratingCount = employee.ratings.length;
    employee.ratingAverage = Number((total / employee.ratingCount).toFixed(1));

    await employee.save();

    io.to(`profile-${employeeId}`).emit("employee-rating-updated", {
      employeeId: employee._id,
      ratingAverage: employee.ratingAverage,
      ratingCount: employee.ratingCount,
    });

    res.json({
      msg: "Rating saved",
      ratingAverage: employee.ratingAverage,
      ratingCount: employee.ratingCount,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};

export const getEmployeeProfile = async (req, res) => {
  try {
    const hirerId = req.user.id;

    const employee = await User.findById(req.params.id);

    if (!employee) {
      return res.status(404).json({ msg: "Employee not found" });
    }

    const myRating = employee.ratings.find(
      r => r.hirer.toString() === hirerId
    );

    res.json({
      firstName: employee.firstName,
      lastName: employee.lastName,
      age: employee.age,
      gender: employee.gender,
      profession: employee.profession,
      skills: employee.skills,
      experience: employee.experience,
      languages: employee.languages,
      bio: employee.bio,
      profileImage: employee.profileImage,

      ratingAverage: employee.ratingAverage,
      ratingCount: employee.ratingCount,

      currentUserRating: myRating ? myRating.value : 0
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};


export const updateHirerAccount = async (req, res) => {
  try {
    const userId = req.user.id;

    // ✅ ADD genderLabel
    const { firstName, lastName, age, gender, genderLabel } = req.body;

    const updateData = {};

    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (age) updateData.age = Number(age);

  // ✅ correct condition (important fix)
if (gender !== undefined) {
  updateData.gender = gender;
}

if (genderLabel !== undefined) {
  updateData.genderLabel = genderLabel;
}

    // ✅ IMAGE UPLOAD
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "profile_images",
        public_id: `user_${userId}_${Date.now()}`,
      });

      updateData.profileImage = result.secure_url;
    }

    // ✅ AVATAR UPDATE
    if (firstName) {
      updateData.avatarInitial = firstName.charAt(0).toUpperCase();
      updateData.avatarColor = getAvatarColor(firstName);
    }

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true }
    );

    res.json({
      msg: "Profile updated successfully",
      user
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};

/* ===============================
   SEND OTP TO CURRENT EMAIL
================================ */
export const sendOtpToCurrentEmail = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    await sendOtpEmail(user.email, "Security Verification OTP");

    res.json({ msg: "OTP sent" });

  } catch (err) {
    console.error("Current email OTP error:", err.message);
    res.status(400).json({ msg: err.message });
  }
};



/* ===============================
   VERIFY CURRENT EMAIL OTP
================================ */
export const verifyCurrentEmailOtp = async (req, res) => {
  try {
    const userId = req.user.id;

    const { otp } = req.body;

    const user = await User.findById(userId);

    const otpRecord = await OTP.findOne({
      email: user.email,
      otp,
    });

    if (!otpRecord) {
      return res.status(400).json({ msg: "Invalid OTP" });
    }

    const age = (Date.now() - otpRecord.createdAt) / 60000;

    if (age > 5) {
      return res.status(400).json({ msg: "OTP expired" });
    }

    res.json({ msg: "OTP verified" });

  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
};



/* ===============================
   SEND OTP TO NEW EMAIL
================================ */
export const sendOtpToNewEmail = async (req, res) => {
  try {
    let { newEmail } = req.body;

    newEmail = newEmail.toLowerCase().trim();

    const existing = await User.findOne({ email: newEmail });
    if (existing) {
      return res.status(400).json({ msg: "Email already used" });
    }

    await sendOtpEmail(newEmail, "Verify New Email");

    res.json({ msg: "OTP sent" });

  } catch (err) {
    console.error("New email OTP error:", err.message);
    res.status(400).json({ msg: err.message });
  }
};



/* ===============================
   CONFIRM EMAIL CHANGE
================================ */
export const changeEmail = async (req, res) => {
  try {

    const userId = req.user.id;
    const { newEmail, otp } = req.body;

    const otpRecord = await OTP.findOne({
      email: newEmail,
      otp,
    });

    if (!otpRecord) {
      return res.status(400).json({ msg: "Invalid OTP" });
    }

    const age = (Date.now() - otpRecord.createdAt) / 60000;

    if (age > 5) {
      return res.status(400).json({ msg: "OTP expired" });
    }

    const user = await User.findById(userId);

    user.email = newEmail;

    await user.save();

    await OTP.deleteMany({ email: newEmail });

    res.json({
      msg: "Email changed successfully",
      email: user.email,
    });

  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
};

/* ===============================
   CHANGE PASSWORD USING OLD PASSWORD
================================ */

export const changePasswordWithOld = async (req, res) => {
  try {

    const userId = req.user.id;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ msg: "Old password and new password required" });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    const match = await bcrypt.compare(oldPassword, user.password);

    if (!match) {
      return res.status(400).json({ msg: "Incorrect old password" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;

    await user.save();

    res.json({ msg: "Password updated successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};


export const updateEmployeeProfileImage = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({ msg: "Image required" });
    }

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "profile_images",      // folder in Cloudinary
      public_id: `user_${userId}_${Date.now()}`, 
      overwrite: true,
      transformation: [{ width: 500, height: 500, crop: "fill" }],
    });

    // Update user's profileImage with Cloudinary URL
    const user = await User.findByIdAndUpdate(
      userId,
      { profileImage: result.secure_url },
      { new: true }
    );

    res.json({
      msg: "Profile image updated",
      profileImage: user.profileImage,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};

export const getNearbyOfflineEmployees = async (req, res) => {
  try {
    const userId = req.user.id;

    const hirer = await User.findById(userId);

    if (!hirer || !hirer.location || !hirer.location.coordinates) {
      return res.json({ employees: [] });
    }

    const [lng, lat] = hirer.location.coordinates;

    // 🔍 Search within 20km first
    let employees = await User.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [lng, lat],
          },
          distanceField: "distance",
          maxDistance: 20000, // 20km
          spherical: true,
        },
      },
      {
        $match: {
          role: "employee",
          isAvailable: false,
          professionType: "offline",
        },
      },
      {
        $addFields: {
          distanceKm: {
            $round: [{ $divide: ["$distance", 1000] }, 1],
          },
        },
      },
      {
        $limit: 50,
      },
    ]);

    if (employees.length === 0) {
  employees = await User.aggregate([
    {
      $geoNear: {
        near: { type: "Point", coordinates: [lng, lat] },
        distanceField: "distance",
        maxDistance: 50000, // 50km
        spherical: true,
      },
    },
    {
      $match: {
        role: "employee",
        isAvailable: false,
       professionType: "offline",
      },
    },
    {
      $addFields: {
        distanceKm: { $round: [{ $divide: ["$distance", 1000] }, 1] },
      },
    },
    { $limit: 50 },
  ]);
}

    res.json({ employees });

  } catch (err) {
    console.error("Nearby employees error:", err);
    res.status(500).json({ msg: "Server error" });
  }
}

export const translateHandler = async (req, res) => {
  try {
    const { text, target } = req.body;

    if (!text || !target) {
      return res.status(400).json({ msg: "Text and target required" });
    }

    const normalizedText = text.trim().toLowerCase();

    const professions = await Profession.find({});

    let foundProfession = null;

    for (const prof of professions) {

      // ✅ check name
      if (prof.name?.toLowerCase() === normalizedText) {
        foundProfession = prof;
        break;
      }

      // ✅ FIX: Map access using .get()
      if (prof.translations && prof.translations.size > 0) {

        for (const [lang, value] of prof.translations.entries()) {

          if (value && value.toLowerCase() === normalizedText) {
            foundProfession = prof;
            break;
          }

        }

      }

      if (foundProfession) break;
    }

    // ✅ FIX: Map access using .get()
    if (foundProfession && foundProfession.translations?.get(target)) {
      return res.json({
        translated: foundProfession.translations.get(target),
      });
    }

    return res.json({
      translated: text,
    });

  } catch (err) {
    console.error("🔥 Translation Error:", err); // 👈 CHECK THIS IN RENDER LOGS
    res.status(500).json({ msg: "Translation failed" });
  }
};


export const updateUserLanguage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { language } = req.body;

    if (!language) {
      return res.status(400).json({ msg: "Language required" });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { preferredLanguage: language },
      { new: true }
    );

    res.json({
      msg: "Language updated",
      preferredLanguage: user.preferredLanguage,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};

// Get current user's credit balance
export const getUserCredits = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId).select("credits");

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    res.json({ credits: user.credits });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};

export const claimWelcomeBonus = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    if (user.welcomeBonusClaimed) {
      return res.status(400).json({ msg: "Already claimed" });
    }

    user.credits += 10;
    user.welcomeBonusClaimed = true;

    await user.save();

    await CreditTransaction.create({
    userId: user._id,
    type: "WELCOME_BONUS",
    credits: 10,
    description: "Welcome Bonus",
});

    res.json({
      msg: "Bonus claimed",
      credits: user.credits
    });

  } catch (err) {
    res.status(500).json({ msg: "Server error" });
  }
};


export const selectRole = async (req, res) => {
  try {
    const { role } = req.body;

    if (!["employee", "hirer"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role",
      });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.role = role;

    if (role === "employee") {
      user.onboardingStep = "employee_profile";
    } else {
      user.onboardingStep = "hirer_profile";
    }

    await user.save();

    res.json({
      success: true,
      onboardingStep: user.onboardingStep,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
