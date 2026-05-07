import mongoose from 'mongoose';

let cachedConnection: Promise<any> | null = null;
let isConnected = false;

const connectDB = async () => {
  if (isConnected && mongoose.connection.readyState === 1) {
    return;
  }

  if (cachedConnection) {
    return cachedConnection;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn('⚠️  MONGODB_URI not found. MongoDB connection skipped.');
    return;
  }

  const options = {
    bufferCommands: false,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  };

  cachedConnection = mongoose.connect(uri, options).then((conn) => {
    isConnected = true;
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
    return conn;
  }).catch((err) => {
    cachedConnection = null; // Reset for next attempt
    isConnected = false;
    console.error('❌ MongoDB connection failed:', err.message);
    throw err;
  });

  return cachedConnection;
};

export default connectDB;
