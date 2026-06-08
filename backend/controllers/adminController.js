import Chat from "../models/Chat.js";
import Document from "../models/Document.js";
import Feedback from "../models/Feedback.js";
import SystemLog from "../models/SystemLog.js";
import { exportFineTuneDataset } from "../services/adaptiveLearning.js";

const dateRange = (days = 14) => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - Number(days));
  return { start, end };
};

const userScopedMatch = (req) => (req.user.role === "admin" ? {} : { user: req.user._id });
const ownerScopedMatch = (req) => (req.user.role === "admin" ? {} : { owner: req.user._id });

export const getAnalytics = async (req, res) => {
  const { start } = dateRange(req.query.days || 14);
  const chatMatch = {
    ...userScopedMatch(req),
    blocked: false,
    createdAt: { $gte: start }
  };

  const [totalQueries, documentsReady, feedbackBreakdown, avgLatency, queriesByDay] =
    await Promise.all([
      Chat.countDocuments(chatMatch),
      Document.countDocuments({ ...ownerScopedMatch(req), ingestionStatus: "ready" }),
      Feedback.aggregate([
        {
          $match:
            req.user.role === "admin"
              ? { createdAt: { $gte: start } }
              : { user: req.user._id, createdAt: { $gte: start } }
        },
        { $group: { _id: "$rating", count: { $sum: 1 } } }
      ]),
      Chat.aggregate([
        { $match: chatMatch },
        { $group: { _id: null, averageLatencyMs: { $avg: "$latencyMs" } } }
      ]),
      Chat.aggregate([
        { $match: chatMatch },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            queries: { $sum: 1 },
            avgLatencyMs: { $avg: "$latencyMs" }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);

  const feedbackTotals = feedbackBreakdown.reduce(
    (acc, item) => {
      acc[item._id] = item.count;
      acc.total += item.count;
      return acc;
    },
    { positive: 0, negative: 0, total: 0 }
  );

  res.json({
    metrics: {
      totalQueries,
      documentsReady,
      averageLatencyMs: Math.round(avgLatency[0]?.averageLatencyMs || 0),
      positiveFeedback: feedbackTotals.positive,
      negativeFeedback: feedbackTotals.negative,
      positiveFeedbackRatio:
        feedbackTotals.total > 0
          ? Number((feedbackTotals.positive / feedbackTotals.total).toFixed(3))
          : 0
    },
    queriesByDay: queriesByDay.map((item) => ({
      date: item._id,
      queries: item.queries,
      avgLatencyMs: Math.round(item.avgLatencyMs || 0)
    })),
    feedbackBreakdown: [
      { name: "Positive", value: feedbackTotals.positive },
      { name: "Negative", value: feedbackTotals.negative }
    ]
  });
};

export const getLogs = async (req, res) => {
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(100, Math.max(10, Number(req.query.limit || 50)));
  const skip = (page - 1) * limit;
  const filter = req.query.level ? { level: req.query.level } : {};

  const [logs, total] = await Promise.all([
    SystemLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate("actor", "name email role"),
    SystemLog.countDocuments(filter)
  ]);

  res.json({
    logs,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
};

export const exportFineTune = async (_req, res, next) => {
  try {
    const dataset = await exportFineTuneDataset({ markExported: true });
    const filename = `ragnexus-fine-tune-${new Date().toISOString().slice(0, 10)}.jsonl`;

    res.setHeader("Content-Type", "application/x-ndjson");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("X-RAGNEXUS-Example-Count", String(dataset.count));
    res.send(dataset.jsonl);
  } catch (error) {
    next(error);
  }
};
