import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  messages: [{ role: { type: String, enum: ['user', 'assistant'] }, content: String, createdAt: { type: Date, default: Date.now } }]
}, { timestamps: true });
export default mongoose.model('AiConversation', schema);
