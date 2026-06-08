import { FileUp, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { documentsApi } from "../api/ragnexusApi.js";

const DocumentsPage = () => {
  const [documents, setDocuments] = useState([]);
  const [strategies, setStrategies] = useState([]);
  const [strategy, setStrategy] = useState("recursive");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    const [{ documents: docs }, { strategies: options }] = await Promise.all([
      documentsApi.list(),
      documentsApi.strategies()
    ]);
    setDocuments(docs);
    setStrategies(options);
  };

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  const upload = async (event) => {
    event.preventDefault();
    if (!file) return;

    setLoading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("document", file);
      formData.append("strategy", strategy);
      await documentsApi.upload(formData);
      setFile(null);
      event.target.reset();
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id) => {
    setLoading(true);
    setError("");
    try {
      await documentsApi.remove(id);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <section className="panel rounded-lg p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-black">Document Manager</h1>
            <p className="mt-1 text-sm text-slate-400">
              Upload enterprise knowledge and select the ingestion strategy used for vector storage.
            </p>
          </div>
          <button onClick={() => load().catch((err) => setError(err.message))} className="btn-secondary">
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>

        <form onSubmit={upload} className="mt-5 grid gap-3 md:grid-cols-[1fr_220px_auto]">
          <input
            type="file"
            accept=".txt,.md,.markdown,.csv,.json,.pdf,.docx"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
            className="input"
            required
          />
          <select value={strategy} onChange={(event) => setStrategy(event.target.value)} className="input">
            {strategies.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <button type="submit" disabled={loading || !file} className="btn-primary">
            <FileUp size={16} />
            Upload
          </button>
        </form>

        {error ? <p className="mt-4 rounded-lg bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p> : null}
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {documents.map((document) => (
          <article key={document._id} className="panel rounded-lg p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-bold text-white">{document.originalName}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {document.chunkCount} chunks | {document.chunkingStrategy}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-md px-2 py-1 text-xs font-bold ${
                  document.ingestionStatus === "ready"
                    ? "bg-emerald-400/10 text-emerald-200"
                    : document.ingestionStatus === "failed"
                      ? "bg-rose-400/10 text-rose-200"
                      : "bg-cyan-400/10 text-cyan-200"
                }`}
              >
                {document.ingestionStatus}
              </span>
            </div>
            <p className="mt-4 line-clamp-4 text-sm leading-6 text-slate-400">{document.textPreview}</p>
            {document.ingestionError ? (
              <p className="mt-3 text-sm text-rose-300">{document.ingestionError}</p>
            ) : null}
            <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
              <span>{new Date(document.createdAt).toLocaleString()}</span>
              <button onClick={() => remove(document._id)} className="btn-danger px-3" title="Delete document">
                <Trash2 size={15} />
              </button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
};

export default DocumentsPage;
