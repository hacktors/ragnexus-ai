import mongoose from "mongoose";

const documentSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    originalName: {
      type: String,
      required: true,
      trim: true
    },
    storedName: {
      type: String,
      required: true
    },
    mimeType: {
      type: String,
      required: true
    },
    size: {
      type: Number,
      required: true,
      min: 0
    },
    checksum: {
      type: String,
      required: true,
      index: true
    },
    textPreview: {
      type: String,
      default: ""
    },
    chunkingStrategy: {
      type: String,
      enum: ["fixed", "paragraph", "recursive"],
      required: true
    },
    chunkCount: {
      type: Number,
      default: 0,
      min: 0
    },
    chromaCollection: {
      type: String,
      required: true
    },
    chromaIds: {
      type: [String],
      default: []
    },
    ingestionStatus: {
      type: String,
      enum: ["processing", "ready", "failed"],
      default: "processing",
      index: true
    },
    ingestionError: {
      type: String,
      default: ""
    },
    metadata: {
      uploadOwnerName: String,
      uploadOwnerEmail: String,
      sourceType: String,
      strategyLabel: String,
      avgChunkLength: Number,
      tags: [String]
    }
  },
  { timestamps: true }
);

documentSchema.index({ owner: 1, createdAt: -1 });
documentSchema.index({ originalName: "text", textPreview: "text" });

export default mongoose.model("Document", documentSchema);
