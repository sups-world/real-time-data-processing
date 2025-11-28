import mongoose from "mongoose";

const ProcessedRecordSchema = new mongoose.Schema(
  {
    value: Number, // cleaned/transformed numeric value
    original: Object, // original payload (optional)
    processedAt: Date,
  },
  { timestamps: true }
);

export default mongoose.model("ProcessedRecord", ProcessedRecordSchema);
