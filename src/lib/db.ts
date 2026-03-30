import mongoose from "mongoose";

export async function connectDB() {
  await mongoose.connect(process.env.MONGODB_URI as string);

  if (process.env.NODE_ENV === 'development') {
    console.log('MongoDB connected');
  }
}
