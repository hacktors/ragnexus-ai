import { GoogleGenAI } from "@google/genai";
import { addSystemCertificates } from "./systemCa.js";

let aiClient;

const DEFAULT_GENERATION_MODEL = "gemini-3.5-flash";
const DEFAULT_FALLBACK_MODELS = [
  "gemini-3.1-flash-lite",
  "gemini-flash-lite-latest",
  "gemini-2.0-flash-lite"
];

const parseList = (value) =>
  String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const unique = (items) => [...new Set(items.filter(Boolean))];

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const asPositiveInt = (value, fallback) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const getErrorStatus = (error) => Number(error?.status || error?.code || error?.response?.status || 0);

export const isTransientGeminiError = (error) => {
  const status = getErrorStatus(error);
  if ([429, 500, 502, 503, 504].includes(status)) return true;

  return /UNAVAILABLE|RESOURCE_EXHAUSTED|high demand|rate limit|quota|fetch failed|temporarily/i.test(
    error?.message || ""
  ) || /Abort|timeout|aborted/i.test(
    error?.message || ""
  );
};

const geminiHttpOptions = (timeoutMs) => ({
  timeout: asPositiveInt(timeoutMs, 10000)
});

const retryDelayMs = (attempt) => {
  const baseDelay = asPositiveInt(process.env.GEMINI_RETRY_BASE_MS, 650);
  const jitter = Math.floor(Math.random() * 250);
  return baseDelay * 2 ** Math.max(0, attempt - 1) + jitter;
};

const ensureGeminiKey = () => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is required in the backend environment");
  }
};

export const getGeminiClient = () => {
  ensureGeminiKey();
  addSystemCertificates();

  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY
    });
  }

  return aiClient;
};

const parseJsonFromText = (text) => {
  if (!text) {
    throw new Error("Gemini returned an empty response");
  }

  try {
    return JSON.parse(text);
  } catch {
    const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error("Gemini response did not contain valid JSON");
    }
    return JSON.parse(jsonMatch[0]);
  }
};

export const geminiModels = {
  generation: () => process.env.GEMINI_MODEL || DEFAULT_GENERATION_MODEL,
  generationCandidates: () =>
    unique([
      process.env.GEMINI_MODEL || DEFAULT_GENERATION_MODEL,
      ...parseList(process.env.GEMINI_FALLBACK_MODELS),
      ...DEFAULT_FALLBACK_MODELS
    ]),
  embedding: () => process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001",
  dimensions: () => Number(process.env.GEMINI_EMBEDDING_DIMENSIONS || 768)
};

export const generateGroundedJson = async ({
  contents,
  systemInstruction,
  responseSchema,
  temperature = 0.2
}) => {
  const ai = getGeminiClient();
  const candidates = geminiModels.generationCandidates();
  const primaryRetries = asPositiveInt(process.env.GEMINI_PRIMARY_RETRIES, 1);
  const fallbackRetries = asPositiveInt(process.env.GEMINI_FALLBACK_RETRIES, 1);
  const httpOptions = geminiHttpOptions(process.env.GEMINI_GENERATION_TIMEOUT_MS);
  let lastError = null;
  let totalAttempts = 0;

  for (const [modelIndex, model] of candidates.entries()) {
    const attemptsForModel = modelIndex === 0 ? primaryRetries : fallbackRetries;

    for (let attempt = 1; attempt <= attemptsForModel; attempt += 1) {
      totalAttempts += 1;

      try {
        const response = await ai.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema,
            temperature,
            httpOptions
          }
        });

        return {
          data: parseJsonFromText(response.text),
          model,
          attempts: totalAttempts,
          fallbackUsed: modelIndex > 0
        };
      } catch (error) {
        lastError = error;

        if (!isTransientGeminiError(error)) {
          throw error;
        }

        if (attempt < attemptsForModel) {
          await wait(retryDelayMs(attempt));
        }
      }
    }
  }

  lastError.status = getErrorStatus(lastError) || 503;
  lastError.transient = true;
  throw lastError;
};

export const embedText = async (text) => {
  const cleanText = String(text || "").trim();
  if (!cleanText) {
    throw new Error("Cannot embed empty text");
  }

  const ai = getGeminiClient();
  const attempts = asPositiveInt(process.env.GEMINI_EMBEDDING_RETRIES, 3);
  const httpOptions = geminiHttpOptions(process.env.GEMINI_EMBEDDING_TIMEOUT_MS);
  let lastError = null;
  let result;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      result = await ai.models.embedContent({
        model: geminiModels.embedding(),
        contents: cleanText,
        config: {
          outputDimensionality: geminiModels.dimensions(),
          httpOptions
        }
      });
      break;
    } catch (error) {
      lastError = error;

      if (!isTransientGeminiError(error) || attempt === attempts) {
        throw error;
      }

      await wait(retryDelayMs(attempt));
    }
  }

  const values = result.embedding?.values || result.embeddings?.[0]?.values;
  if (!Array.isArray(values) || values.length === 0) {
    throw lastError || new Error("Gemini embedding response did not include vector values");
  }

  return values;
};

export const embedTexts = async (texts, concurrency = 3) => {
  const queue = [...texts];
  const results = new Array(texts.length);
  let cursor = 0;

  const worker = async () => {
    while (queue.length) {
      const text = queue.shift();
      const index = cursor;
      cursor += 1;
      results[index] = await embedText(text);
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(concurrency, texts.length) }, () => worker())
  );

  return results;
};
