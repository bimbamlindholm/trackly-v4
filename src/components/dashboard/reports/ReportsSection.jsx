import { useEffect, useMemo, useState } from "react";
import { Download, ShieldAlert } from "lucide-react";
import {
  buildAttendanceCsvRows,
  buildAttendanceRowsForRange,
  formatAttendanceDate,
  summarizeAttendanceRows,
  todayKey,
} from "../../../utils/supabaseAttendance";
import { exportCsv } from "../../../utils/tracklyStorage";

function filterRowsByReportPeriod(rows, period, today) {
  if (period === "all") return rows;
  const now = new Date(`${today}T00:00:00`);

  return rows.filter((row) => {
    const rowDate = new Date(`${row.date}T00:00:00`);
    if (period === "daily") return row.date === today;
    if (period === "weekly") {
      const diffDays = Math.floor((now - rowDate) / 86400000);
      return diffDays >= 0 && diffDays < 7;
    }
    if (period === "monthly") {
      return rowDate.getFullYear() === now.getFullYear() && rowDate.getMonth() === now.getMonth();
    }
    return true;
  });
}

function formatLogDetails(log, employees) {
  const { action, details } = log;
  if (action === "payroll_approved" || action === "payroll_released") {
    const actionVerb = action === "payroll_approved" ? "Approved" : "Released";
    const netPayStr = details.net_pay !== undefined ? `PHP ${Number(details.net_pay).toLocaleString()}` : "N/A";
    return `${actionVerb} payroll batch for period ${details.start_date} to ${details.end_date}. Total net pay: ${netPayStr} for ${details.employees_count || 0} employees.`;
  }
  if (action === "correction_approved" || action === "correction_rejected") {
    const actionVerb = action === "correction_approved" ? "Approved" : "Rejected";
    const empName = employees.find((emp) => emp.id === details.employee_id)?.fullName || details.employee_id || "Employee";
    const reqType = details.request_type || "Correction";
    const val = details.requested_value || "N/A";
    return `${actionVerb} DTR correction request (${reqType} → ${val}) for ${empName} on attendance date ${details.date}.`;
  }
  return JSON.stringify(details);
}

function AuditActionBadge({ action }) {
  let label = action.replace(/_/g, " ");
  let colorClass = "border-slate-300/25 bg-slate-300/10 text-slate-100";

  if (action === "payroll_approved") {
    label = "Payroll Approved";
    colorClass = "border-emerald-300/25 bg-emerald-300/10 text-emerald-100";
  } else if (action === "payroll_released") {
    label = "Payroll Released";
    colorClass = "border-cyan-300/25 bg-cyan-300/10 text-cyan-100";
  } else if (action === "correction_approved") {
    label = "Correction Approved";
    colorClass = "border-violet-300/25 bg-violet-300/10 text-violet-100";
  } else if (action === "correction_rejected") {
    label = "Correction Rejected";
    colorClass = "border-rose-300/25 bg-rose-300/10 text-rose-100";
  }

  return (
    <span className={`inline-flex shrink-0 rounded-full border px-2.5 py-0.5 text-[0.65rem] font-black uppercase tracking-wider ${colorClass}`}>
      {label}
    </span>
  );
}

