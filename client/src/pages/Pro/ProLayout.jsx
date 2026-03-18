import React from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, User, Sparkles, Video, LogOut } from "lucide-react";
import { useAuthStore } from "../../store";

export default function ProLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const nav = [
    { to: "/pro", label: "Dashboard", icon: LayoutDashboard },
    { to: "/pro/models", label: "Models", icon: User },
    { to: "/pro/nsfw", label: "NSFW Studio", icon: Sparkles },
    { to: "/pro/generation", label: "Generation Studio", icon: Video },
  ];

  return (
    <div className="pro-studio min-h-screen flex relative overflow-hidden" style={{ background: "var(--pro-bg)", color: "var(--pro-text)" }}>
      {/* Background: subtle gradient mesh + grain */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.4]"
          style={{
            background:
              "radial-gradient(ellipse 70% 50% at 70% 20%, rgba(245, 158, 11, 0.06) 0%, transparent 50%), radial-gradient(ellipse 50% 40% at 20% 80%, rgba(255,255,255,0.02) 0%, transparent 50%)",
          }}
        />
        <div className="pro-grain absolute inset-0" aria-hidden="true" />
      </div>

      {/* Sidebar */}
      <aside
        className="relative w-60 shrink-0 flex flex-col z-10"
        style={{
          background: "var(--pro-surface)",
          borderRight: "1px solid var(--pro-border)",
          boxShadow: "4px 0 24px rgba(0,0,0,0.2)",
        }}
      >
        <div className="p-5 border-b border-[var(--pro-border)]">
          <h1 className="text-base font-semibold tracking-tight" data-pro-heading style={{ color: "var(--pro-text)" }}>
            Pro Studio
          </h1>
          <p className="text-xs mt-1" style={{ color: "var(--pro-text-muted)" }}>
            Invite-only
          </p>
        </div>
        <nav className="flex-1 p-3 space-y-0.5" aria-label="Pro Studio navigation">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/pro"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pro-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--pro-surface)] ${
                  isActive
                    ? "bg-[var(--pro-surface-elevated)] text-[var(--pro-text)] border border-[var(--pro-border-strong)] shadow-sm"
                    : "text-[var(--pro-text-muted)] hover:bg-white/[0.04] hover:text-[var(--pro-text)] border border-transparent"
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" aria-hidden />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-[var(--pro-border)]">
          <p className="text-xs truncate px-2" style={{ color: "var(--pro-text-muted)" }} title={user?.email}>
            {user?.email}
          </p>
          <button
            type="button"
            onClick={() => {
              logout();
              navigate("/login");
            }}
            className="mt-2 flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pro-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--pro-surface)]"
            style={{ color: "var(--pro-text-muted)" }}
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" aria-hidden />
            Sign out
          </button>
        </div>
      </aside>

      <main className="relative flex-1 overflow-auto z-[1]">
        <Outlet />
      </main>
    </div>
  );
}
