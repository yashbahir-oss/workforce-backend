import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true, required: true },
  district: { type: String, trim: true },
  taluka: { type: String, trim: true },
  locality: { type: String, trim: true },
  organizationName: { type: String, trim: true, default: '' }
}, { timestamps: true });
export default mongoose.model('CustomerProfile', schema);
