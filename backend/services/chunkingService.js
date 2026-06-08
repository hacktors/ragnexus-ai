import fs from "fs/promises";
import path from "path";

export const CHUNKING_STRATEGIES = {
  fixed: {
    value: "fixed",
    label: "Fixed-Size",
    description: "Splits text into consistent character windows with overlap."
  },
  paragraph: {
    value: "paragraph",
    label: "Paragraph-based",
    description: "Preserves paragraph boundaries and groups smaller paragraphs."
  },
  recursive: {
    value: "recursive",
    label: "Recursive Character",
    description: "Recursively splits on semantic separators before falling back to characters."
  }
};

const TEXT_EXTENSIONS = new Set([
  ".txt",
  ".md",
  ".markdown",
  ".csv",
  ".json",
  ".log",
  ".xml",
  ".html",
  ".htm"
]);

const normalizeWhitespace = (text) =>
  String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\u0000/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();

const assertSupportedStrategy = (strategy) => {
  if (!CHUNKING_STRATEGIES[strategy]) {
    const allowed = Object.keys(CHUNKING_STRATEGIES).join(", ");
    throw new Error(`Unsupported chunking strategy "${strategy}". Use one of: ${allowed}`);
  }
};

const readUploadBuffer = async (file) => {
  if (file.buffer) return file.buffer;
  if (file.path) return fs.readFile(file.path);
  throw new Error("Uploaded file did not include a buffer or disk path");
};

const extractPdfText = async (buffer) => {
  const pdfModule = await import("pdf-parse");

  if (pdfModule.PDFParse) {
    const parser = new pdfModule.PDFParse({ data: buffer });
    try {
      const output = await parser.getText();
      return output.text || "";
    } finally {
      await parser.destroy?.();
    }
  }

  const parse = pdfModule.default || pdfModule;
  const output = await parse(buffer);
  return output.text || "";
};

const extractDocxText = async (buffer) => {
  const mammothModule = await import("mammoth");
  const mammoth = mammothModule.default || mammothModule;
  const output = await mammoth.extractRawText({ buffer });
  return output.value || "";
};

export const extractTextFromFile = async (file) => {
  if (!file) {
    throw new Error("No uploaded file was provided");
  }

  const extension = path.extname(file.originalname || "").toLowerCase();
  const mimeType = file.mimetype || "";
  const buffer = await readUploadBuffer(file);

  let text = "";

  if (mimeType === "application/pdf" || extension === ".pdf") {
    text = await extractPdfText(buffer);
  } else if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    extension === ".docx"
  ) {
    text = await extractDocxText(buffer);
  } else if (mimeType.startsWith("text/") || TEXT_EXTENSIONS.has(extension)) {
    text = buffer.toString("utf8");
  } else {
    throw new Error(
      `Unsupported file type "${mimeType || extension}". Upload txt, md, csv, json, pdf, or docx files.`
    );
  }

  const normalized = normalizeWhitespace(text);
  if (normalized.length < 20) {
    throw new Error("Extracted document text is too short to index");
  }

  return normalized;
};

const safeWindowOptions = ({ chunkSize = 1200, overlap = 160 } = {}) => {
  const safeChunkSize = Math.max(300, Math.min(Number(chunkSize) || 1200, 6000));
  const safeOverlap = Math.max(0, Math.min(Number(overlap) || 160, Math.floor(safeChunkSize / 3)));
  return { chunkSize: safeChunkSize, overlap: safeOverlap };
};

const splitFixed = (text, options) => {
  const { chunkSize, overlap } = safeWindowOptions(options);
  const step = Math.max(1, chunkSize - overlap);
  const chunks = [];

  for (let start = 0; start < text.length; start += step) {
    const chunk = text.slice(start, start + chunkSize).trim();
    if (chunk) chunks.push(chunk);
    if (start + chunkSize >= text.length) break;
  }

  return chunks;
};

const mergeSegments = (segments, options) => {
  const { chunkSize, overlap } = safeWindowOptions(options);
  const chunks = [];
  let current = "";

  for (const rawSegment of segments) {
    const segment = rawSegment.trim();
    if (!segment) continue;

    if (segment.length > chunkSize) {
      if (current.trim()) {
        chunks.push(current.trim());
        current = "";
      }
      chunks.push(...splitFixed(segment, options));
      continue;
    }

    const candidate = current ? `${current}\n\n${segment}` : segment;
    if (candidate.length <= chunkSize) {
      current = candidate;
      continue;
    }

    if (current.trim()) {
      chunks.push(current.trim());
      current = overlap > 0 ? `${current.slice(-overlap)}\n\n${segment}` : segment;
    } else {
      current = segment;
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks;
};

const splitParagraph = (text, options) => {
  const paragraphs = text.split(/\n\s*\n/g);
  return mergeSegments(paragraphs, options);
};

const recursiveSplit = (text, options, separators = ["\n\n", "\n", ". ", "; ", ", ", " "]) => {
  const { chunkSize } = safeWindowOptions(options);
  if (text.length <= chunkSize) return [text.trim()];
  if (!separators.length) return splitFixed(text, options);

  const [separator, ...rest] = separators;
  const pieces = text.split(separator);

  if (pieces.length === 1) {
    return recursiveSplit(text, options, rest);
  }

  const expanded = pieces.flatMap((piece, index) => {
    const restored = index < pieces.length - 1 && separator !== " " ? `${piece}${separator.trimEnd()}` : piece;
    return restored.length > chunkSize ? recursiveSplit(restored, options, rest) : restored;
  });

  return mergeSegments(expanded, options);
};

const estimateTokens = (text) => Math.ceil(text.length / 4);

export const chunkText = (text, { strategy = "recursive", chunkSize, overlap } = {}) => {
  assertSupportedStrategy(strategy);
  const normalized = normalizeWhitespace(text);
  const options = safeWindowOptions({ chunkSize, overlap });

  const rawChunks =
    strategy === "fixed"
      ? splitFixed(normalized, options)
      : strategy === "paragraph"
        ? splitParagraph(normalized, options)
        : recursiveSplit(normalized, options);

  const chunks = rawChunks
    .map((chunk) => normalizeWhitespace(chunk))
    .filter((chunk) => chunk.length >= 20)
    .map((chunk, index) => ({
      chunkId: `chunk_${String(index + 1).padStart(4, "0")}`,
      index,
      text: chunk,
      charLength: chunk.length,
      tokenEstimate: estimateTokens(chunk)
    }));

  if (!chunks.length) {
    throw new Error("Document did not produce any valid chunks");
  }

  return chunks;
};

export const listChunkingStrategies = () => Object.values(CHUNKING_STRATEGIES);
