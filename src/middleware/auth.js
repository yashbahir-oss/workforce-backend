import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export async function auth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) return res.status(401).json({ message: 'Login required' });
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    req.user = await User.findById(payload.id).select('-otpHash');
    if (!req.user) return res.status(401).json({ message: 'Invalid session' });
    if (['blocked', 'inactive'].includes(req.user.status)) return res.status(403).json({ message: 'Account is not active' });
    next();
  } catch { return res.status(401).json({ message: 'Invalid or expired access token' }); }
}
export const requireRole = (...roles) => (req, res, next) => roles.includes(req.user?.role) ? next() : res.status(403).json({ message: 'Insufficient permissions' });
export const admin = requireRole('admin');
export const workerOnly = requireRole('worker');
export const customerOnly = requireRole('customer', 'user');