export default function ReportsSection({ employees, records, workspace }) {
  const [activeTab, setActiveTab] = useState("timesheet"); // "timesheet" | "audit"
  const [period, setPeriod] = useState("daily");
  const today = todayKey();
  
  // Timesheet state calculations
  const rows = buildAttendanceRowsForRange(records, employees, "0000-01-01", "9999-12-31", workspace);
  const reportRows = useMemo(() => filterRowsByReportPeriod(rows, period, today), [period, rows, today]);
  const summary = summarizeAttendanceRows(reportRows, workspace);

  // Audit Logs state
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [auditSearchQuery, setAuditSearchQuery] = useState("");
  const [auditActionFilter, setAuditActionFilter] = useState("all");

  useEffect(() => {
    let active = true;
    const loadLogs = async () => {
      if (activeTab !== "audit" || !workspace?.id) return;
      try {
        setLoadingAudit(true);
        const { fetchAuditLogs } = await import("../../../utils/supabaseAuditLogs");
        const logs = await fetchAuditLogs(workspace.id);
        if (active) {
          setAuditLogs(logs);
        }
      } catch (err) {
        console.error("Failed to load audit logs:", err);
      } finally {
        if (active) setLoadingAudit(false);
      }
    };
    loadLogs();
    return () => {
      active = false;
    };
  }, [activeTab, workspace?.id]);

  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      const matchesAction = auditActionFilter === "all" || log.action === auditActionFilter;
      const query = auditSearchQuery.toLowerCase().trim();
      if (!query) return matchesAction;

      const adminName = log.profile?.full_name?.toLowerCase() || "";
      const adminEmail = log.profile?.email?.toLowerCase() || "";
      const actionName = log.action.toLowerCase().replace(/_/g, " ");
      
      const employeeId = log.details?.employee_id;
      const employeeName = employeeId ? (employees.find((emp) => emp.id === employeeId)?.fullName?.toLowerCase() || "") : "";
      
      const matchesSearch =
        adminName.includes(query) ||
        adminEmail.includes(query) ||
        actionName.includes(query) ||
        employeeName.includes(query) ||
        (log.details?.date && log.details.date.includes(query)) ||
        (log.details?.start_date && log.details.start_date.includes(query)) ||
        (log.details?.end_date && log.details.end_date.includes(query));

      return matchesAction && matchesSearch;
    });
  }, [auditLogs, auditActionFilter, auditSearchQuery, employees]);

  const exportAuditCsv = () => {
    const csvRows = [
      ["Timestamp", "Admin Name", "Admin Email", "Action", "Details"],
      ...filteredAuditLogs.map((log) => [
        new Date(log.created_at).toLocaleString(),
        log.profile?.full_name || "System",
        log.profile?.email || "",
        log.action.toUpperCase(),
        formatLogDetails(log, employees),
      ]),
    ];
    exportCsv(`trackly-audit-trail-${today}.csv`, csvRows);
  };

  return (
    <div className="mt-8 min-w-0">
      {/* Tab Selectors */}
      <div className="mb-6 grid w-full max-w-xl grid-cols-2 gap-1.5 rounded-xl border border-white/5 bg-slate-950/40 p-1 sm:w-fit sm:max-w-none sm:flex sm:items-center">
        <button
          onClick={() => setActiveTab("timesheet")}
          className={`flex min-h-10 items-center justify-center gap-2 rounded-lg px-3 py-2 text-center text-xs font-black transition-all sm:px-4 sm:text-sm ${
            activeTab === "timesheet"
              ? "bg-gradient-to-r from-violet-500/20 to-cyan-500/20 border border-cyan-500/30 text-white shadow-sm"
              : "border border-transparent text-slate-400 hover:text-slate-200"
          }`}
          type="button"
        >
          Timesheet Reports
        </button>
        <button
          onClick={() => setActiveTab("audit")}
          className={`flex min-h-10 items-center justify-center gap-2 rounded-lg px-3 py-2 text-center text-xs font-black transition-all sm:px-4 sm:text-sm ${
            activeTab === "audit"
              ? "bg-gradient-to-r from-violet-500/20 to-cyan-500/20 border border-cyan-500/30 text-white shadow-sm"
              : "border border-transparent text-slate-400 hover:text-slate-200"
          }`}
          type="button"
        >
          Security Audit Trail
        </button>
      </div>

      {activeTab === "timesheet" ? (
        <section className="glass-panel rounded-2xl p-4 sm:p-6 animate-fadeIn">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <h2 className="text-xl font-black text-white">Timesheet Reports</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Daily, weekly, monthly, and per-employee summaries from real Supabase attendance records.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <select
                className="h-12 rounded-xl border border-white/10 bg-[#0B1424] px-3 text-sm font-black text-white outline-none focus:border-cyan-300/40"
                onChange={(event) => setPeriod(event.target.value)}
                value={period}
              >
                <option value="daily">Today</option>
                <option value="weekly">This Week</option>
                <option value="monthly">This Month</option>
                <option value="all">All Records</option>
              </select>
              <button
                className="glow-button inline-flex h-12 items-center justify-center gap-2 rounded-xl px-5 text-sm font-black text-white"
                onClick={() => exportCsv(`trackly-${period}-timesheet-${today}.csv`, buildAttendanceCsvRows(reportRows))}
                type="button"
              >
                <Download size={17} /> Export CSV
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryPill label="Timesheet Rows" value={summary.rows} />
            <SummaryPill label="Total Hours" value={summary.totalHours} />
            <SummaryPill label="Completed" value={summary.completedCount} />
            <SummaryPill label="Overtime Ready" value={summary.overtimeHours} />
          </div>

          <div className="mt-5 grid gap-3">
            {reportRows.slice(0, 12).map((row) => (
              <div key={`${row.employeeId}-${row.date}-report`} className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-sm md:grid-cols-[1.1fr_0.9fr_0.8fr_0.8fr] md:items-center transition hover:border-cyan-300/20">
                <div className="min-w-0">
                  <p className="truncate font-black text-white">{row.employeeName}</p>
                  <p className="mt-1 text-xs text-slate-500">{formatAttendanceDate(row.date)}</p>
                </div>
                <p className="text-slate-300">Status: <span className="font-bold text-cyan-100">{row.status}</span></p>
                <p className="text-slate-300">Hours: <span className="font-bold text-white">{row.totalHours}</span></p>
                <p className="text-slate-300">Late: <span className="font-bold text-white">{row.lateMinutes || 0}m</span></p>
              </div>
            ))}
            {reportRows.length === 0 && <p className="rounded-xl border border-white/10 bg-white/[0.035] p-4 text-sm text-slate-400">No report rows for this period.</p>}
          </div>
        </section>
      ) : (
        <section className="glass-panel rounded-2xl p-4 sm:p-6 animate-fadeIn">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <ShieldAlert className="text-cyan-300" size={22} />
                Security Audit Trail
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Verifiable logs of administrative actions, payroll approvals, releases, and DTR correction request decisions.
              </p>
            </div>
            <button
              className="glow-button inline-flex h-12 items-center justify-center gap-2 rounded-xl px-5 text-sm font-black text-white shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
              onClick={exportAuditCsv}
              type="button"
              disabled={filteredAuditLogs.length === 0}
            >
              <Download size={17} /> Export Audit CSV
            </button>
          </div>

          {/* Search and Filters */}
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search by admin name/email, action type, employee name..."
                value={auditSearchQuery}
                onChange={(e) => setAuditSearchQuery(e.target.value)}
                className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.045] px-4 text-sm font-semibold text-white outline-none focus:border-cyan-300/40 focus:ring-2 focus:ring-cyan-300/15"
              />
            </div>
            <div className="w-full sm:w-60 shrink-0">
              <select
                value={auditActionFilter}
                onChange={(e) => setAuditActionFilter(e.target.value)}
                className="h-12 w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 text-sm font-semibold text-white outline-none focus:border-cyan-300/40 focus:ring-2 focus:ring-cyan-300/15"
              >
                <option value="all">All Administrative Actions</option>
                <option value="payroll_approved">Payroll Approved</option>
                <option value="payroll_released">Payroll Released</option>
                <option value="correction_approved">Correction Approved</option>
                <option value="correction_rejected">Correction Rejected</option>
              </select>
            </div>
          </div>

          {/* Logs Output */}
          <div className="mt-5 grid gap-3 md:hidden">
            {loadingAudit && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 text-center text-sm text-slate-400">
                Loading administrative audit trails...
              </div>
            )}
            {!loadingAudit && filteredAuditLogs.length === 0 && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 text-center text-sm leading-6 text-slate-400">
                {auditLogs.length === 0
                  ? "No system audit logs recorded in this workspace."
                  : "No logs matched your search/filter criteria."}
              </div>
            )}
            {!loadingAudit &&
              filteredAuditLogs.map((log) => (
                <article key={log.id} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-black text-white">{log.profile?.full_name || "System/Admin"}</p>
                      <p className="mt-1 truncate text-xs text-slate-500">{log.profile?.email || ""}</p>
                    </div>
                    <AuditActionBadge action={log.action} />
                  </div>
                  <p className="mt-3 text-xs font-semibold text-slate-500">
                    {new Date(log.created_at).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-slate-300">{formatLogDetails(log, employees)}</p>
                </article>
              ))}
          </div>

          <div className="mt-5 hidden overflow-x-auto rounded-2xl border border-white/10 md:block">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-white/[0.04] text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-bold w-48">Timestamp</th>
                  <th className="px-4 py-3 font-bold w-60">Acting Admin</th>
                  <th className="px-4 py-3 font-bold w-48">Action Type</th>
                  <th className="px-4 py-3 font-bold">Action Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {loadingAudit && (
                  <tr>
                    <td colSpan="4" className="px-4 py-10 text-center text-sm text-slate-400">
                      Loading administrative audit trails...
                    </td>
                  </tr>
                )}
                {!loadingAudit && filteredAuditLogs.length === 0 && (
                  <tr>
                    <td colSpan="4" className="px-4 py-10 text-center text-sm text-slate-400">
                      {auditLogs.length === 0
                        ? "No system audit logs recorded in this workspace."
                        : "No logs matched your search/filter criteria."}
                    </td>
                  </tr>
                )}
                {!loadingAudit &&
                  filteredAuditLogs.map((log) => (
                    <tr key={log.id} className="transition hover:bg-cyan-300/[0.015]">
                      <td className="px-4 py-4 text-slate-400 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-black text-white">{log.profile?.full_name || "System/Admin"}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{log.profile?.email || ""}</p>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <AuditActionBadge action={log.action} />
                      </td>
                      <td className="px-4 py-4 text-slate-300 leading-relaxed font-medium">
                        {formatLogDetails(log, employees)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function SummaryPill({ label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
    </div>
  );
}
