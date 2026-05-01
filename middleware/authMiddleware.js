import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import dotenv from 'dotenv';

dotenv.config();

const authMiddleware = async (req, res, next) => {
  let token;

  // 1️⃣ Check Authorization header first (Bearer <token>)
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // 2️⃣ Fallback to cookies for website users
  if (!token && req.cookies?.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({ msg: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) return res.status(404).json({ msg: 'User not found' });

    req.user = user;
    next();
  } catch (err) {
    console.error('Auth error:', err);
    return res.status(401).json({ msg: 'Token not valid' });
  }
};

export default authMiddleware;
