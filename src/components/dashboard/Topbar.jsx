import { Bell, CalendarDays, Menu } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabaseClient";
import { todayKey } from "../../utils/supabaseAttendance";

function Topbar({ onMenuClick }) {
  const { profile, workspace } = useAuth();
  const [notificationCount, setNotificationCount] = useState(0);
  const currentDate = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const currentDay = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const adminName = profile?.full_name || "Workspace Admin";
  const initial = adminName.slice(0, 1).toUpperCase();


  useEffect(() => {
    async function loadNotificationCount() {
      if (!supabase || !workspace?.id) {
        setNotificationCount(0);
        return;
      }

      const { count } = await supabase
          .from("attendance_records")
          .select("id", { count: "exact", head: true })
          .eq("workspace_id", workspace.id)
          .eq("date", todayKey());

      setNotificationCount(count || 0);
    }

    loadNotificationCount();
  }, [workspace?.id]);

  return (
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#07111F]/82 px-3 py-3 backdrop-blur-2xl sm:px-6 lg:px-8 lg:py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <button
                type="button"
                onClick={onMenuClick}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-white lg:hidden"
                aria-label="Open sidebar"
            >
              <Menu size={21} />
            </button>
            <div className="min-w-0 md:hidden">
              <p className="truncate text-sm font-black text-white">Trackly Admin</p>
              <p className="truncate text-[0.68rem] font-bold uppercase tracking-[0.18em] text-cyan-300">
                {currentDay}
              </p>
            </div>
            <div className="hidden items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-300 md:flex">
              <CalendarDays size={17} className="text-cyan-300" />
              {currentDate} <span className="text-slate-600">|</span> {currentDay}
            </div>
          </div>

          <div className="flex min-w-0 items-center gap-2 sm:gap-3">


            <Link
                to="/admin-dashboard/notifications"
                className="relative grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-200 transition hover:border-cyan-300/35 hover:bg-cyan-300/10 focus:outline-none focus:ring-2 focus:ring-cyan-300/40"
                aria-label="Notifications"
            >
              <Bell size={19} />
              {notificationCount > 0 && (
                  <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-violet-500 text-[0.65rem] font-black">
                {notificationCount}
              </span>
              )}
            </Link>
            <Link
                to="/admin-dashboard/profile"
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-2 transition hover:border-cyan-300/35 hover:bg-cyan-300/10 focus:outline-none focus:ring-2 focus:ring-cyan-300/40 sm:px-3"
            >
              {profile?.face_photo ? (
                <img
                  src={profile.face_photo}
                  alt={adminName}
                  className="h-10 w-10 rounded-full object-cover border border-cyan-300/40"
                />
              ) : (
                <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-cyan-300 to-violet-500 text-sm font-black text-white">
                  {initial}
                </div>
              )}
              <div className="hidden leading-tight sm:block">
                <p className="text-sm font-black text-white flex items-center gap-1.5">
                  {adminName}
                </p>
                <p className="text-xs text-slate-400">Admin</p>
              </div>
            </Link>
          </div>
        </div>
      </header>
  );
}

export default Topbar;
