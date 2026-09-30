import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
  categoryName: { type: String, default: '' },
  skills: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Skill' }],
  skillNames: [{ type: String, trim: true }],
  workersNeeded: { type: Number, min: 1, default: 1 },
  date: { type: Date, required: true },
  startTime: { type: String, default: '' },
  endTime: { type: String, default: '' },
  district: { type: String, trim: true, index: true },
  taluka: { type: String, trim: true, index: true },
  locality: { type: String, trim: true },
  address: { type: String, default: '' },
  budget: { type: Number, default: null },
  status: { type: String, enum: ['open', 'filled', 'in_progress', 'completed', 'cancelled', 'expired'], default: 'open', index: true },
  specialRequirements: { type: String, default: '' },
  // Optional requirement photo uploaded by the customer for workers to understand the work.
  imageKey: { type: String, default: '' },
  imageName: { type: String, default: '' },
  imageContentType: { type: String, default: '' },
  imageSize: { type: Number, default: 0 }
}, { timestamps: true });
schema.index({ status: 1, category: 1, district: 1, taluka: 1, date: 1 });
export default mongoose.model('Job', schema);
