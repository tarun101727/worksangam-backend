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



const NAME_REGEX = /^[A-Za-z]{2,30}$/;
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
    const { email, password, otp, role } = req.body;

    if (!email || !otp || !password || !role) {
      return res.status(400).json({ msg: 'Email, password, OTP and role required' });
    }

    if (!['hirer', 'employee'].includes(role)) {
      return res.status(400).json({ msg: 'Invalid role' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // ✅ ADDED CODE (as requested)
    const otpRecord = await OTP.findOne({
      email: normalizedEmail,
      otp,
    });

    if (!otpRecord) {
      return res.status(400).json({ msg: 'Invalid or expired OTP' });
    }

    const isExpired =
      Date.now() - otpRecord.createdAt.getTime() > 5 * 60 * 1000;

    if (isExpired) {
      return res.status(400).json({ msg: 'OTP expired' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      email: normalizedEmail,
      password: hashedPassword,
      role,
      isVerified: true,
      isGuest: true,
      onboardingStep:
        role === 'employee' ? 'employee_profile' : 'hirer_profile',
    });

    await OTP.deleteMany({ email: normalizedEmail });

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '10y' }
    );

    setAuthCookie(res, token, user);

    res.json({
      msg: 'OTP verified',
      userId: user._id,
      role: user.role,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};


export const createAccount = async (req, res) => {
  try {
    const userId = req.user.id;
    const { firstName, lastName, age, gender } = req.body;

    if (!NAME_REGEX.test(firstName)) {
      return res.status(400).json({ msg: "Invalid first name" });
    }

    if (!NAME_REGEX.test(lastName)) {
      return res.status(400).json({ msg: "Invalid last name" });
    }

    const ageNum = Number(age);
    if (!Number.isInteger(ageNum) || ageNum < MIN_AGE || ageNum > MAX_AGE) {
      return res.status(400).json({ msg: "Invalid age" });
    }

    if (!ALLOWED_GENDERS.includes(gender)) {
      return res.status(400).json({ msg: "Invalid gender" });
    }

    const profileImage = req.file
      ? `/uploads/avatars/${req.file.filename}`
      : null;

    const avatarInitial = firstName.charAt(0).toUpperCase();
    const avatarColor = getAvatarColor(firstName);

    const user = await User.findByIdAndUpdate(
      userId,
      {
        firstName,
        lastName,
        age: ageNum,
        gender,
        profileImage,
        avatarInitial,
        avatarColor,
        isGuest: false,
        onboardingStep: "completed",
      },
      { new: true }
    );

    res.json({ msg: "Account completed", user });
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
    console.log("📩 Received send OTP request:", email);

    email = email.toLowerCase().trim();

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ msg: "Invalid email address" });
    }

    // Prevent duplicate accounts
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ msg: "Email already registered" });
    }

    // OTP rate limit (1 per minute)
    const recentOtp = await OTP.findOne({
      email,
      createdAt: { $gt: new Date(Date.now() - 60 * 1000) },
    });
    if (recentOtp) {
      return res.status(429).json({ msg: "Please wait before requesting another OTP" });
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log("🔢 Generated OTP:", otp);

    await OTP.create({ email, otp, createdAt: new Date() });

    // Send OTP via Postmark
    await postmarkClient.sendEmail({
      From: "info@yourdomain.com", // must be a verified domain email
      To: email,
      Subject: "Your OTP Code",
      HtmlBody: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>Your OTP for Worksangam</h2>
          <h1 style="letter-spacing: 3px;">${otp}</h1>
          <p>This OTP is valid for 5 minutes.</p>
          <p>If you did not request this, ignore this email.</p>
        </div>
      `,
      TextBody: `Your OTP is ${otp}. Valid for 5 minutes.`,
    });

    console.log("✅ OTP sent via Postmark to:", email);
    res.json({ msg: "OTP sent successfully" });
  } catch (err) {
    console.error("❌ sendOtp error:", err);
    res.status(500).json({ msg: "Internal Server Error" });
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
  firstName lastName age gender email role
  profession skills experience languages bio
  profileImage
  avatarInitial avatarColor
  isGuest location onboardingStep isAvailable ratingAverage ratingCount ratings
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
  user: {
    _id: user._id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    isGuest: user.isGuest,          // ✅ IMPORTANT
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
  res.clearCookie('token');
  res.clearCookie('username');
  res.clearCookie('userId');
  res.status(200).json({ msg: 'Logout successful. Cookies cleared.' });
};

// Function to send OTP for password reset
export const sendOtpForgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Check if email exists
    const existingUser = await User.findOne({ email });
    if (!existingUser) {
      return res.status(400).json({ msg: 'Email not found.' });
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP temporarily in the database
    const otpRecord = new OTP({
      email,
      otp,
      createdAt: new Date(),
    });
    await otpRecord.save();

    // Send OTP email (same as above)
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
  from: '"Sunanta Jewellery" <gaddamtarun157@gmail.com>',
  to: email,
  subject: 'Your OTP for Sunanta Jewellery Signup',
  html: `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2 style="color: #b8860b;">Sunanta Jewellery</h2>
      <p>Thank you for choosing <strong>Sunanta Jewellery</strong>.</p>
      <p>Your One-Time Password (OTP) for account signup is:</p>

      <h1 style="letter-spacing: 3px;">${otp}</h1>

      <p>This OTP is valid for 5 minutes.</p>

      <p>If you did not request this, please ignore this email.</p>

      <hr />
      <p style="font-size: 12px; color: #777;">
        © ${new Date().getFullYear()} Sunanta Jewellery. All rights reserved.
      </p>
    </div>
  `,
};

    await transporter.sendMail(mailOptions);

    res.json({ msg: 'OTP sent to your email' });
  } catch (err) {
    console.error('Error sending OTP:', err);
    res.status(500).json({ msg: 'Internal Server Error' });
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
      return res.status(400).json({ msg: 'All fields required' });
    }

    if (adminSecret !== process.env.ADMIN_SECRET) {
      return res.status(403).json({ msg: 'Unauthorized admin access' });
    }

    const existingAdmin = await User.findOne({ email: username });
    if (existingAdmin) {
      return res.status(400).json({ msg: 'Admin already exists' });
    }

    const ownerExists = await User.findOne({ role: 'owner' });
    const hashedPassword = await bcrypt.hash(password, 10);

    const profileImage = req.file
      ? `/uploads/avatars/${req.file.filename}`
      : null;

    const admin = new User({
      email: username,
      password: hashedPassword,
      role: ownerExists ? 'admin' : 'owner',
      isVerified: true,
      isGuest: false,

      // ✅ IMPORTANT FIX
      onboardingStep: null,
      professionType: null,

      profileImage,
      avatarInitial: 'A',
      avatarColor: '#1C1C1C',
    });

    await admin.save();

    const token = jwt.sign(
      { id: admin._id, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: '10y' }
    );

    setAuthCookie(res, token, admin);

    res.status(201).json({
      msg: `${admin.role.toUpperCase()} account created`,
      user: admin,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};



export const adminLogin = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ msg: "Username and password required" });
    }

    // 🔎 FIND ADMIN ONLY
    const admin = await User.findOne({
      email: username,
      role: { $in: ["admin", "owner"] },
      isGuest: false,
    });

    if (!admin) {
      return res.status(403).json({ msg: "Unauthorized admin access" });
    }

    const match = await bcrypt.compare(password, admin.password);
    if (!match) {
      return res.status(400).json({ msg: "Invalid credentials" });
    }

    const token = jwt.sign(
  { id: admin._id, role: admin.role },
  process.env.JWT_SECRET,
  { expiresIn: "10y" }
);


    setAuthCookie(res, token, admin);

    res.status(201).json({
  msg: `${admin.role.toUpperCase()} account created`,
  user: {
    _id: admin._id,
    email: admin.email,
    role: admin.role,
    isGuest: false,                 // 🔑 REQUIRED
    onboardingStep: "completed",    // 🔑 REQUIRED
    avatarInitial: admin.avatarInitial,
    avatarColor: admin.avatarColor,
  },
});


  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Admin login failed" });
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


export const createGuestUser = async (req, res) => {
  try {
    console.log("🌟 Guest creation endpoint hit");

    const guestEmail = `guest_${Date.now()}_${Math.floor(Math.random() * 10000)}@guest.local`;

    const guestUser = new User({
      email: guestEmail,
      role: 'guest',
      isGuest: true,
      isVerified: false,
      avatarInitial: 'G',
      avatarColor: '#999999',
      onboardingStep: 'completed',
    });

    console.log("🌟 Guest object:", guestUser);

    await guestUser.save();
    console.log("✅ Guest saved in DB:", guestUser._id);

    const token = jwt.sign(
      { id: guestUser._id, role: 'guest' },
      process.env.JWT_SECRET,
      { expiresIn: '10y' }
    );

    const tenYearsInMs = 10 * 365 * 24 * 60 * 60 * 1000;
    const isProduction = process.env.NODE_ENV === 'production';

    res.cookie('token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'None' : 'Lax',
      maxAge: tenYearsInMs,
    });

    res.cookie('username', guestUser.email, {
      httpOnly: false,
      secure: isProduction,
      sameSite: isProduction ? 'None' : 'Lax',
      maxAge: tenYearsInMs,
    });

    res.cookie('userId', guestUser._id.toString(), {
      httpOnly: false,
      secure: isProduction,
      sameSite: isProduction ? 'None' : 'Lax',
      maxAge: tenYearsInMs,
    });

    res.status(201).json({
      msg: 'Guest created',
      user: {
        _id: guestUser._id,
        role: guestUser.role,
        isGuest: guestUser.isGuest,
        avatarInitial: guestUser.avatarInitial,
        avatarColor: guestUser.avatarColor,
      },
    });

  } catch (err) {
    console.error("❌ Guest creation failed:", err);
    res.status(500).json({ msg: 'Guest creation failed' });
  }
};

// authController.js
export const verifyOldPassword = async (req, res) => {
  const user = await User.findById(req.user.id);
  const match = await bcrypt.compare(req.body.oldPassword, user.password);

  if (!match) {
    return res.status(400).json({ msg: "Incorrect old password" });
  }

  res.json({ msg: "Old password verified" });
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
      profession,
      professionType, // from frontend
      skills,
      experience,
      bio,
      languages,
    } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    const updateData = {
      firstName,
      lastName,
      age: Number(age),
      gender,
      skills,
      experience: Number(experience),
      bio,
      languages: languages.split(",").map((l) => l.trim()),
      avatarInitial: firstName.charAt(0).toUpperCase(),
      avatarColor: getAvatarColor(firstName),
      role: "employee",
      isGuest: false,
      onboardingStep: "completed",
    };

    // Only update profession and professionType if profession changed
    if (profession && profession !== user.profession) {
      updateData.profession = profession;
      updateData.professionType = professionType || "offline"; // fallback if frontend sends nothing
    }

    if (req.file) {
      updateData.profileImage = `/uploads/avatars/${req.file.filename}`;
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
    const { employeeId, rating } = req.body;

    if (!employeeId || !rating) {
      return res.status(400).json({ msg: "Employee and rating required" });
    }

    if (rating < 0.5 || rating > 5) {
      return res.status(400).json({ msg: "Rating must be between 0.5 and 5" });
    }

    if (rating % 0.5 !== 0) {
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
      employee.ratings.push({
        hirer: hirerId,
        value: rating
      });
    }

    /* CALCULATE AVERAGE */
    const total = employee.ratings.reduce((sum, r) => sum + r.value, 0);

    employee.ratingCount = employee.ratings.length;
    employee.ratingAverage = Number(
      (total / employee.ratingCount).toFixed(1)
    );

    await employee.save();

    /* 🔥 LIVE SOCKET UPDATE */
    io.to(`profile-${employeeId}`).emit("employee-rating-updated", {
      employeeId: employee._id,
      ratingAverage: employee.ratingAverage,
      ratingCount: employee.ratingCount,
    });

    res.json({
      msg: "Rating saved",
      ratingAverage: employee.ratingAverage,
      ratingCount: employee.ratingCount
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

    const { firstName, lastName, age, gender } = req.body;

    const updateData = {};

    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (age) updateData.age = Number(age);
    if (gender) updateData.gender = gender;

    if (req.file) {
      updateData.profileImage = `/uploads/avatars/${req.file.filename}`;
    }

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
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ msg: "User not found" });

    const email = user.email;

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await OTP.create({
      email,
      otp,
      createdAt: new Date(),
    });

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Sunanta Jewellery" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Security verification OTP",
      html: `<h2>Your OTP is</h2><h1>${otp}</h1><p>Valid for 5 minutes</p>`,
    });

    res.json({ msg: "OTP sent to your email" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
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
    const { newEmail } = req.body;

    const existing = await User.findOne({ email: newEmail });

    if (existing) {
      return res.status(400).json({ msg: "Email already used" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await OTP.create({
      email: newEmail,
      otp,
      createdAt: new Date(),
    });

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Sunanta Jewellery" <${process.env.EMAIL_USER}>`,
      to: newEmail,
      subject: "Verify new email",
      html: `<h2>Your OTP is</h2><h1>${otp}</h1><p>Valid for 5 minutes</p>`,
    });

    res.json({ msg: "OTP sent to new email" });

  } catch (err) {
    res.status(500).json({ msg: "Server error" });
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

    const imagePath = `/uploads/avatars/${req.file.filename}`;

    const user = await User.findByIdAndUpdate(
      userId,
      { profileImage: imagePath },
      { new: true }
    );

    res.json({
      msg: "Profile image updated",
      profileImage: user.profileImage
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
};
