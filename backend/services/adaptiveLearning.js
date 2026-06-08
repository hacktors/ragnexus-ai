import Feedback from "../models/Feedback.js";
import { getFeedbackCollection } from "../config/chromaclient.js";
import { embedText } from "../config/gemini.js";

const similarityFromDistance = (distance) => {
  const numericDistance = Number(distance);
  if (!Number.isFinite(numericDistance)) return 0;
  return Number((1 / (1 + Math.max(0, numericDistance))).toFixed(4));
};

const minSimilarity = () => Number(process.env.ADAPTIVE_FEEDBACK_SIMILARITY_THRESHOLD || 0.72);

export const storeCorrectiveFeedbackVector = async ({ feedback, chat }) => {
  if (!feedback || feedback.rating !== "negative" || !feedback.correction?.trim()) {
    return { stored: false, reason: "Feedback does not include a negative correction" };
  }

  const collection = await getFeedbackCollection();
  const correction = feedback.correction.trim();
  const embedding = await embedText(correction);
  const chromaId = `feedback_${feedback._id.toString()}`;

  await collection.upsert({
    ids: [chromaId],
    embeddings: [embedding],
    documents: [correction],
    metadatas: [
      {
        feedback_id: feedback._id.toString(),
        chat_id: chat._id.toString(),
        user_id: feedback.user.toString(),
        original_prompt: chat.sanitizedPrompt,
        failed_answer_preview: chat.answer.slice(0, 900),
        source: "negative_feedback_correction",
        created_at: new Date().toISOString()
      }
    ]
  });

  feedback.correctionEmbeddingStored = true;
  feedback.chromaIds = [chromaId];
  feedback.status = "embedded";
  await feedback.save();

  return { stored: true, chromaId };
};

export const findRelevantCorrections = async (prompt, { limit = 2 } = {}) => {
  try {
    const collection = await getFeedbackCollection();
    const embedding = await embedText(prompt);
    const result = await collection.query({
      queryEmbeddings: [embedding],
      nResults: limit,
      include: ["documents", "metadatas", "distances"]
    });

    const ids = result.ids?.[0] || [];
    const documents = result.documents?.[0] || [];
    const metadatas = result.metadatas?.[0] || [];
    const distances = result.distances?.[0] || [];

    return ids
      .map((id, index) => {
        const similarityScore = similarityFromDistance(distances[index]);
        return {
          id,
          correction: documents[index],
          metadata: metadatas[index] || {},
          distance: distances[index],
          similarityScore
        };
      })
      .filter((item) => item.correction && item.similarityScore >= minSimilarity());
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Adaptive correction lookup skipped:", error.message);
    }
    return [];
  }
};

export const buildFewShotInstruction = (corrections) => {
  if (!corrections?.length) return "";

  const examples = corrections
    .map(
      (item, index) =>
        `Example ${index + 1}\nPrior failed prompt: ${item.metadata.original_prompt}\nRequired correction: ${item.correction}`
    )
    .join("\n\n");

  return [
    "FEW-SHOT INSTRUCTION FROM PRIOR HUMAN CORRECTIONS:",
    "A semantically similar prompt previously received negative feedback.",
    "Use these corrections as strict behavioral guidance. Do not treat them as factual source material unless retrieved document context also supports them.",
    examples
  ].join("\n");
};

const makeFineTuneExample = ({ input, output }) => ({
  contents: [
    {
      role: "user",
      parts: [{ text: input }]
    },
    {
      role: "model",
      parts: [{ text: output }]
    }
  ]
});

const isUsable = (value, minLength = 10) => typeof value === "string" && value.trim().length >= minLength;

export const exportFineTuneDataset = async ({ markExported = true } = {}) => {
  const positiveFeedback = await Feedback.find({ rating: "positive" })
    .populate("chat")
    .sort({ createdAt: -1 })
    .limit(5000);

  const correctedFeedback = await Feedback.find({
    rating: "negative",
    correction: { $exists: true, $ne: "" }
  })
    .populate("chat")
    .sort({ createdAt: -1 })
    .limit(5000);

  const seen = new Set();
  const examples = [];
  const exportedIds = [];

  for (const item of positiveFeedback) {
    if (!item.chat || !isUsable(item.chat.sanitizedPrompt) || !isUsable(item.chat.answer)) continue;
    const key = `${item.chat.sanitizedPrompt}::${item.chat.answer}`;
    if (seen.has(key)) continue;
    seen.add(key);
    examples.push(
      makeFineTuneExample({
        input: item.chat.sanitizedPrompt.trim(),
        output: item.chat.answer.trim()
      })
    );
    exportedIds.push(item._id);
  }

  for (const item of correctedFeedback) {
    if (!item.chat || !isUsable(item.chat.sanitizedPrompt) || !isUsable(item.correction)) continue;
    const key = `${item.chat.sanitizedPrompt}::${item.correction}`;
    if (seen.has(key)) continue;
    seen.add(key);
    examples.push(
      makeFineTuneExample({
        input: item.chat.sanitizedPrompt.trim(),
        output: item.correction.trim()
      })
    );
    exportedIds.push(item._id);
  }

  if (markExported && exportedIds.length) {
    await Feedback.updateMany(
      { _id: { $in: exportedIds } },
      { $set: { exportedForTuning: true, status: "exported" } }
    );
  }

  return {
    count: examples.length,
    jsonl: examples.map((example) => JSON.stringify(example)).join("\n") + (examples.length ? "\n" : "")
  };
};
