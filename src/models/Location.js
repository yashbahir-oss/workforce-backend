import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  state: { type: String, required: true, trim: true, index: true },
  district: { type: String, required: true, trim: true, index: true },
  taluka: { type: String, required: true, trim: true, index: true },
  locality: { type: String, trim: true, default: '' },
  active: { type: Boolean, default: true }
}, { timestamps: true });
schema.index({ state: 1, district: 1, taluka: 1, locality: 1 }, { unique: true });
export default mongoose.model('Location', schema);
