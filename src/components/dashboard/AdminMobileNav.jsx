import { BarChart3, Clock3, Home, Settings, UsersRound } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const mobileItems = [
  { icon: Home, label: "Home", to: "/admin-dashboard" },
  { icon: UsersRound, label: "Team", to: "/admin-dashboard/employees" },
  { icon: Clock3, label: "Time", to: "/admin-dashboard/attendance" },
  { icon: BarChart3, label: "Reports", to: "/admin-dashboard/reports" },
  { icon: Settings, label: "Settings", to: "/admin-dashboard/settings" },
];

function AdminMobileNav() {
  const location = useLocation();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#07111F]/92 px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 shadow-[0_-18px_50px_rgba(6,182,212,0.08)] backdrop-blur-2xl lg:hidden">
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
        {mobileItems.map(({ icon: Icon, label, to }) => {
          const active = location.pathname === to;

          return (
            <Link
              key={label}
              to={to}
              className={`grid min-h-[52px] place-items-center rounded-xl px-1 py-2 text-[0.65rem] font-black transition focus:outline-none focus:ring-2 focus:ring-cyan-300/40 sm:rounded-2xl sm:text-[0.68rem] ${
                active
                  ? "bg-cyan-300/12 text-cyan-200 shadow-[0_0_22px_rgba(6,182,212,0.12)]"
                  : "text-slate-400 hover:bg-white/[0.04] hover:text-cyan-200"
              }`}
            >
              <Icon size={20} className={active ? "text-cyan-300" : ""} />
              <span className="mt-1 leading-none">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default AdminMobileNav;
