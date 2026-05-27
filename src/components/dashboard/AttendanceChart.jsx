import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

function AttendanceChart({ data, summary }) {
  const displayedData = data;
  const hasData = displayedData.some((item) => item.attendance > 0);

  return (
    <section className="glass-panel rounded-2xl p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-black text-white">Weekly Attendance Overview</h2>
        <span className="rounded-xl border border-white/10 bg-[#0B1424] px-3 py-2 text-xs font-bold text-slate-300">
          This Week
        </span>
      </div>
      <div className="mt-5 h-52 sm:h-56">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={displayedData}>
              <defs>
                <linearGradient id="attendanceBar" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#22D3EE" />
                  <stop offset="100%" stopColor="#7C3AED" />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
              <XAxis dataKey="day" stroke="#94A3B8" tickLine={false} axisLine={false} />
              <YAxis stroke="#94A3B8" tickLine={false} axisLine={false} width={28} />
              <Tooltip
                cursor={{ fill: "rgba(6,182,212,0.08)" }}
                contentStyle={{
                  background: "#0B1424",
                  border: "1px solid rgba(148,163,184,0.2)",
                  borderRadius: "12px",
                  color: "#F8FAFC",
                }}
              />
              <Bar dataKey="attendance" fill="url(#attendanceBar)" radius={[8, 8, 8, 8]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="grid h-full place-items-center rounded-2xl border border-white/10 bg-white/[0.035] text-center text-sm leading-6 text-slate-400">
            Weekly attendance will appear here once employees have records.
          </div>
        )}
      </div>
      <div className="mt-5 grid gap-3 min-[420px]:grid-cols-3">
        <Summary label="Avg. Attendance" value={summary.avgAttendance} />
        <Summary label="Total Hours" value={summary.totalHours} />
        <Summary label="Absent" value={summary.absent} />
      </div>
    </section>
  );
}

function Summary({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-center">
      <p className="text-xl font-black text-cyan-300">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{label}</p>
    </div>
  );
}

export default AttendanceChart;
