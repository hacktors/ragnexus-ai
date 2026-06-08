import mongoose from "mongoose";

const systemLogSchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true
    },
    level: {
      type: String,
      enum: ["info", "warn", "error", "security", "audit"],
      required: true,
      index: true
    },
    action: {
      type: String,
      required: true,
      index: true
    },
    message: {
      type: String,
      required: true
    },
    ip: String,
    userAgent: String,
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  { timestamps: true }
);

systemLogSchema.index({ createdAt: -1 });

systemLogSchema.statics.write = function writeLog({
  actor,
  level = "info",
  action,
  message,
  req,
  metadata = {}
}) {
  return this.create({
    actor,
    level,
    action,
    message,
    ip: req?.ip,
    userAgent: req?.get?.("user-agent"),
    metadata
  }).catch((error) => {
    console.error("SystemLog write failed:", error.message);
  });
};

export default mongoose.model("SystemLog", systemLogSchema);
