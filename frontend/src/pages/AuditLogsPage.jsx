import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { logsApi } from "../api/ragnexusApi.js";

const levels = ["", "audit", "security", "info", "warn", "error"];

const AuditLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [level, setLevel] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await logsApi.list({ level });
      setLogs(result.logs);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [level]);

  return (
    <div className="space-y-5">
      <section className="panel rounded-lg p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-black">Admin Audit Logs</h1>
            <p className="mt-1 text-sm text-slate-400">Security, auth, ingestion, and feedback events.</p>
          </div>
          <div className="flex gap-3">
            <select value={level} onChange={(event) => setLevel(event.target.value)} className="input w-40">
              {levels.map((item) => (
                <option key={item || "all"} value={item}>
                  {item || "all"}
                </option>
              ))}
            </select>
            <button onClick={load} disabled={loading} className="btn-secondary">
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>
        </div>
        {error ? <p className="mt-4 rounded-lg bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p> : null}
      </section>

      <section className="panel overflow-hidden rounded-lg">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="border-b border-white/10 bg-white/[0.03] text-xs uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Level</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Message</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log._id} className="border-b border-white/5">
                  <td className="px-4 py-3 text-slate-400">{new Date(log.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-md bg-purple-400/10 px-2 py-1 text-xs font-bold text-purple-200">
                      {log.level}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-white">{log.action}</td>
                  <td className="px-4 py-3 text-slate-300">{log.actor?.email || "system"}</td>
                  <td className="px-4 py-3 text-slate-300">{log.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default AuditLogsPage;
