import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  category: { type: String, default: 'Other' },
  documentType: { type: String, default: '' },
  language: { type: String, default: 'mr' },
  status: { type: String, enum: ['published', 'draft', 'archived'], default: 'published' },
  fileName: { type: String, default: '' },
  fileContentType: { type: String, default: '' },
  fileSize: { type: Number, default: 0 },
  gridFsId: { type: mongoose.Schema.Types.ObjectId, default: null },
  thumbnailGridFsId: { type: mongoose.Schema.Types.ObjectId, default: null },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  // Kept for backward compatibility with existing public document references.
  fileUrl: { type: String, default: '' },
}, { timestamps: true });

export default mongoose.model('Document', schema);
