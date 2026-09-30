import dns from 'node:dns';
import mongoose from 'mongoose';

// Atlas SRV resolution is more reliable with explicit public resolvers in some local networks.
dns.setServers(['1.1.1.1', '8.8.8.8']);

export async function connectDB(uri) {
  if (!uri) throw new Error('MONGODB_URI is missing');

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  });

  console.log('MongoDB connected');
}
