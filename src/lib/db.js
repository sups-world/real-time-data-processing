import envLoader from "../config/envLoader.js";
import mongoose from "mongoose";

const MONGO_URI = envLoader.mongoUri;

export async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI, {
      // useUnifiedTopology / useNewUrlParser not needed in Mongoose 6+
    });
    console.log("MongoDB connected:", MONGO_URI);
  } catch (err) {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  }
}
