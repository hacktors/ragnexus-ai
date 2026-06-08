import Chat from "../models/Chat.js";
import Document from "../models/Document.js";
import Feedback from "../models/Feedback.js";
import SystemLog from "../models/SystemLog.js";
import { getDocumentCollection } from "../config/chromaclient.js";
import { geminiModels, isTransientGeminiError } from "../config/gemini.js";
import { listChunkingStrategies } from "../services/chunkingService.js";
import { storeCorrectiveFeedbackVector } from "../services/adaptiveLearning.js";
import { answerWithGroundedRag, ingestDocument } from "../services/ragEngine.js";

const MAX_PROMPT_LENGTH = 6000;

const injectionPatterns = [
  /ignore\s+(all\s+)?(previous|prior|above|system|developer)\s+instructions/i,
  /disregard\s+(all\s+)?(previous|prior|system|developer)\s+instructions/i,
  /reveal\s+(the\s+)?(system|developer|hidden)\s+(prompt|instructions|message)/i,
  /show\s+(me\s+)?(your\s+)?(system|developer|hidden)\s+(prompt|instructions)/i,
  /print\s+(the\s+)?(system|developer|hidden)\s+(prompt|instructions)/i,
  /\b(system|developer)\s+prompt\s+(leak|dump|exfiltrate|extract)/i,
  /\bjailbreak\b|\bDAN\b|do\s+anything\s+now/i,
  /you\s+are\s+now\s+(in|under)\s+(developer|admin|root)\s+mode/i,
  /bypass\s+(safety|policy|guardrails|security)/i,
  /act\s+as\s+.*without\s+(rules|restrictions|policy)/i
];

export const sanitizeChatPrompt = (prompt) => {
  const sanitized = String(prompt || "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!sanitized) {
    return { safe: false, sanitized, reason: "Prompt is required" };
  }

  if (sanitized.length > MAX_PROMPT_LENGTH) {
    return {
      safe: false,
      sanitized,
      reason: `Prompt exceeds ${MAX_PROMPT_LENGTH} characters`
    };
  }

  const matchedPattern = injectionPatterns.find((pattern) => pattern.test(sanitized));
  if (matchedPattern) {
    return {
      safe: false,
      sanitized,
      reason: "Prompt injection attempt detected",
      matchedPattern: matchedPattern.toString()
    };
  }

  return { safe: true, sanitized };
};

export const getChunkingStrategies = (_req, res) => {
  res.json({ strategies: listChunkingStrategies() });
};

export const uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "A document file is required" });
    }

    const strategy = req.body.strategy || "recursive";
    const document = await ingestDocument({
      file: req.file,
      owner: req.user,
      strategy,
      chunkSize: req.body.chunkSize,
      overlap: req.body.overlap
    });

    await SystemLog.write({
      actor: req.user._id,
      level: "audit",
      action: "document.upload",
      message: `Document uploaded: ${document.originalName}`,
      req,
      metadata: {
        documentId: document._id,
        chunkCount: document.chunkCount,
        strategy: document.chunkingStrategy
      }
    });

    res.status(201).json({ document });
  } catch (error) {
    next(error);
  }
};

export const listDocuments = async (req, res) => {
  const query = req.user.role === "admin" ? {} : { owner: req.user._id };
  const documents = await Document.find(query).sort({ createdAt: -1 }).limit(200);
  res.json({ documents });
};

export const deleteDocument = async (req, res, next) => {
  try {
    const query = { _id: req.params.id };
    if (req.user.role !== "admin") query.owner = req.user._id;

    const document = await Document.findOne(query);
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    if (document.chromaIds.length) {
      const collection = await getDocumentCollection();
      await collection.delete({ ids: document.chromaIds });
    }

    await document.deleteOne();

    await SystemLog.write({
      actor: req.user._id,
      level: "audit",
      action: "document.delete",
      message: `Document deleted: ${document.originalName}`,
      req,
      metadata: { documentId: document._id }
    });

    res.json({ message: "Document deleted" });
  } catch (error) {
    next(error);
  }
};

export const askQuestion = async (req, res, next) => {
  const startedAt = Date.now();
  let promptCheck = null;

  try {
    const { message } = req.body;
    promptCheck = sanitizeChatPrompt(message);

    if (!promptCheck.safe) {
      let chat = null;
      if (promptCheck.sanitized) {
        chat = await Chat.create({
          user: req.user._id,
          prompt: String(message || ""),
          sanitizedPrompt: promptCheck.sanitized,
          blocked: true,
          blockReason: promptCheck.reason,
          model: process.env.GEMINI_MODEL || "gemini-3.5-flash"
        });
      }

      await SystemLog.write({
        actor: req.user._id,
        level: "security",
        action: "chat.prompt_injection_blocked",
        message: promptCheck.reason,
        req,
        metadata: {
          chatId: chat?._id,
          matchedPattern: promptCheck.matchedPattern
        }
      });

      return res.status(400).json({
        message: "Unsafe prompt rejected",
        reason: promptCheck.reason
      });
    }

    const result = await answerWithGroundedRag({
      prompt: promptCheck.sanitized,
      user: req.user
    });

    const chat = await Chat.create({
      user: req.user._id,
      prompt: message,
      sanitizedPrompt: promptCheck.sanitized,
      answer: result.answer,
      citations: result.citations,
      fewShotApplied: result.fewShotApplied,
      fewShotReferences: result.fewShotReferences,
      model: result.model,
      retrievalCount: result.retrievalCount,
      latencyMs: result.latencyMs
    });

    res.json({ chat });
  } catch (error) {
    if (promptCheck?.safe && isTransientGeminiError(error)) {
      const chat = await Chat.create({
        user: req.user._id,
        prompt: req.body.message,
        sanitizedPrompt: promptCheck.sanitized,
        answer:
          "The AI service is temporarily busy before retrieval could complete. Please retry in a moment.",
        citations: [],
        fewShotApplied: false,
        fewShotReferences: [],
        model: `${geminiModels.generation()} (service fallback)`,
        retrievalCount: 0,
        latencyMs: Date.now() - startedAt
      });

      return res.json({ chat });
    }

    next(error);
  }
};

export const getChatHistory = async (req, res) => {
  const chats = await Chat.find({ user: req.user._id, blocked: false })
    .sort({ createdAt: -1 })
    .limit(60)
    .populate("feedback");

  res.json({ chats });
};

export const submitFeedback = async (req, res, next) => {
  try {
    const { chatId, rating, comment = "", correction = "" } = req.body;

    if (!["positive", "negative"].includes(rating)) {
      return res.status(400).json({ message: "rating must be positive or negative" });
    }

    const chat = await Chat.findOne({ _id: chatId, user: req.user._id });
    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    const feedback = await Feedback.findOneAndUpdate(
      { chat: chat._id, user: req.user._id },
      {
        chat: chat._id,
        user: req.user._id,
        rating,
        score: rating === "positive" ? 1 : -1,
        comment,
        correction
      },
      { new: true, upsert: true, runValidators: true }
    );

    chat.feedback = feedback._id;
    await chat.save();

    const adaptiveMemory = await storeCorrectiveFeedbackVector({ feedback, chat });

    await SystemLog.write({
      actor: req.user._id,
      level: "audit",
      action: "feedback.submit",
      message: `Feedback submitted: ${rating}`,
      req,
      metadata: {
        chatId: chat._id,
        feedbackId: feedback._id,
        adaptiveMemory
      }
    });

    res.status(201).json({ feedback, adaptiveMemory });
  } catch (error) {
    next(error);
  }
};
