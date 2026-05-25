import mongoose from 'mongoose';

export async function connectDB(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not defined in environment variables.');
  }

  // Already connected — skip reconnect (important for Vercel serverless warm instances)
  if (mongoose.connection.readyState === 1) {
    return;
  }

  try {
    await mongoose.connect(uri, {
      bufferCommands: false,           // fail immediately instead of buffering queries
      serverSelectionTimeoutMS: 8000,  // fail fast within Vercel's 10s limit
      connectTimeoutMS: 8000,
    });
    console.log('MongoDB connected successfully');
  } catch (error: any) {
    console.error(`MongoDB connection error: ${error.message}`);
    throw error;
  }
}
