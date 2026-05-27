import { useMemo } from "react";
import AdminBaseModal from "./AdminBaseModal";
import { buildAttendanceRowsForRange, todayKey } from "../../../utils/supabaseAttendance";

/**
 * Profile detail viewer for employees in a workspace.
 * Displays details such as department, position, contact info, and an attendance summary aggregate.
 */
export default function ProfileModal({ employee, records, rules, onClose }) {
  const employeeRecords = useMemo(() => {
    const employeeRawEvents = records.filter((record) => record.employeeId === employee.id);
    const dates = [...new Set(employeeRawEvents.map((r) => r.date))].sort();
    const startDate = dates[0] || todayKey();
    const endDate = dates[dates.length - 1] || todayKey();
    return buildAttendanceRowsForRange(
      employeeRawEvents,
      [employee],
      startDate,
      endDate,
      rules
    );
  }, [employee, records, rules]);

  const fields = [
    { key: "fullName", label: "Full Name" },
    { key: "email", label: "Email" },
    { key: "department", label: "Department" },
    { key: "position", label: "Position" },
    { key: "phone", label: "Phone" },
    { key: "address", label: "Address" },
    { key: "joinedAt", label: "Joined At" },
  ];

  const totalLate = useMemo(() => {
    return employeeRecords.filter((record) => record.lateMinutes > 0).length;
  }, [employeeRecords]);

  return (
    <AdminBaseModal title="Employee Profile" onClose={onClose} maxWidth="max-w-md">
      <div className="grid gap-3 text-sm">
        {fields.map(({ key, label }) => (
          <div key={key} className="flex justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.035] p-3 items-center">
            <span className="text-slate-400 font-semibold">{label}</span>
            <span className="text-right font-bold text-white truncate max-w-[200px]" title={employee[key] || ""}>
              {employee[key] || "-"}
            </span>
          </div>
        ))}
        <div className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 p-3.5 text-cyan-100 text-xs font-bold leading-relaxed">
          Attendance summary: {employeeRecords.length} record(s), {totalLate} late shift(s).
        </div>
      </div>
    </AdminBaseModal>
  );
}
