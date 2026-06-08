const StatCard = ({ label, value, accent = "purple", detail }) => {
  const accentClass =
    accent === "cyan"
      ? "from-cyan-400 to-blue-500"
      : accent === "emerald"
        ? "from-emerald-400 to-teal-500"
        : accent === "rose"
          ? "from-rose-400 to-fuchsia-500"
          : "from-purple-400 to-indigo-500";

  return (
    <div className="panel rounded-lg p-4">
      <div className={`h-1.5 w-14 rounded-full bg-gradient-to-r ${accentClass}`} />
      <p className="mt-4 text-sm text-slate-400">{label}</p>
      <p className="mt-1 text-3xl font-black text-white">{value}</p>
      {detail ? <p className="mt-2 text-xs text-slate-500">{detail}</p> : null}
    </div>
  );
};

export default StatCard;
