export const requireAdmin = (req, res, next) => {
  if (!req.user || !['admin', 'owner'].includes(req.user.role)) {
    return res.status(403).json({ msg: 'Admin access only' });
  }
  next();
};

export const requireOwner = (req, res, next) => {
  if (!req.user || req.user.role !== 'owner') {
    return res.status(403).json({ msg: 'Owner access only' });
  }
  next();
};
