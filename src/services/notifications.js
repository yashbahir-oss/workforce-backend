import Notification from '../models/Notification.js';
import { emitToUser } from './socket.js';

export async function notify(user, title, message, type = 'system', path = '') {
  if (!user) return null;
  const notification = await Notification.create({ user, title, message, type, path });
  // MongoDB stores the notification; Socket.IO only delivers the realtime hint.
  emitToUser(String(user), 'notification:new', notification.toObject());
  emitToUser(String(user), 'notifications:updated', { unread: true });
  return notification;
}
