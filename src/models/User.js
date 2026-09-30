import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, lowercase: true, trim: true, unique: true, sparse: true },
  mobile: { type: String, trim: true, unique: true, sparse: true },
  age: { type: Number, min: 18, max: 120 },
  gender: { type: String, enum: ['male', 'female', 'other'] },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['user', 'customer', 'worker', 'admin'], default: 'customer', index: true },
  status: { type: String, enum: ['active', 'inactive', 'blocked'], default: 'active', index: true },
  profileImage: { type: String, default: '' },
  profileImageData: { type: Buffer, default: null },
  profileImageContentType: { type: String, default: '' },
  otpHash: { type: String, default: '' },
  otpExpiresAt: { type: Date, default: null },
  lastLoginAt: { type: Date, default: null }
}, { timestamps: true });

export default mongoose.model('User', userSchema);
