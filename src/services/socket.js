let ioInstance = null;
export function setIO(io) { ioInstance = io; }
export function emitToUser(userId, event, payload) { if (ioInstance) ioInstance.to(`user:${userId}`).emit(event, payload); }
export function getIO() { return ioInstance; }
