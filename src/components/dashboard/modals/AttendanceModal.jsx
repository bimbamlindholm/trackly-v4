import { useState, useMemo } from "react";
import AdminBaseModal from "./AdminBaseModal";
import { buildAttendanceRowsForRange } from "../../../utils/supabaseAttendance";

/**
 * Interactive DTR attendance sheet view for specific employees in a workspace.
 * Allows administrators to filter record history by date range, reviewing daily clock-in/break details.
 */
export default function AttendanceModal({ employee, records, rules, onClose }) {
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  });

  const [endDate, setEndDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
      new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(),
    ).padStart(2, "0")}`;
  });

  const employeeRecords = useMemo(() => {
    return buildAttendanceRowsForRange(
      records.filter((record) => record.employeeId === employee.id),
      [employee],
      startDate,
      endDate,
      rules
    );
  }, [records, employee, startDate, endDate, rules]);

  const stats = useMemo(() => {
    const totalMinutes = employeeRecords.reduce((total, record) => {
      const match = String(record.totalHours || "").match(/(\d+)h\s+(\d+)m/);
      if (!match) return total;
      return total + Number(match[1]) * 60 + Number(match[2]);
    }, 0);

    const totalLateMinutes = employeeRecords.reduce(
      (total, record) => total + (record.lateMinutes || 0),
      0
    );

    const completedDays = employeeRecords.filter(
      (record) => record.status === "Completed"
    ).length;

    const totalHoursFormatted = `${Math.floor(totalMinutes / 60)}h ${String(
      totalMinutes % 60,
    ).padStart(2, "0")}m`;

    return {
      totalHoursFormatted,
      totalLateMinutes,
      completedDays,
    };
  }, [employeeRecords]);

  return (
    <AdminBaseModal title={`${employee.fullName} Attendance Logs`} onClose={onClose} maxWidth="max-w-6xl">
      <div className="grid gap-5">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="h-12 w-full rounded-xl border border-white/10 bg-slate-900 px-4 text-sm text-white outline-none transition focus:border-cyan-300/40"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="h-12 w-full rounded-xl border border-white/10 bg-slate-900 px-4 text-sm text-white outline-none transition focus:border-cyan-300/40"
            />
          </div>
        </div>

        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-cyan-200">
              Records
            </p>
            <p className="mt-2 text-2xl font-black text-white">
              {employeeRecords.length}
            </p>
          </div>

          <div className="rounded-2xl border border-violet-300/20 bg-violet-400/10 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-violet-200">
              Total Hours
            </p>
            <p className="mt-2 text-2xl font-black text-white">
              {stats.totalHoursFormatted}
            </p>
          </div>

          <div className="rounded-2xl border border-amber-300/20 bg-amber-400/10 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-amber-200">
              Total Late
            </p>
            <p className="mt-2 text-2xl font-black text-white">
              {stats.totalLateMinutes}m
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-emerald-200">
              Completed
            </p>
            <p className="mt-2 text-2xl font-black text-white">
              {stats.completedDays}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#0E1726]/20">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="bg-white/[0.04] text-slate-400">
              <tr>
                <th className="px-4 py-3 font-bold">Date</th>
                <th className="px-4 py-3 font-bold">Time In</th>
                <th className="px-4 py-3 font-bold">Break In</th>
                <th className="px-4 py-3 font-bold">Break Out</th>
                <th className="px-4 py-3 font-bold">Time Out</th>
                <th className="px-4 py-3 font-bold">Status</th>
                <th className="px-4 py-3 font-bold">Late</th>
                <th className="px-4 py-3 font-bold">Hours</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/10">
              {employeeRecords.length === 0 && (
                <tr>
                  <td
                    colSpan="8"
                    className="px-4 py-10 text-center text-sm text-slate-400"
                  >
                    No attendance records in selected range.
                  </td>
                </tr>
              )}

              {employeeRecords.map((record) => (
                <tr
                  key={record.id}
                  className="transition hover:bg-cyan-300/[0.03]"
                >
                  <td className="px-4 py-3 text-white font-semibold">{record.date}</td>
                  <td className="px-4 py-3 text-slate-300">{record.timeIn || "-"}</td>
                  <td className="px-4 py-3 text-slate-300">{record.breakIn || "-"}</td>
                  <td className="px-4 py-3 text-slate-300">{record.breakOut || "-"}</td>
                  <td className="px-4 py-3 text-slate-300">{record.timeOut || "-"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-lg px-2 py-1 text-xs font-black ${
                        record.status === "Working"
                          ? "bg-emerald-400/15 text-emerald-300"
                          : record.status === "Late"
                          ? "bg-amber-400/15 text-amber-300"
                          : record.status === "On Break"
                          ? "bg-violet-400/15 text-violet-300"
                          : record.status === "Completed"
                          ? "bg-sky-400/15 text-sky-300"
                          : "bg-slate-400/15 text-slate-300"
                      }`}
                    >
                      {record.status || "Offline"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-amber-200">
                    {record.lateMinutes > 0 ? `${record.lateMinutes}m` : "-"}
                  </td>
                  <td className="px-4 py-3 font-bold text-cyan-100">
                    {record.totalHours || "0h 00m"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminBaseModal>
  );
}
