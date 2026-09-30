import mongoose from 'mongoose';

const workerProfileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true, required: true, index: true },
  headline: { type: String, trim: true, maxlength: 120, default: '' },
  bio: { type: String, trim: true, maxlength: 1500, default: '' },
  skills: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Skill' }],
  skillNames: [{ type: String, trim: true }],
  experienceYears: { type: Number, min: 0, max: 70, default: 0 },
  district: { type: String, trim: true, index: true },
  taluka: { type: String, trim: true, index: true },
  city: { type: String, trim: true, index: true },
  area: { type: String, trim: true },
  locality: { type: String, trim: true },
  languages: [{ type: String, trim: true }],
  availability: { type: String, enum: ['available', 'busy', 'unavailable'], default: 'available', index: true },
  verificationStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
  verificationRejectionReason: { type: String, default: '' },
  joinedAt: { type: Date, default: Date.now },
  responseRate: { type: Number, min: 0, max: 100, default: 0 },
  completedJobs: { type: Number, min: 0, default: 0 },
  ratingAverage: { type: Number, min: 0, max: 5, default: 0 },
  ratingCount: { type: Number, min: 0, default: 0 },
  portfolio: [{
    title: String,
    description: String,
    imageKey: String,
    imageUrl: String,
    createdAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

workerProfileSchema.index({ verificationStatus: 1, district: 1, taluka: 1, availability: 1 });
workerProfileSchema.index({ skillNames: 1 });

export default mongoose.model('WorkerProfile', workerProfileSchema);
