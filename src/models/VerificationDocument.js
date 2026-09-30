import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  worker: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['id', 'experience_certificate', 'skill_certificate', 'other'], required: true },
  fileName: { type: String, required: true },
  contentType: { type: String, required: true },
  size: { type: Number, default: 0 },
  storageKey: { type: String, default: '' },
  data: { type: Buffer, default: null },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
  adminNote: { type: String, default: '' }
}, { timestamps: true });
export default mongoose.model('VerificationDocument', schema);
