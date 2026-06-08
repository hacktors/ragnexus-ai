import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema(
  {
    chat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
      required: true,
      index: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    rating: {
      type: String,
      enum: ["positive", "negative"],
      required: true,
      index: true
    },
    score: {
      type: Number,
      enum: [1, -1],
      required: true
    },
    comment: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: ""
    },
    correction: {
      type: String,
      trim: true,
      maxlength: 8000,
      default: ""
    },
    correctionEmbeddingStored: {
      type: Boolean,
      default: false
    },
    chromaIds: {
      type: [String],
      default: []
    },
    exportedForTuning: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      enum: ["captured", "embedded", "exported"],
      default: "captured"
    }
  },
  { timestamps: true }
);

feedbackSchema.index({ rating: 1, createdAt: -1 });

export default mongoose.model("Feedback", feedbackSchema);
