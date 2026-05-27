import { X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { navItems } from "./dashboardData";

function Sidebar({ isOpen, onClose, onLogout }) {
  const location = useLocation();

  return (
    <>
      <button
        type="button"
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition lg:hidden ${isOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={onClose}
        aria-label="Close sidebar overlay"
      />
      <aside
        className={`fixed left-0 top-0 z-50 flex h-dvh max-h-dvh w-[min(88vw,280px)] flex-col overflow-hidden border-r border-white/10 bg-[#07111F]/92 p-4 shadow-[0_0_80px_rgba(6,182,212,0.08)] backdrop-blur-2xl transition-transform duration-300 sm:p-5 lg:w-[280px] lg:translate-x-0 ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex flex-none items-center justify-between">
          <Link to="/admin-dashboard" className="flex items-center gap-3">
            <img src="/trackly-logo.png" alt="Trackly" className="h-11 w-11 object-contain sm:h-12 sm:w-12" />
            <div className="leading-none">
              <span className="block text-lg font-black tracking-wide text-white sm:text-xl">TRACKLY</span>
              <span className="text-[0.55rem] font-bold uppercase tracking-[0.22em] text-cyan-300 sm:text-[0.58rem] sm:tracking-[0.28em]">
                Track Time. Grow Better.
              </span>
            </div>
          </Link>
          <button className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 lg:hidden" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </div>

        <div className="mt-5 min-h-0 flex-1 overflow-y-auto pb-4 pr-1 [scrollbar-gutter:stable] sm:mt-7">
          <nav className="grid gap-2">
            {navItems.map(({ icon: Icon, label, to, badge }) => {
              const active = location.pathname === to;

              return (
                <Link
                  key={label}
                  to={to}
                  onClick={onClose}
                  className={`group flex h-[52px] items-center justify-between rounded-xl px-4 py-4 text-left transition hover:border-cyan-300/25 hover:bg-cyan-300/8 hover:text-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-300/40 ${
                    active
                      ? "border border-cyan-300/40 bg-gradient-to-r from-cyan-300/16 to-violet-500/12 text-white shadow-[0_0_28px_rgba(6,182,212,0.12)]"
                      : "text-slate-300"
                  }`}
                >
                  <span className="flex items-center gap-3 font-semibold">
                    <Icon size={20} className={active ? "text-cyan-300" : "text-slate-400 group-hover:text-cyan-300"} />
                    {label}
                  </span>
                  {badge && <span className="rounded-full bg-violet-500/20 px-2 py-1 text-[0.65rem] font-bold text-violet-200">{badge}</span>}
                </Link>
              );
            })}
          </nav>

        </div>

        <div className="grid flex-none gap-2 border-t border-white/10 bg-[#07111F]/70 pt-4">
          <Link
            to="/admin-dashboard/profile"
            onClick={onClose}
            className="rounded-xl px-4 py-3 text-left font-semibold text-slate-300 transition hover:bg-white/5 hover:text-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-300/40"
          >
            Profile
          </Link>
          <button
            onClick={onLogout}
            className="rounded-xl px-4 py-3 text-left font-semibold text-slate-300 transition hover:bg-rose-400/10 hover:text-rose-200"
            type="button"
          >
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
