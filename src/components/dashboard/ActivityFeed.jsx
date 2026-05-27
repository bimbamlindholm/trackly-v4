import { Link } from "react-router-dom";

const statusClasses = {
  Working: "bg-emerald-400/15 text-emerald-300",
  Present: "bg-emerald-400/15 text-emerald-300",
  "On Break": "bg-violet-400/15 text-violet-300",
  Late: "bg-amber-400/15 text-amber-300",
  Offline: "bg-slate-400/15 text-slate-300",
  Completed: "bg-sky-400/15 text-sky-300",
};

function ActivityFeed({ activities, viewAllTo = "/admin-dashboard/attendance" }) {
  return (
    <section className="glass-panel rounded-2xl p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black text-white">Activity Feed</h2>
        <Link
          to={viewAllTo}
          className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-slate-300 transition hover:border-cyan-300/35 hover:bg-cyan-300/10 hover:text-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-300/40"
        >
          View All
        </Link>
      </div>
      <div className="mt-4 divide-y divide-white/10">
        {activities.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 text-sm leading-6 text-slate-400">
            No activity yet. Attendance events will appear here once employees start using Trackly.
          </div>
        )}
        {activities.map((activity) => (
          <div key={activity.id || `${activity.name}-${activity.action}-${activity.time}`} className="flex items-center gap-2.5 py-3 sm:gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-cyan-300 to-violet-500 text-xs font-black sm:h-10 sm:w-10">
              {activity.name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white">{activity.name}</p>
              <span className={`mt-1 inline-block rounded-lg px-2 py-1 text-[0.68rem] font-black ${statusClasses[activity.status]}`}>
                {activity.action}
              </span>
              {activity.subtitle && <p className="mt-1 truncate text-xs text-slate-500">{activity.subtitle}</p>}
            </div>
            <span className="shrink-0 text-xs text-slate-400">{activity.time}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default ActivityFeed;
