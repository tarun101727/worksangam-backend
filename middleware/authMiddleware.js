import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import dotenv from 'dotenv';

dotenv.config();

const authMiddleware = async (req, res, next) => {
  // Try cookie first
  let token = req.cookies?.token;

  // If no cookie, try Authorization header
  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ msg: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) return res.status(404).json({ msg: 'User not found' });

    req.user = user; // attach user to request
    next();
  } catch (err) {
    console.error('Auth error:', err);
    return res.status(401).json({ msg: 'Token not valid or expired' });
  }
};

export default authMiddleware;
