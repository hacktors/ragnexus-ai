import { ChromaClient, CloudClient } from "chromadb";
import { addSystemCertificates } from "./systemCa.js";

let client;
const collectionCache = new Map();

const asBoolean = (value) => value === true || value === "true";
const asNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeHost = (value) => {
  if (!value) return value;
  return String(value).replace(/^https?:\/\//, "").replace(/\/+$/, "");
};

const precomputedEmbeddingFunction = {
  name: "ragnexus-precomputed-embeddings",
  generate: async () => {
    throw new Error("RAGNEXUS supplies Gemini embeddings directly");
  }
};

export const getChromaClient = () => {
  if (client) return client;

  addSystemCertificates();

  if (process.env.CHROMA_API_KEY) {
    const cloudOptions = {
      apiKey: process.env.CHROMA_API_KEY,
      tenant: process.env.CHROMA_TENANT,
      database: process.env.CHROMA_DATABASE
    };

    if (process.env.CHROMA_CLOUD_HOST) {
      cloudOptions.host = normalizeHost(process.env.CHROMA_CLOUD_HOST);
    }

    if (process.env.CHROMA_CLOUD_PORT) {
      cloudOptions.port = asNumber(process.env.CHROMA_CLOUD_PORT, 443);
    }

    client = new CloudClient(cloudOptions);

    return client;
  }

  client = new ChromaClient({
    host: process.env.CHROMA_HOST || "localhost",
    port: asNumber(process.env.CHROMA_PORT, 8000),
    ssl: asBoolean(process.env.CHROMA_SSL),
    tenant: process.env.CHROMA_TENANT,
    database: process.env.CHROMA_DATABASE
  });

  return client;
};

export const getChromaCollection = async (name, metadata = {}) => {
  if (!name) {
    throw new Error("Chroma collection name is required");
  }

  if (collectionCache.has(name)) {
    return collectionCache.get(name);
  }

  const chromaClient = getChromaClient();
  const collection = await chromaClient.getOrCreateCollection({
    name,
    embeddingFunction: precomputedEmbeddingFunction,
    metadata: {
      created_by: "ragnexus-ai",
      ...metadata
    }
  });

  collectionCache.set(name, collection);
  return collection;
};

export const getDocumentCollection = () =>
  getChromaCollection(process.env.CHROMA_DOCUMENT_COLLECTION || "ragnexus_documents", {
    purpose: "grounded_rag_documents"
  });

export const getFeedbackCollection = () =>
  getChromaCollection(process.env.CHROMA_FEEDBACK_COLLECTION || "ragnexus_feedback_memory", {
    purpose: "adaptive_negative_feedback_memory"
  });
