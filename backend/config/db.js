import mongoose from "mongoose";
import { addSystemCertificates } from "./systemCa.js";

export const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error("MONGO_URI is required in the backend environment");
  }

  mongoose.set("strictQuery", true);
  addSystemCertificates();

  const connection = await mongoose.connect(mongoUri, {
    autoIndex: process.env.NODE_ENV !== "production"
  });

  console.log(`MongoDB connected: ${connection.connection.host}`);
  return connection;
};
