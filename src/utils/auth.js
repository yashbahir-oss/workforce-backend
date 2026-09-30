import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export const hashPassword = (password) => bcrypt.hash(password, 12);
export const checkPassword = (password, hash) => bcrypt.compare(password, hash);
export function createAccessToken(user) {
  return jwt.sign({ id: user._id.toString(), role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.ACCESS_TOKEN_TTL || '15m' });
}
export function hashToken(token) { return crypto.createHash('sha256').update(token).digest('hex'); }
export function createRefreshToken() { return crypto.randomBytes(48).toString('base64url'); }
export function publicUser(u) {
  return {
    id: u._id.toString(), name: u.name, email: u.email || '', mobile: u.mobile || '',
    age: u.age ?? null, gender: u.gender || '', role: u.role, status: u.status || 'active',
    profileImage: u.profileImageData?.length ? `/api/profile/image/${u._id}` : (u.profileImage || ''),
    verificationStatus: u.verificationStatus || undefined,
    verificationRejectionReason: u.verificationRejectionReason || undefined
  };
}
