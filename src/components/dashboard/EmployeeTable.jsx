import { MoreVertical } from "lucide-react";
import { useMemo, useState } from "react";

function EmployeeTable({
  employees,
  records,
  onRemove,
  onViewProfile,
  onViewAttendance,
}) {
  const [openMenu, setOpenMenu] = useState(null);

  const employeeRows = useMemo(() => {
    return employees.map((employee) => {
      const attendance =
        records.find((record) => record.employeeId === employee.id) || {};

      return {
        ...employee,
        attendance,
      };
    });
  }, [employees, records]);

  return (
    <section className="glass-panel rounded-3xl p-4 sm:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-2xl font-black text-white">
            Employee Overview
          </h2>

          <p className="mt-1 text-sm text-slate-400">
            Monitor employee attendance and workspace activity.
          </p>
        </div>

        <button
          type="button"
          className="w-full rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-slate-200 transition hover:bg-white/5 sm:w-auto"
        >
          View All
        </button>
      </div>

      <div className="grid gap-4">
        {employeeRows.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-slate-400">
            No employees yet.
          </div>
        )}

        {employeeRows.map((employee) => (
          <div
            key={employee.id}
            className="relative flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-cyan-300/25 hover:bg-cyan-300/[0.03] sm:flex-row sm:items-center"
          >
            <div className="flex min-w-0 flex-1 items-center gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-cyan-300 to-violet-500 text-lg font-black text-white">
                {employee.fullName?.charAt(0)?.toUpperCase() || "U"}
              </div>

              <div className="min-w-0">
                <p className="truncate text-lg font-black text-white">
                  {employee.fullName}
                </p>

                <p className="truncate text-sm text-slate-400">
                  {employee.email}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {employee.department || "No department yet"} |{" "}
                  {employee.position || "No position yet"}
                </p>
              </div>
            </div>

            <div className="grid w-full grid-cols-2 gap-4 text-sm sm:w-auto sm:grid-cols-none sm:flex sm:flex-wrap sm:items-center sm:gap-5">
              <div className="min-w-0">
                <p className="text-slate-500">Status</p>

                <span
                  className={`mt-1 inline-flex rounded-lg px-2 py-1 text-xs font-black ${
                    employee.attendance?.status === "Working"
                      ? "bg-emerald-400/15 text-emerald-300"
                      : employee.attendance?.status === "Late"
                      ? "bg-amber-400/15 text-amber-300"
                      : employee.attendance?.status === "On Break"
                      ? "bg-violet-400/15 text-violet-300"
                      : employee.attendance?.status === "Completed"
                      ? "bg-sky-400/15 text-sky-300"
                      : "bg-slate-400/15 text-slate-300"
                  }`}
                >
                  {employee.attendance?.status || "Offline"}
                </span>

                {employee.attendance?.lateMinutes > 0 && (
                  <p className="mt-1 text-xs text-amber-300">
                    {employee.attendance.lateMinutes}m late, currently present
                  </p>
                )}
              </div>

              <div className="min-w-0">
                <p className="text-slate-500">Time In</p>

                <p className="mt-1 font-semibold text-white">
                  {employee.attendance?.timeIn || "-"}
                </p>
              </div>

              <div className="min-w-0">
                <p className="text-slate-500">Break</p>

                <p className="mt-1 truncate font-semibold text-white">
                  {employee.attendance?.breakIn
                    ? `${employee.attendance.breakIn} - ${
                        employee.attendance.breakOut || "..."
                      }`
                    : "-"}
                </p>
              </div>

              <div className="min-w-0">
                <p className="text-slate-500">Hours</p>

                <p className="mt-1 font-semibold text-white">
                  {employee.attendance?.totalHours || "0h 00m"}
                </p>
              </div>

              <div className="min-w-0">
                <p className="text-slate-500">Role</p>

                <p className="mt-1 font-semibold text-white">
                  {employee.role || "Employee"}
                </p>
              </div>
            </div>

            <div className="relative ml-auto self-end sm:self-auto">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setOpenMenu((current) =>
                    current === employee.id ? null : employee.id,
                  );
                }}
                className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 text-slate-300 transition hover:bg-white/5"
              >
                <MoreVertical size={18} />
              </button>

              {openMenu === employee.id && (
                <div className="absolute right-0 top-14 z-20 grid min-w-[220px] overflow-hidden rounded-2xl border border-white/10 bg-[#07111F]/95 p-2 shadow-2xl backdrop-blur-xl">
                  <button
                    className="rounded-lg px-3 py-2 text-left text-xs font-bold text-slate-200 transition hover:bg-white/5"
                    onClick={(event) => {
                      event.stopPropagation();
                      onViewProfile(employee);
                      setOpenMenu(null);
                    }}
                    type="button"
                  >
                    View Profile
                  </button>

                  <button
                    className="rounded-lg px-3 py-2 text-left text-xs font-bold text-slate-200 transition hover:bg-white/5"
                    onClick={(event) => {
                      event.stopPropagation();
                      onViewAttendance(employee);
                      setOpenMenu(null);
                    }}
                    type="button"
                  >
                    View Attendance
                  </button>

                  <button
                    className="rounded-lg px-3 py-2 text-left text-xs font-bold text-rose-300 transition hover:bg-rose-400/10"
                    onClick={(event) => {
                      event.stopPropagation();
                      onRemove(employee.id);
                      setOpenMenu(null);
                    }}
                    type="button"
                  >
                    Remove Employee
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default EmployeeTable;
