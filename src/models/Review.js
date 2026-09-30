import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', unique: true, required: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  worker: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  overall: { type: Number, min: 1, max: 5, required: true },
  workQuality: { type: Number, min: 1, max: 5, default: null },
  behaviour: { type: Number, min: 1, max: 5, default: null },
  punctuality: { type: Number, min: 1, max: 5, default: null },
  communication: { type: Number, min: 1, max: 5, default: null },
  text: { type: String, maxlength: 2000, default: '' }
}, { timestamps: true });
export default mongoose.model('Review', schema);
