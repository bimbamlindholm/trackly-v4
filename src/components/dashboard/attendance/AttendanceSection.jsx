import { useMemo, useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Download, Eye, Printer, Search, X, MapPin, Clock, Camera, RefreshCw } from "lucide-react";
import {
  buildAttendanceCsvRows,
  buildAttendanceRowsForRange,
  formatAttendanceDate,
  todayKey,
} from "../../../utils/supabaseAttendance";
import { exportCsv } from "../../../utils/tracklyStorage";
import { fetchWorkspaceErrands } from "../../../utils/supabaseErrands";

const statusFilters = [
  { label: "All", value: "all" },
  { label: "Present", value: "present" },
  { label: "On Break", value: "break" },
  { label: "Late", value: "late" },
  { label: "Completed", value: "completed" },
  { label: "Offline", value: "offline" },
];

const rowsPerPage = 8;

function normalizeRouteFilter(filter) {
  if (filter === "on-break") return "break";
  return filter || "all";
}

export default function AttendanceSection({ employees, records, routeFilter, workspace }) {
  const today = todayKey();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(normalizeRouteFilter(routeFilter));
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [page, setPage] = useState(1);
  const [selectedRow, setSelectedRow] = useState(null);

  // Errand states
  const [activeSubTab, setActiveSubTab] = useState("dailyLogs");
  const [errands, setErrands] = useState([]);
  const [loadingErrands, setLoadingErrands] = useState(false);
  const [selectedErrandPhoto, setSelectedErrandPhoto] = useState(null);
  const [errandSearch, setErrandSearch] = useState("");

  const loadErrands = useCallback(async () => {
    if (!workspace?.id) return;
    setLoadingErrands(true);
    try {
      const data = await fetchWorkspaceErrands(workspace.id);
      setErrands(data);
    } catch (err) {
      console.error("Failed to load errands:", err);
    } finally {
      setLoadingErrands(false);
    }
  }, [workspace]);

  useEffect(() => {
    if (activeSubTab === "fieldErrands" && workspace?.id) {
      /* eslint-disable-next-line react-hooks/set-state-in-effect */
      loadErrands();
    }
  }, [activeSubTab, workspace?.id, loadErrands]);

  const filteredErrands = useMemo(() => {
    const q = errandSearch.trim().toLowerCase();
    if (!q) return errands;
    return errands.filter((e) => {
      const empName = e.user?.full_name?.toLowerCase() || "";
      const type = e.errand_type?.toLowerCase() || "";
      const purpose = e.purpose?.toLowerCase() || "";
      const notes = e.notes?.toLowerCase() || "";
      return empName.includes(q) || type.includes(q) || purpose.includes(q) || notes.includes(q);
    });
  }, [errands, errandSearch]);

  const [prevRouteFilter, setPrevRouteFilter] = useState(routeFilter);
  if (routeFilter !== prevRouteFilter) {
    setPrevRouteFilter(routeFilter);
    setStatusFilter(normalizeRouteFilter(routeFilter));
    setPage(1);
  }

  const rangeRows = useMemo(
    () => buildAttendanceRowsForRange(records, employees, startDate || today, endDate || startDate || today, workspace),
    [employees, endDate, records, startDate, today, workspace],
  );

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return rangeRows.filter((row) => {
      const matchesSearch =
        !query ||
        row.employeeName.toLowerCase().includes(query) ||
        row.email.toLowerCase().includes(query) ||
        row.date.includes(query);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "present" && row.timeIn && !row.isAbsent) ||
        (statusFilter === "break" && row.status === "On Break") ||
        (statusFilter === "late" && row.lateMinutes > 0) ||
        (statusFilter === "completed" && row.status === "Completed") ||
        (statusFilter === "offline" && row.status === "Offline");

      return matchesSearch && matchesStatus;
    });
  }, [rangeRows, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / rowsPerPage));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filteredRows.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const handleSearchChange = (val) => {
    setSearch(val);
    setPage(1);
  };
  const handleStartDateChange = (val) => {
    setStartDate(val);
    setPage(1);
    if (endDate && val > endDate) {
      setEndDate(val);
    }
  };
  const handleEndDateChange = (val) => {
    setEndDate(val);
    setPage(1);
  };
  const handleStatusFilterChange = (val) => {
    setStatusFilter(val);
    setPage(1);
  };

  const exportFilteredCsv = () => {
    exportCsv(`trackly-attendance-${startDate}-to-${endDate}.csv`, buildAttendanceCsvRows(filteredRows));
  };
  return (
    <section className="glass-panel mt-8 rounded-2xl p-4 sm:p-6">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <h2 className="text-xl font-black text-white">Attendance Center</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Search, filter, inspect, and export real Supabase attendance rows.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm font-black text-slate-200 transition hover:border-cyan-300/30 hover:text-cyan-100"
            onClick={() => window.print()}
            type="button"
          >
            <Printer size={17} /> PDF
          </button>
          <button
            className="glow-button inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-black text-white"
            onClick={exportFilteredCsv}
            type="button"
          >
            <Download size={17} /> CSV
          </button>
        </div>
      </div>
      {/* Sub-tab Switcher Segmented Control */}
      <div className="scrollbar-none mb-6 mt-6 flex gap-4 overflow-x-auto border-b border-white/5 sm:gap-6">
        <button
          onClick={() => setActiveSubTab("dailyLogs")}
          className={`shrink-0 pb-3 text-xs font-black uppercase tracking-wider transition-all ${
            activeSubTab === "dailyLogs"
              ? "text-cyan-400 border-b-2 border-cyan-400"
              : "text-slate-500 hover:text-slate-300"
          }`}
          type="button"
        >
          📅 Daily Time Records
        </button>
        <button
          onClick={() => setActiveSubTab("fieldErrands")}
          className={`shrink-0 pb-3 text-xs font-black uppercase tracking-wider transition-all ${
            activeSubTab === "fieldErrands"
              ? "text-cyan-400 border-b-2 border-cyan-400"
              : "text-slate-500 hover:text-slate-300"
          }`}
          type="button"
        >
          🏃 Field Errands Logs
        </button>
      </div>

      {activeSubTab === "dailyLogs" ? (
        <>
          <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(220px,1fr)_160px_160px_180px]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={17} />
              <input
                className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.045] pl-10 pr-4 text-sm font-semibold text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/40 focus:ring-2 focus:ring-cyan-300/15"
                onChange={(event) => handleSearchChange(event.target.value)}
                placeholder="Search employee, email, date"
                type="search"
                value={search}
              />
            </label>
            <input
              className="h-12 rounded-xl border border-white/10 bg-white/[0.045] px-3 text-sm font-semibold text-white outline-none focus:border-cyan-300/40 focus:ring-2 focus:ring-cyan-300/15"
              onChange={(event) => handleStartDateChange(event.target.value)}
              type="date"
              value={startDate}
            />
            <input
              className="h-12 rounded-xl border border-white/10 bg-white/[0.045] px-3 text-sm font-semibold text-white outline-none focus:border-cyan-300/40 focus:ring-2 focus:ring-cyan-300/15"
              min={startDate}
              onChange={(event) => handleEndDateChange(event.target.value)}
              type="date"
              value={endDate}
            />
            <select
              className="h-12 rounded-xl border border-white/10 bg-[#0B1424] px-3 text-sm font-black text-white outline-none focus:border-cyan-300/40 focus:ring-2 focus:ring-cyan-300/15"
              onChange={(event) => handleStatusFilterChange(event.target.value)}
              value={statusFilter}
            >
              {statusFilters.map((filter) => (
                <option key={filter.value} value={filter.value}>{filter.label}</option>
              ))}
            </select>
          </div>

          <div className="mt-5 grid gap-3 text-sm sm:grid-cols-4">
            <SummaryPill label="Rows" value={filteredRows.length} />
            <SummaryPill label="Late" value={filteredRows.filter((row) => row.lateMinutes > 0).length} />
            <SummaryPill label="On Break" value={filteredRows.filter((row) => row.status === "On Break").length} />
            <SummaryPill label="Completed" value={filteredRows.filter((row) => row.status === "Completed").length} />
          </div>

          <div className="mt-5 grid gap-3 md:hidden">
            {pageRows.length === 0 && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 text-center text-sm leading-6 text-slate-400">
                No matching real attendance rows.
              </div>
            )}
            {pageRows.map((row) => (
              <article key={`${row.employeeId}-${row.date}-card`} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-black text-white">{row.employeeName}</p>
                    <p className="mt-1 text-xs text-slate-500">{formatAttendanceDate(row.date)}</p>
                  </div>
                  <span className="shrink-0 rounded-lg bg-cyan-300/10 px-2 py-1 text-[0.68rem] font-black text-cyan-100">
                    {row.status || "-"}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <SummaryCell label="Time In" value={row.timeIn || "-"} />
                  <SummaryCell label="Time Out" value={row.timeOut || "-"} />
                  <SummaryCell label="Break In" value={row.breakIn || "-"} />
                  <SummaryCell label="Break Out" value={row.breakOut || "-"} />
                  <SummaryCell label="Hours" value={row.totalHours || "0h 00m"} />
                  <SummaryCell label="Late" value={`${row.lateMinutes || 0}m`} />
                </div>

                {row.statusSubtitle && <p className="mt-3 text-xs leading-5 text-slate-400">{row.statusSubtitle}</p>}
                <button
                  className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-cyan-300/25 bg-cyan-300/10 text-xs font-black text-cyan-100"
                  onClick={() => setSelectedRow(row)}
                  type="button"
                >
                  <Eye size={15} /> Details
                </button>
              </article>
            ))}
          </div>

          <div className="mt-5 hidden overflow-x-auto md:block">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="text-xs text-slate-400">
                <tr>
                  {["Date", "Employee", "Time In", "Break In", "Break Out", "Time Out", "Total Hours", "Status", "Late", "Details"].map((head) => (
                    <th key={head} className="py-3">{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {pageRows.length === 0 && (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-sm text-slate-400">No matching real attendance rows.</td>
                  </tr>
                )}
                {pageRows.map((row) => (
                  <tr key={`${row.employeeId}-${row.date}`} className="text-slate-300">
                    <td className="py-3">{formatAttendanceDate(row.date)}</td>
                    <td className="py-3 font-bold text-white">{row.employeeName}</td>
                    <td>{row.timeIn || "-"}</td>
                    <td>{row.breakIn || "-"}</td>
                    <td>{row.breakOut || "-"}</td>
                    <td>{row.timeOut || "-"}</td>
                    <td>{row.totalHours || "0h 00m"}</td>
                    <td>
                      <span className="rounded-lg bg-white/[0.055] px-2 py-1 text-xs font-black text-cyan-100">{row.status || "-"}</span>
                      {row.statusSubtitle && <p className="mt-1 max-w-[190px] truncate text-[0.68rem] text-slate-500">{row.statusSubtitle}</p>}
                    </td>
                    <td>{row.lateMinutes || 0}m</td>
                    <td>
                      <button
                        className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 text-slate-300 transition hover:border-cyan-300/30 hover:text-cyan-200"
                        onClick={() => setSelectedRow(row)}
                        type="button"
                        aria-label={`View ${row.employeeName} attendance details`}
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-5 flex flex-col justify-between gap-3 text-sm text-slate-400 sm:flex-row sm:items-center">
            <span>Showing {pageRows.length} of {filteredRows.length} rows</span>
            <div className="flex items-center gap-2">
              <button
                className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-slate-300 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={currentPage === 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                type="button"
                aria-label="Previous page"
              >
                <ChevronLeft size={17} />
              </button>
              <span className="min-w-20 text-center font-black text-white">{currentPage} / {totalPages}</span>
              <button
                className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-slate-300 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={currentPage === totalPages}
                onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                type="button"
                aria-label="Next page"
              >
                <ChevronRight size={17} />
              </button>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="mt-5 flex flex-col md:flex-row gap-3 items-center justify-between">
            <label className="relative block w-full md:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={17} />
              <input
                className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.045] pl-10 pr-4 text-sm font-semibold text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/40"
                onChange={(e) => setErrandSearch(e.target.value)}
                placeholder="Search by employee, purpose, type..."
                type="search"
                value={errandSearch}
              />
            </label>
            <button
              onClick={loadErrands}
              disabled={loadingErrands}
              className="glow-button inline-flex h-12 items-center justify-center gap-2 rounded-xl px-5 text-sm font-black text-slate-950 bg-gradient-to-r from-cyan-300 to-cyan-400 hover:shadow-lg hover:shadow-cyan-400/20 w-full md:w-auto transition active:scale-95 disabled:opacity-50"
              type="button"
            >
              <RefreshCw size={16} className={loadingErrands ? "animate-spin" : ""} />
              {loadingErrands ? "Refreshing Live..." : "Refresh Live Monitor"}
            </button>
          </div>

          <div className="mt-5 grid gap-3 text-sm sm:grid-cols-4">
            <SummaryPill label="Total Field Runs" value={filteredErrands.length} />
            <SummaryPill label="En Route" value={filteredErrands.filter((e) => e.status === "started").length} />
            <SummaryPill label="Arrived & Verified" value={filteredErrands.filter((e) => e.status === "arrived").length} />
            <SummaryPill label="Completed Successfully" value={filteredErrands.filter((e) => e.status === "completed").length} />
          </div>

          <div className="mt-5 grid gap-3 md:hidden">
            {filteredErrands.length === 0 && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 text-center text-sm leading-6 text-slate-400">
                {loadingErrands ? "Loading live errand logs..." : "No live field errand records found."}
              </div>
            )}
            {filteredErrands.map((e) => (
              <article key={e.id} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-black text-white">{e.user?.full_name || "Unknown Employee"}</p>
                    <p className="mt-0.5 text-[10px] text-slate-500 font-bold uppercase tracking-wider">{e.user?.position || "Staff"}</p>
                  </div>
                  <span className={`shrink-0 rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                    e.status === "started" ? "bg-amber-500/10 text-amber-300 border border-amber-500/20" :
                    e.status === "arrived" ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20" :
                    "bg-cyan-500/10 text-cyan-300 border border-cyan-500/20"
                  }`}>
                    {e.status === "started" ? "🟡 En Route" : e.status === "arrived" ? "🟢 Arrived" : "🔵 Done"}
                  </span>
                </div>

                <div className="border-t border-white/5 pt-3 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-semibold">Errand Category:</span>
                    <span className="font-bold text-white">{e.errand_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-semibold">Purpose:</span>
                    <span className="font-semibold text-slate-300 text-right max-w-[200px] truncate">{e.purpose || "-"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-semibold">Duration:</span>
                    <span className="font-black text-cyan-400 flex items-center gap-1">
                      <Clock size={12} />
                      {e.status === "completed" ? `${e.duration_minutes} mins` : "In Progress"}
                    </span>
                  </div>
                </div>

                <div className="border-t border-white/5 pt-3 grid grid-cols-2 gap-2 text-[10px] uppercase font-black text-center">
                  {e.start_latitude && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${e.start_latitude},${e.start_longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10"
                    >
                      <MapPin size={11} className="text-amber-400 animate-pulse" /> Start GPS
                    </a>
                  )}
                  {e.arrival_latitude && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${e.arrival_latitude},${e.arrival_longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10"
                    >
                      <MapPin size={11} className="text-emerald-400" /> Arrived GPS
                    </a>
                  )}
                </div>

                {e.arrival_photo && (
                  <button
                    onClick={() => setSelectedErrandPhoto(e.arrival_photo)}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 text-xs font-black text-cyan-300 hover:from-cyan-500/20 hover:to-blue-500/20 active:scale-95 transition flex items-center justify-center gap-1.5"
                    type="button"
                  >
                    <Camera size={14} /> View Verification Slip
                  </button>
                )}

                {e.notes && (
                  <div className="rounded-xl bg-cyan-950/20 border border-cyan-500/10 p-2.5 text-[11px] font-semibold text-cyan-200">
                    💡 Notes: {e.notes}
                  </div>
                )}
              </article>
            ))}
          </div>

          <div className="mt-5 hidden overflow-x-auto md:block">
            <table className="w-full min-w-[920px] text-left text-sm text-slate-300">
              <thead className="text-xs text-slate-400">
                <tr>
                  {["Employee", "Errand Type", "Purpose", "Status", "Duration", "Checkpoints (GPS)", "Verification Slip", "Notes"].map((head) => (
                    <th key={head} className="py-3">{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filteredErrands.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-sm text-slate-400">
                      {loadingErrands ? "Loading live errand logs..." : "No live field errand records found."}
                    </td>
                  </tr>
                )}
                {filteredErrands.map((e) => (
                  <tr key={e.id} className="text-slate-300 align-middle">
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        {e.user?.face_photo ? (
                          <img src={e.user.face_photo} className="h-8 w-8 rounded-xl object-cover border border-white/10" alt="" />
                        ) : (
                          <div className="h-8 w-8 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center font-bold text-xs">
                            {e.user?.full_name?.charAt(0) || "?"}
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-white leading-none">{e.user?.full_name || "Unknown"}</p>
                          <p className="text-[10px] text-slate-500 font-semibold mt-1">{e.user?.position || "Staff"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 font-semibold text-white">{e.errand_type}</td>
                    <td className="py-4 text-xs max-w-[200px] truncate font-semibold text-slate-300" title={e.purpose}>{e.purpose || "-"}</td>
                    <td className="py-4">
                      <span className={`inline-block rounded-lg px-2.5 py-0.5 text-xs font-black uppercase tracking-wider ${
                        e.status === "started" ? "bg-amber-500/10 text-amber-300 border border-amber-500/20" :
                        e.status === "arrived" ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20" :
                        "bg-cyan-500/10 text-cyan-300 border border-cyan-500/20"
                      }`}>
                        {e.status === "started" ? "🟡 En Route" : e.status === "arrived" ? "🟢 Arrived" : "🔵 Done"}
                      </span>
                    </td>
                    <td className="py-4 font-black text-cyan-400">
                      {e.status === "completed" ? `${e.duration_minutes} mins` : "In Progress"}
                    </td>
                    <td className="py-4">
                      <div className="flex gap-2 text-[10px] font-black uppercase">
                        {e.start_latitude && (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${e.start_latitude},${e.start_longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white transition"
                            title="Start location coordinate"
                          >
                            <MapPin size={10} className="text-amber-400 animate-pulse" /> Start
                          </a>
                        )}
                        {e.arrival_latitude && (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${e.arrival_latitude},${e.arrival_longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white transition"
                            title="Arrival location coordinate"
                          >
                            <MapPin size={10} className="text-emerald-400" /> Arrived
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="py-4">
                      {e.arrival_photo ? (
                        <button
                          onClick={() => setSelectedErrandPhoto(e.arrival_photo)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-[11px] font-black text-cyan-300 hover:bg-cyan-500/20 active:scale-95 transition"
                          type="button"
                        >
                          <Camera size={12} /> View Slip
                        </button>
                      ) : (
                        <span className="text-slate-600 font-semibold text-xs">No upload</span>
                      )}
                    </td>
                    <td className="py-4 text-xs font-semibold text-cyan-200/90 max-w-[150px] truncate" title={e.notes}>
                      {e.notes || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {selectedRow && <AttendanceDetailsModal row={selectedRow} onClose={() => setSelectedRow(null)} />}

      {selectedErrandPhoto && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/80 backdrop-blur-md p-4">
          <div className="glass-panel border-cyan-300/30 max-w-2xl w-full p-4 rounded-3xl relative">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-black text-white">Deposit Slip / Receipt Verification Photo</h3>
              <button
                className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-slate-300 hover:text-white"
                onClick={() => setSelectedErrandPhoto(null)}
                type="button"
                aria-label="Close photo preview"
              >
                <X size={16} />
              </button>
            </div>
            <div className="rounded-2xl overflow-hidden border border-white/15 bg-[#07111F] flex items-center justify-center max-h-[75dvh]">
              <img src={selectedErrandPhoto} alt="Verification slip" className="max-h-[70dvh] w-auto object-contain" />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function SummaryCell({ label, value }) {
  return (
    <div className="min-w-0 rounded-xl border border-white/10 bg-white/[0.035] p-3">
      <p className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-1 truncate font-black text-white">{value}</p>
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

function AttendanceDetailsModal({ onClose, row }) {
  const details = [
    ["Date", formatAttendanceDate(row.date)],
    ["Employee", row.employeeName],
    ["Email", row.email || "-"],
    ["Status", row.status],
    ["Time In", row.timeIn || "-"],
    ["Break In", row.breakIn || "-"],
    ["Break Out", row.breakOut || "-"],
    ["Time Out", row.timeOut || "-"],
    ["Total Hours", row.totalHours || "0h 00m"],
    ["Late", `${row.lateMinutes || 0}m`],
  ];

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/65 p-3 backdrop-blur-sm sm:p-4">
      <div className="glass-panel max-h-[calc(100dvh-1.5rem)] w-full max-w-lg overflow-y-auto rounded-2xl p-4 sm:max-h-[calc(100dvh-2rem)] sm:p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-black text-white">Attendance Details</h2>
          <button className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-slate-300 transition hover:bg-white/10" onClick={onClose} type="button" aria-label="Close attendance details">
            <X size={18} />
          </button>
        </div>
        <div className="grid gap-3 text-sm">
          {details.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.035] p-3">
              <span className="text-slate-400">{label}</span>
              <span className="text-right font-bold text-white">{value}</span>
            </div>
          ))}
          {row.comment && <div className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 p-3 text-cyan-100">Comment: {row.comment}</div>}
          
          {/* Captured Selfie Audits */}
          {(row.verificationPhoto || row.timeOutVerificationPhoto) && (
            <div className="rounded-xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/[0.03] to-violet-500/[0.03] p-4 mt-2 space-y-3">
              <div className="flex items-center gap-2 text-cyan-300">
                <Camera size={16} />
                <span className="text-[10px] font-black uppercase tracking-wider">AI Face Match Selfie Audits</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-center justify-center">
                {row.verificationPhoto && (
                  <div className="flex flex-col items-center gap-1.5 bg-slate-950/40 p-2 rounded-xl border border-white/5">
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Time In Selfie</span>
                    <div className="h-24 w-24 rounded-lg overflow-hidden border border-white/10 bg-slate-900 flex items-center justify-center">
                      <img src={row.verificationPhoto} className="h-full w-full object-cover" alt="Time In Selfie" />
                    </div>
                  </div>
                )}
                {row.timeOutVerificationPhoto && (
                  <div className="flex flex-col items-center gap-1.5 bg-slate-950/40 p-2 rounded-xl border border-white/5">
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Time Out Selfie</span>
                    <div className="h-24 w-24 rounded-lg overflow-hidden border border-white/10 bg-slate-900 flex items-center justify-center">
                      <img src={row.timeOutVerificationPhoto} className="h-full w-full object-cover" alt="Time Out Selfie" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
