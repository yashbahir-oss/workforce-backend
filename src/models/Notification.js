import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, default: 'system' },
  path: { type: String, default: '' },
  readAt: { type: Date, default: null }
}, { timestamps: true });
export default mongoose.model('Notification', schema);
