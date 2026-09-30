import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  conversationKey: { type: String, required: true, index: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },
  // Text is optional when a user sends an image/document attachment only.
  text: { type: String, trim: true, maxlength: 5000, default: '' },
  attachment: {
    storageKey: { type: String, default: '' },
    name: { type: String, default: '' },
    contentType: { type: String, default: '' },
    size: { type: Number, default: 0 },
  },
  readAt: { type: Date, default: null },
}, { timestamps: true });

schema.index({ conversationKey: 1, createdAt: 1 });
export default mongoose.model('Message', schema);
