import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, trim: true },
  active: { type: Boolean, default: true, index: true }
}, { timestamps: true });
schema.index({ category: 1, slug: 1 }, { unique: true });
export default mongoose.model('Skill', schema);
