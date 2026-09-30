import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true, index: true },
  worker: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  note: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'accepted', 'rejected', 'withdrawn'], default: 'pending', index: true }
}, { timestamps: true });
schema.index({ job: 1, worker: 1 }, { unique: true });
export default mongoose.model('Application', schema);
