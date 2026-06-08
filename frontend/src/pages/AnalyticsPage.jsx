import { Download } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { analyticsApi, evaluationApi } from "../api/ragnexusApi.js";
import StatCard from "../components/StatCard.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const pieColors = ["#34d399", "#fb7185"];

const AnalyticsPage = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const { user } = useAuth();
  const canExport = ["admin", "developer"].includes(user?.role);

  useEffect(() => {
    analyticsApi
      .get(14)
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  const exportDataset = async () => {
    setExporting(true);
    setError("");
    try {
      const { blob } = await evaluationApi.exportFineTune();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `ragnexus-fine-tune-${new Date().toISOString().slice(0, 10)}.jsonl`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setExporting(false);
    }
  };

  const metrics = data?.metrics || {};

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-black">Analytics Panel</h1>
          <p className="mt-1 text-sm text-slate-400">
            Metrics are calculated directly from MongoDB chat, document, and feedback records.
          </p>
        </div>
        {canExport ? (
          <button onClick={exportDataset} disabled={exporting} className="btn-primary">
            <Download size={16} />
            Export Fine-Tune JSONL
          </button>
        ) : null}
      </section>

      {error ? <p className="rounded-lg bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p> : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Queries" value={metrics.totalQueries || 0} accent="purple" />
        <StatCard label="Ready Documents" value={metrics.documentsReady || 0} accent="cyan" />
        <StatCard label="Positive Ratio" value={`${Math.round((metrics.positiveFeedbackRatio || 0) * 100)}%`} accent="emerald" />
        <StatCard label="Avg Latency" value={`${metrics.averageLatencyMs || 0} ms`} accent="rose" />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.4fr_0.8fr]">
        <div className="panel rounded-lg p-4">
          <h2 className="text-lg font-black">Query Volume</h2>
          <div className="mt-4 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.queriesByDay || []}>
                <CartesianGrid stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ background: "#020617", border: "1px solid #334155" }} />
                <Bar dataKey="queries" fill="#a855f7" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel rounded-lg p-4">
          <h2 className="text-lg font-black">Feedback Ratio</h2>
          <div className="mt-4 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data?.feedbackBreakdown || []} dataKey="value" nameKey="name" outerRadius={105}>
                  {(data?.feedbackBreakdown || []).map((entry, index) => (
                    <Cell key={entry.name} fill={pieColors[index % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "#020617", border: "1px solid #334155" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="panel rounded-lg p-4">
        <h2 className="text-lg font-black">Latency Trend</h2>
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data?.queriesByDay || []}>
              <CartesianGrid stroke="#1e293b" />
              <XAxis dataKey="date" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip contentStyle={{ background: "#020617", border: "1px solid #334155" }} />
              <Line type="monotone" dataKey="avgLatencyMs" stroke="#22d3ee" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
};

export default AnalyticsPage;
