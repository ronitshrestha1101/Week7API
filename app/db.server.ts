import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const uri = process.env.MONGODB_URI || "mongodb+srv://ronitshrestha1101_db_user:898EYEcetVfrjhjD@cluster0.yxihcio.mongodb.net/?appName=Cluster0";

declare global {
  var __mongooseConnection: typeof mongoose | undefined;
}

export async function connectDB() {
  if (mongoose.connection.readyState >= 1) {
    return mongoose.connection;
  }
  if (process.env.NODE_ENV === "production") {
    return mongoose.connect(uri);
  } else {
    if (!globalThis.__mongooseConnection) {
      globalThis.__mongooseConnection = mongoose;
      await mongoose.connect(uri);
    }
    return mongoose.connection;
  }
}

export { mongoose };
