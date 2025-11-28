import mongoose from "mongoose";

const DataPointSchema = new mongoose.Schema({
  value: { type: Number, required: true },
  type: { type: String },
  meta: { type: mongoose.Schema.Types.Mixed },
  ingestedAt: { type: Date, default: Date.now },
});

export default mongoose.model("DataPoint", DataPointSchema);
