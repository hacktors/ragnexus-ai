import { FileSearch } from "lucide-react";

const CitationCard = ({ citation }) => (
  <div className="rounded-lg border border-white/10 bg-slate-950/70 p-3">
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        <FileSearch className="shrink-0 text-purple-300" size={16} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{citation.documentName}</p>
          <p className="text-xs text-slate-500">{citation.chunkId}</p>
        </div>
      </div>
      <span className="rounded-md bg-emerald-400/10 px-2 py-1 text-xs font-bold text-emerald-200">
        {Math.round((citation.confidenceScore || 0) * 100)}%
      </span>
    </div>
    <p className="mt-3 text-sm leading-6 text-slate-300">{citation.snippetPreview}</p>
  </div>
);

export default CitationCard;
