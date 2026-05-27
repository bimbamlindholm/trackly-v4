import { Link } from "react-router-dom";

const toneClasses = {
  orange: "text-amber-300 bg-amber-400/10",
  green: "text-emerald-300 bg-emerald-400/10",
  blue: "text-sky-300 bg-sky-400/10",
  purple: "text-violet-300 bg-violet-400/10",
};

function NotificationsPanel({ notifications, onCreateAnnouncement }) {
  return (
    <section className="glass-panel rounded-2xl p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-black text-white">Notifications</h2>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <Link
            to="/admin-dashboard/notifications"
            className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-slate-300 transition hover:border-cyan-300/35 hover:bg-cyan-300/10 hover:text-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-300/40"
          >
            View All
          </Link>
          <button className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-slate-300 transition hover:border-cyan-300/35 hover:bg-cyan-300/10 hover:text-cyan-200" type="button" onClick={onCreateAnnouncement}>
            New Announcement
          </button>
        </div>
      </div>
      <div className="mt-4 divide-y divide-white/10">
        {notifications.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 text-sm leading-6 text-slate-400">
            No notifications yet. Alerts and announcements will appear here when workspace activity starts.
          </div>
        )}
        {notifications.map(({ icon: Icon, text, time, tone }) => (
          <div key={text} className="flex items-center gap-3 py-4 transition hover:translate-x-1">
            <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${toneClasses[tone]}`}>
              <Icon size={20} />
            </div>
            <p className="min-w-0 flex-1 text-sm font-semibold text-white">{text}</p>
            <span className="text-xs text-slate-400">{time}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default NotificationsPanel;
