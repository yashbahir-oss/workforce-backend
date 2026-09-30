import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  key: { type: String, unique: true, index: true },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true }],
  lastMessage: { type: String, default: '' },
  lastMessageAt: { type: Date, default: null },
  unreadBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });
export default mongoose.model('Conversation', schema);
