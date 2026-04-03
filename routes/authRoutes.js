import express from 'express';
const router = express.Router();
import {
  signup,
  login,
  sendOtpForgotPassword,
  resetPassword,
adminSignup ,
verifyToken,
logout,
deleteAccount,
getCurrentUser,
  sendOtp,       
  verifyOtp,
  verifyOtpForgotPassword,
  createGuestUser,
  confirmEmailChange,
  verifyOldPassword,
  adminLogin,
  createAccount,
  saveUserLocation,
  createEmployeeAccount,
  toggleAvailability,
  rateEmployee,
  getEmployeeProfile,
  updateHirerAccount,
  changeEmail,
  sendOtpToNewEmail,
  verifyCurrentEmailOtp,
  sendOtpToCurrentEmail,
  changePasswordWithOld,
  updateEmployeeProfileImage,
  getNearbyOfflineEmployees,
  translateHandler,
} from '../controllers/authController.js'
import dotenv from 'dotenv';
dotenv.config(); // Make sure this is at the very top
import authMiddleware from '../middleware/authMiddleware.js';
import { requireAdmin } from '../middleware/adminRoleMiddleware.js';
import { uploadAvatar } from '../middleware/upload.js';
import { changeUserRole, getAdminStats, getAllUsers, toggleUserDisable } from '../controllers/adminController.js';
import { approveJob, getAllJobsForAdmin, rejectJob } from '../controllers/adminJobController.js';
import { getReports, resolveReport } from '../controllers/adminReportController.js';
import { getAdminLogs } from '../controllers/adminLogController.js';


function adminSecretMiddleware(req, res, next) {
  console.log('Received header x-admin-secret:', req.headers['x-admin-secret']);
  console.log('Backend expected ADMIN_SECRET:', process.env.ADMIN_SECRET); // ✅ correct


  if (req.headers['x-admin-secret'] !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ msg: 'Forbidden: Invalid admin secret' });
  }
  next();
}

router.post('/guest', createGuestUser);


router.post(
  '/admin/signup',
  uploadAvatar.single('profileImage'),
  adminSignup
);


router.post("/admin/login", adminLogin);


router.get(
  '/admin/dashboard',
  authMiddleware,
  requireAdmin,
  (req, res) => {
    res.json({ msg: 'Welcome Admin 👑' });
  }
);

router.get('/verify-token', authMiddleware ,verifyToken);

router.post('/send-otp', sendOtp);
router.post(
  '/verify-otp',
  verifyOtp
);

router.post(
  '/create-account',
  authMiddleware,
  uploadAvatar.single('profileImage'),
  createAccount
);

router.post(
  "/create-employee-account",
  authMiddleware,
  uploadAvatar.single("profileImage"),
  createEmployeeAccount
);

router.post(
  '/confirm-email-change',
  authMiddleware,
  confirmEmailChange
);

router.post('/signup', signup); // ✅ Add multer upload

router.get('/get-current-user', authMiddleware, getCurrentUser);

router.post('/login', login);
router.post('/send-otp-forgot-password', sendOtpForgotPassword);
router.post('/reset-password', resetPassword);
// Verify OTP for Forgot Password
router.post('/verify-otp-forgot-password', verifyOtpForgotPassword);

router.post('/logout', authMiddleware, logout);

router.delete('/delete-account', authMiddleware, deleteAccount);


// authRoutes.js
router.post(
  "/verify-old-password",
  authMiddleware,
  verifyOldPassword
);

router.post(
  "/save-location",
  authMiddleware,
  saveUserLocation
);


router.post(
  "/toggle-availability",
  authMiddleware,
  toggleAvailability
);

router.get(
  "/admin/users",
  authMiddleware,
  requireAdmin,
  getAllUsers
);

router.get(
  "/admin/stats",
  authMiddleware,
  requireAdmin,
  getAdminStats
);

router.get(
  "/admin/users",
  authMiddleware,
  requireAdmin,
  getAllUsers
);

router.patch(
  "/admin/users/:id/toggle-disable",
  authMiddleware,
  requireAdmin,
  toggleUserDisable
);

router.patch(
  "/admin/users/:id/role",
  authMiddleware,
  requireAdmin,
  changeUserRole
);

router.patch(
  "/admin/jobs/:id/approve",
  authMiddleware,
  requireAdmin,
  approveJob
);

router.patch(
  "/admin/jobs/:id/reject",
  authMiddleware,
  requireAdmin,
  rejectJob
);

router.get(
  "/admin/reports",
  authMiddleware,
  requireAdmin,
  getReports
);

router.patch(
  "/admin/reports/:id/resolve",
  authMiddleware,
  requireAdmin,
  resolveReport
);

router.get(
  "/admin/jobs",
  authMiddleware,
  requireAdmin,
  getAllJobsForAdmin
);

router.get(
  "/admin/logs",
  authMiddleware,
  requireAdmin,
  getAdminLogs
);

router.post(
  "/rate-employee",
  authMiddleware,
  rateEmployee
);

router.get("/employee/:id", authMiddleware, getEmployeeProfile);

router.put(
  "/update-hirer-account",
  authMiddleware,
  uploadAvatar.single("profileImage"),
  updateHirerAccount
);


/* EMAIL SECURITY */

router.post(
  "/security/send-current-email-otp",
  authMiddleware,
  sendOtpToCurrentEmail
);

router.post(
  "/security/verify-current-email-otp",
  authMiddleware,
  verifyCurrentEmailOtp
);

router.post(
  "/security/send-new-email-otp",
  authMiddleware,
  sendOtpToNewEmail
);

router.post(
  "/security/change-email",
  authMiddleware,
  changeEmail
);

router.post(
  "/change-password-old",
  authMiddleware,
  changePasswordWithOld
);

router.post(
  "/update-employee-profile-image",
  authMiddleware,
  uploadAvatar.single("profileImage"),
  updateEmployeeProfileImage
);

router.get(
  "/employees/nearby-offline",
  authMiddleware,
  getNearbyOfflineEmployees
);

router.post("/translate",  translateHandler);

export default router;
