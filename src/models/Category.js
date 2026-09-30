import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, unique: true },
  slug: { type: String, required: true, trim: true, unique: true },
  description: { type: String, default: '' },
  icon: { type: String, default: '' },
  imageUrl: { type: String, default: '' },
  active: { type: Boolean, default: true, index: true }
}, { timestamps: true });
export default mongoose.model('Category', schema);
