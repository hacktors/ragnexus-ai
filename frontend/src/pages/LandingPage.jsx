import { ArrowRight, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";
import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const LandingPage = () => {
  const { isAuthenticated, login, register } = useAuth();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/app/chat" replace />;
  }

  const update = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (mode === "login") {
        await login({ email: form.email, password: form.password });
      } else {
        await register(form);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto grid min-h-screen w-full max-w-7xl items-center gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
        <section className="space-y-8">
          <div className="inline-flex items-center gap-2 rounded-lg border border-purple-300/20 bg-purple-400/10 px-3 py-2 text-sm font-semibold text-purple-100">
            <ShieldCheck size={16} />
            Enterprise RAG with adaptive correction memory
          </div>

          <div>
            <h1 className="max-w-4xl text-5xl font-black leading-tight text-white sm:text-6xl">
              RAGNEXUS AI
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
              Secure knowledge retrieval, citation-anchored answers, document intelligence, and
              reinforcement feedback loops in one operational workspace.
            </p>
          </div>

          <div className="grid max-w-3xl gap-3 sm:grid-cols-3">
            {[
              ["Grounded", "ChromaDB vector retrieval with explicit source JSON."],
              ["Adaptive", "Negative corrections become immediate few-shot memory."],
              ["Audited", "Logs, feedback ratios, and exportable tuning data."]
            ].map(([title, detail]) => (
              <div key={title} className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
                <Sparkles className="text-cyan-300" size={18} />
                <p className="mt-3 font-bold text-white">{title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">{detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="panel rounded-lg p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black">{mode === "login" ? "Sign in" : "Create account"}</h2>
              <p className="mt-1 text-sm text-slate-400">Backend-issued JWT, no frontend secrets.</p>
            </div>
            <LockKeyhole className="text-purple-300" size={28} />
          </div>

          <div className="mt-6 grid grid-cols-2 rounded-lg border border-white/10 bg-slate-950 p-1">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`rounded-md px-3 py-2 text-sm font-bold ${mode === "login" ? "bg-purple-500 text-white" : "text-slate-400"}`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`rounded-md px-3 py-2 text-sm font-bold ${mode === "register" ? "bg-purple-500 text-white" : "text-slate-400"}`}
            >
              Register
            </button>
          </div>

          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === "register" ? (
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-300">Name</span>
                <input value={form.name} onChange={update("name")} className="input" required />
              </label>
            ) : null}
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-300">Email</span>
              <input
                type="email"
                value={form.email}
                onChange={update("email")}
                className="input"
                required
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-300">Password</span>
              <input
                type="password"
                value={form.password}
                onChange={update("password")}
                className="input"
                minLength={10}
                required
              />
            </label>
            {error ? <p className="rounded-lg bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p> : null}
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "Working..." : mode === "login" ? "Enter Workspace" : "Create Workspace"}
              <ArrowRight size={16} />
            </button>
          </form>
        </section>
      </div>
    </div>
  );
};

export default LandingPage;
