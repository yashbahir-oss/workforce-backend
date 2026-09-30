import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true, index: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  worker: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  status: { type: String, enum: ['requested', 'accepted', 'rejected', 'confirmed', 'active', 'completed', 'cancelled'], default: 'requested', index: true },
  agreedAmount: { type: Number, default: null },
  customerConfirmedCompletion: { type: Boolean, default: false },
  workerConfirmedCompletion: { type: Boolean, default: false },
  startedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
  cancelledAt: { type: Date, default: null },
  notes: { type: String, default: '' },
  arrivalSelfieKey: { type: String, default: '' },
  arrivalSelfieName: { type: String, default: '' },
  arrivalSelfieContentType: { type: String, default: '' },
  arrivalSelfieSize: { type: Number, default: 0 }
}, { timestamps: true });
schema.index({ customer: 1, status: 1, createdAt: -1 });
schema.index({ worker: 1, status: 1, createdAt: -1 });
export default mongoose.model('Booking', schema);
