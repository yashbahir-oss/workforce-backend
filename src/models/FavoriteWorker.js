import mongoose from 'mongoose';

// A small relation model keeps customer favorites persistent and reusable across devices.
const schema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  worker: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
}, { timestamps: true });

schema.index({ customer: 1, worker: 1 }, { unique: true });
export default mongoose.model('FavoriteWorker', schema);
