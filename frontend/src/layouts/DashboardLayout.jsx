import { BarChart3, Bot, FileText, LogOut, ScrollText, ShieldCheck } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const navItems = [
  { to: "/app/chat", label: "Chat", icon: Bot },
  { to: "/app/documents", label: "Documents", icon: FileText },
  { to: "/app/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/app/logs", label: "Audit Logs", icon: ScrollText, adminOnly: true }
];

const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const canViewAdmin = ["admin", "developer"].includes(user?.role);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-72 border-r border-white/10 bg-slate-950/95 px-5 py-6 lg:block">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-lg bg-purple-500/20 text-purple-200">
            <ShieldCheck size={24} />
          </div>
          <div>
            <p className="text-lg font-black tracking-wide">RAGNEXUS AI</p>
            <p className="text-xs text-slate-400">Knowledge Intelligence</p>
          </div>
        </div>

        <nav className="mt-10 space-y-2">
          {navItems
            .filter((item) => !item.adminOnly || canViewAdmin)
            .map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                      isActive
                        ? "bg-purple-500 text-white"
                        : "text-slate-300 hover:bg-white/5 hover:text-white"
                    }`
                  }
                >
                  <Icon size={18} />
                  {item.label}
                </NavLink>
              );
            })}
        </nav>

        <div className="absolute bottom-6 left-5 right-5">
          <div className="rounded-lg border border-white/10 bg-white/5 p-3">
            <p className="truncate text-sm font-semibold text-white">{user?.name}</p>
            <p className="truncate text-xs text-slate-400">{user?.email}</p>
            <p className="mt-2 inline-flex rounded-md bg-cyan-400/10 px-2 py-1 text-xs font-semibold text-cyan-200">
              {user?.role}
            </p>
          </div>
          <button onClick={logout} className="btn-secondary mt-3 w-full">
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>

      <header className="sticky top-0 z-10 border-b border-white/10 bg-slate-950/90 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-black tracking-wide">RAGNEXUS AI</p>
            <p className="text-xs text-slate-400">{user?.role}</p>
          </div>
          <button onClick={logout} className="btn-secondary px-3">
            <LogOut size={16} />
          </button>
        </div>
        <nav className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {navItems
            .filter((item) => !item.adminOnly || canViewAdmin)
            .map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold ${
                      isActive ? "bg-purple-500 text-white" : "bg-white/5 text-slate-300"
                    }`
                  }
                >
                  <Icon size={15} />
                  {item.label}
                </NavLink>
              );
            })}
        </nav>
      </header>

      <main className="lg:pl-72">
        <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
