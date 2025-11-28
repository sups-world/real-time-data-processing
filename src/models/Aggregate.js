import mongoose from "mongoose";

const AggregateSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true }, // e.g., 'global' or some group key
  count: { type: Number, default: 0 },
  sum: { type: Number, default: 0 },
  avg: { type: Number, default: 0 },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model("Aggregate", AggregateSchema);
