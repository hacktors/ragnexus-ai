import mongoose from "mongoose";

const citationSchema = new mongoose.Schema(
  {
    documentName: {
      type: String,
      required: true
    },
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document"
    },
    chunkId: {
      type: String,
      required: true
    },
    snippetPreview: {
      type: String,
      required: true
    },
    confidenceScore: {
      type: Number,
      min: 0,
      max: 1,
      required: true
    },
    distance: Number
  },
  { _id: false }
);

const chatSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    prompt: {
      type: String,
      required: true
    },
    sanitizedPrompt: {
      type: String,
      required: true
    },
    answer: {
      type: String,
      default: ""
    },
    citations: {
      type: [citationSchema],
      default: []
    },
    fewShotApplied: {
      type: Boolean,
      default: false
    },
    fewShotReferences: {
      type: [
        {
          correction: String,
          originalPrompt: String,
          similarityScore: Number,
          feedbackId: mongoose.Schema.Types.ObjectId
        }
      ],
      default: []
    },
    model: {
      type: String,
      required: true
    },
    retrievalCount: {
      type: Number,
      default: 0
    },
    latencyMs: {
      type: Number,
      default: 0
    },
    blocked: {
      type: Boolean,
      default: false
    },
    blockReason: {
      type: String,
      default: ""
    },
    feedback: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Feedback"
    }
  },
  { timestamps: true }
);

chatSchema.index({ user: 1, createdAt: -1 });
chatSchema.index({ createdAt: -1 });

export default mongoose.model("Chat", chatSchema);
