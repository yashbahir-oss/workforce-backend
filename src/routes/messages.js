import { Router } from 'express';
import multer from 'multer';
import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';
import User from '../models/User.js';
import { auth } from '../middleware/auth.js';
import { emitToUser } from '../services/socket.js';
import { getPrivate, putPrivate } from '../services/storage.js';

const r = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: Number(process.env.MAX_CHAT_ATTACHMENT_MB || 10) * 1024 * 1024 },
});
const allowedAttachmentTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
const key = (a, b) => [String(a), String(b)].sort().join(':');

const publicMessage = (message) => {
  const value = message.toObject ? message.toObject() : message;
  const attachment = value.attachment?.storageKey
    ? {
        name: value.attachment.name,
        contentType: value.attachment.contentType,
        size: value.attachment.size,
        url: `/api/messages/attachments/${value._id}`,
      }
    : null;
  return { ...value, attachment };
};

r.get('/conversations', auth, async (req, res) => {
  const rows = await Conversation.find({ participants: req.user._id })
    .populate('participants', 'name profileImage role')
    .sort({ lastMessageAt: -1 });
  res.json({ conversations: rows });
});

// Attachment download is protected by the same conversation membership as the chat.
r.get('/attachments/:messageId', auth, async (req, res) => {
  const message = await Message.findById(req.params.messageId);
  if (!message) return res.status(404).json({ message: 'Attachment not found' });
  if (![String(message.sender), String(message.recipient)].includes(String(req.user._id))) {
    return res.status(403).json({ message: 'You cannot access this attachment' });
  }
  if (!message.attachment?.storageKey) return res.status(404).json({ message: 'Attachment not found' });

  const object = await getPrivate(message.attachment.storageKey);
  res.setHeader('Content-Type', message.attachment.contentType || 'application/octet-stream');
  res.setHeader('Content-Disposition', `${message.attachment.contentType?.startsWith('image/') ? 'inline' : 'attachment'}; filename="${String(message.attachment.name || 'attachment').replace(/"/g, '')}"`);
  if (object?.Body?.pipe) return object.Body.pipe(res);
  if (Buffer.isBuffer(object?.Body)) return res.end(object.Body);
  if (object?.Body?.transformToByteArray) return res.end(Buffer.from(await object.Body.transformToByteArray()));
  return res.status(404).end();
});

r.get('/:userId', auth, async (req, res) => {
  const other = await User.findById(req.params.userId).select('name profileImage role');
  if (!other) return res.status(404).json({ message: 'User not found' });
  const conversationKey = key(req.user._id, other._id);
  const messages = await Message.find({ conversationKey }).sort({ createdAt: 1 }).limit(200);
  await Message.updateMany({ conversationKey, recipient: req.user._id, readAt: null }, { readAt: new Date() });
  res.json({ conversation: { key: conversationKey, participant: other }, messages: messages.map(publicMessage) });
});

r.post('/:userId', auth, upload.single('file'), async (req, res) => {
  const other = await User.findById(req.params.userId);
  if (!other) return res.status(404).json({ message: 'User not found' });
  if (String(other._id) === String(req.user._id)) return res.status(400).json({ message: 'Cannot message yourself' });

  const text = String(req.body?.text || '').trim();
  if (!text && !req.file) return res.status(400).json({ message: 'Message or attachment is required' });
  if (req.file && !allowedAttachmentTypes.has(req.file.mimetype)) {
    return res.status(400).json({ message: 'Only JPG, PNG, WEBP images and PDF files are allowed' });
  }

  const conversationKey = key(req.user._id, other._id);
  let attachment = null;
  if (req.file) {
    const stored = await putPrivate(req.file.buffer, req.file.mimetype, req.file.originalname);
    attachment = {
      storageKey: stored.key,
      name: req.file.originalname,
      contentType: req.file.mimetype,
      size: req.file.size,
    };
  }

  const message = await Message.create({
    conversationKey,
    sender: req.user._id,
    recipient: other._id,
    booking: req.body?.bookingId || null,
    text,
    attachment,
  });
  const preview = text || `📎 ${attachment?.name || 'Attachment'}`;
  await Conversation.findOneAndUpdate(
    { key: conversationKey },
    { $set: { lastMessage: preview, lastMessageAt: new Date() }, $addToSet: { participants: { $each: [req.user._id, other._id] }, unreadBy: other._id } },
    { upsert: true, new: true },
  );
  const payload = { message: publicMessage(message) };
  emitToUser(other._id, 'message:new', payload);
  res.status(201).json(payload);
});

r.patch('/:userId/read', auth, async (req, res) => {
  const conversationKey = key(req.user._id, req.params.userId);
  await Message.updateMany({ conversationKey, recipient: req.user._id, readAt: null }, { readAt: new Date() });
  await Conversation.findOneAndUpdate({ key: conversationKey }, { $pull: { unreadBy: req.user._id } });
  res.json({ ok: true });
});

export default r;
