import { useEffect, useMemo, useState } from "react";
import { Calculator, Download, X, Clock } from "lucide-react";
import { supabase } from "../../../lib/supabaseClient";
import { useAuth } from "../../../contexts/AuthContext";
import { useToast } from "../../../contexts/ToastContext";
import { calculateEmployeePayroll } from "../../../utils/payrollCalculator";
import { generatePayslipPdf as generatePremiumPayslip } from "../../../utils/payslipPdfGenerator";
import { fetchWorkspaceHolidays } from "../../../utils/supabaseHolidays";
import {
  buildAttendanceRowsForRange,
  minutesFromTotalHours,
  minutesToHours,
  todayKey,
} from "../../../utils/supabaseAttendance";
import { exportCsv } from "../../../utils/tracklyStorage";

export default function PayrollSection({ employees, records, workspace }) {
  const { profile } = useAuth();
  const { addToast } = useToast();
  const today = todayKey();

  const [activeTab, setActiveTab] = useState("estimate"); // "estimate" or "archive"
  
  // Tab 1: Estimation States
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  });
  const [endDate, setEndDate] = useState(today);
  const [selectedPayroll, setSelectedPayroll] = useState(null);
  const [payrollStatuses, setPayrollStatuses] = useState({});
  const [batchId, setBatchId] = useState(null);
  const [batchStatus, setBatchStatus] = useState("pending");
  const [savingBatch, setSavingBatch] = useState(false);

  // Tab 2: Archive States
  const [archivedBatches, setArchivedBatches] = useState([]);
  const [loadingArchive, setLoadingArchive] = useState(false);
  const [selectedArchiveBatch, setSelectedArchiveBatch] = useState(null);
  const [archivedPayslips, setArchivedPayslips] = useState([]);
  const [loadingPayslips, setLoadingPayslips] = useState(false);

  // Search & Filter States
  const [archiveSearchQuery, setArchiveSearchQuery] = useState("");
  const [archiveStatusFilter, setArchiveStatusFilter] = useState("all");
  const [payslipSearchQuery, setPayslipSearchQuery] = useState("");

  // Memoized filters for archived batches
  const filteredArchivedBatches = useMemo(() => {
    return archivedBatches.filter((batch) => {
      const matchesStatus = archiveStatusFilter === "all" || batch.status === archiveStatusFilter;
      const query = archiveSearchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        batch.start_date.includes(query) ||
        batch.end_date.includes(query) ||
        (batch.profiles?.full_name && batch.profiles.full_name.toLowerCase().includes(query));
      return matchesStatus && matchesSearch;
    });
  }, [archivedBatches, archiveStatusFilter, archiveSearchQuery]);

  // Memoized filters for archived payslips
  const filteredArchivedPayslips = useMemo(() => {
    return archivedPayslips.filter((payslip) => {
      const query = payslipSearchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        (payslip.profile?.full_name && payslip.profile.full_name.toLowerCase().includes(query)) ||
        (payslip.profile?.email && payslip.profile.email.toLowerCase().includes(query));
      return matchesSearch;
    });
  }, [archivedPayslips, payslipSearchQuery]);

  // 1. Fetch live batch status for the selected estimation dates
  useEffect(() => {
    let active = true;
    const fetchBatchStatus = async () => {
      if (!workspace?.id || !startDate || !endDate || activeTab !== "estimate") return;
      try {
        const { data: batch, error } = await supabase
          .from("payroll_batches")
          .select("id, status")
          .eq("workspace_id", workspace.id)
          .eq("start_date", startDate)
          .eq("end_date", endDate)
          .maybeSingle();

        if (error) throw error;
        
        if (!active) return;
        
        if (batch) {
          setBatchId(batch.id);
          setBatchStatus(batch.status);
          
          const loadedStatuses = {};
          employees.forEach((emp) => {
            loadedStatuses[`${emp.id}-${startDate}-${endDate}`] = batch.status;
          });
          setPayrollStatuses(loadedStatuses);
        } else {
          setBatchId(null);
          setBatchStatus("pending");
          setPayrollStatuses({});
        }
      } catch (err) {
        console.error("Error fetching payroll batch:", err);
      }
    };

    fetchBatchStatus();
    return () => {
      active = false;
    };
  }, [startDate, endDate, workspace?.id, employees, activeTab]);

  // 2. Fetch Archived Batches when Archive Tab is opened
  useEffect(() => {
    let active = true;
    const fetchArchivedBatches = async () => {
      if (!workspace?.id || activeTab !== "archive") return;
      try {
        setLoadingArchive(true);
        const { data, error } = await supabase
          .from("payroll_batches")
          .select("*, profiles:created_by(full_name)")
          .eq("workspace_id", workspace.id)
          .order("start_date", { ascending: false });

        if (error) throw error;
        if (active) {
          setArchivedBatches(data || []);
        }
      } catch (err) {
        console.error("Error fetching archived batches:", err);
        addToast("Failed to load payroll history: " + err.message, "error");
      } finally {
        if (active) setLoadingArchive(false);
      }
    };

    fetchArchivedBatches();
    return () => {
      active = false;
    };
  }, [workspace?.id, activeTab, addToast]);

  // 3. Fetch payslips when an archived batch is selected
  useEffect(() => {
    let active = true;
    const fetchArchivedPayslips = async () => {
      if (!selectedArchiveBatch) {
        setArchivedPayslips([]);
        return;
      }
      try {
        setLoadingPayslips(true);
        const { data, error } = await supabase
          .from("payslips")
          .select("*, profile:profiles(*)")
          .eq("batch_id", selectedArchiveBatch.id);

        if (error) throw error;
        if (active) {
          setArchivedPayslips(data || []);
        }
      } catch (err) {
        console.error("Error loading archived payslips:", err);
        addToast("Failed to load frozen payslips: " + err.message, "error");
      } finally {
        if (active) setLoadingPayslips(false);
      }
    };

    fetchArchivedPayslips();
    return () => {
      active = false;
    };
  }, [selectedArchiveBatch, addToast]);

  const [customHolidays, setCustomHolidays] = useState([]);

  useEffect(() => {
    let active = true;
    const loadCustomHolidays = async () => {
      if (!workspace?.id) return;
      try {
        const data = await fetchWorkspaceHolidays(workspace.id);
        if (active) setCustomHolidays(data || []);
      } catch (err) {
        console.error("Failed to load workspace custom holidays for payroll calculations:", err);
      }
    };
    loadCustomHolidays();
    return () => {
      active = false;
    };
  }, [workspace?.id]);

  const workspaceWithHolidays = useMemo(() => {
    return {
      ...workspace,
      customHolidays,
    };
  }, [workspace, customHolidays]);

  const handleStartDateChange = (val) => {
    setStartDate(val);
    if (endDate && val > endDate) {
      setEndDate(val);
    }
  };

  // Dynamic Estimation Calculations
  const rows = useMemo(
    () =>
      buildAttendanceRowsForRange(
        records,
        employees,
        startDate || today,
        endDate || startDate || today,
        workspaceWithHolidays,
      ).filter((row) => !row.isAbsent),
    [employees, endDate, records, startDate, today, workspaceWithHolidays],
  );

  const employeePayroll = useMemo(() => {
    return employees.map((employee) => {
      const employeeRows = rows.filter((row) => row.employeeId === employee.id);
      const calcResult = calculateEmployeePayroll({
        employee,
        attendanceRows: employeeRows,
        rules: workspaceWithHolidays,
      });

      return {
        ...calcResult,
        rows: calcResult.completedDays,
        overtime: calcResult.overtimeHours,
        undertime: calcResult.undertimeHours,
      };
    });
  }, [employees, rows, workspaceWithHolidays]);

  const payrollSummary = useMemo(() => {
    const totalGrossPay = employeePayroll.reduce((sum, item) => sum + item.grossPay, 0);
    const totalDeductions = employeePayroll.reduce((sum, item) => sum + item.totalDeduction, 0);
    const totalNetPay = employeePayroll.reduce((sum, item) => sum + item.netPay, 0);
    const totalCompleted = employeePayroll.reduce((sum, item) => sum + item.completedDays, 0);
    const totalLate = employeePayroll.reduce((sum, item) => sum + item.totalLateMinutes, 0);
    const totalMinutes = employeePayroll.reduce(
      (sum, item) => sum + minutesFromTotalHours(item.totalHours),
      0,
    );

    return {
      totalGrossPay,
      totalDeductions,
      totalNetPay,
      totalCompleted,
      totalLate,
      totalHours: minutesToHours(totalMinutes),
    };
  }, [employeePayroll]);

  const getPayrollKey = (item) => `${item.employee.id}-${startDate}-${endDate}`;
  const getPayrollStatus = (item) => payrollStatuses[getPayrollKey(item)] || batchStatus || "pending";

  const updatePayrollStatus = async (item, status) => {
    if (!workspace?.id || !startDate || !endDate) return;
    
    // Guard check: Prevent editing if the batch is already released and permanently locked
    if (batchStatus === "released") {
      addToast("This payroll batch is already released and permanently locked.", "error");
      return;
    }
    
    setSavingBatch(true);
    setPayrollStatuses((current) => ({
      ...current,
      [getPayrollKey(item)]: status,
    }));
    
    try {
      let currentBatchId = batchId;
      if (!currentBatchId) {
        const { data: existingBatch } = await supabase
          .from("payroll_batches")
          .select("id")
          .eq("workspace_id", workspace.id)
          .eq("start_date", startDate)
          .eq("end_date", endDate)
          .maybeSingle();
          
        if (existingBatch) {
          currentBatchId = existingBatch.id;
        }
      }
      
      const batchPayload = {
        workspace_id: workspace.id,
        start_date: startDate,
        end_date: endDate,
        status: status,
      };
      
      if (status === "approved") {
        batchPayload.approved_at = new Date().toISOString();
      } else if (status === "released") {
        batchPayload.released_at = new Date().toISOString();
      }
      
      if (currentBatchId) {
        const { error: batchErr } = await supabase
          .from("payroll_batches")
          .update(batchPayload)
          .eq("id", currentBatchId);
          
        if (batchErr) throw batchErr;
      } else {
        const { data: newBatch, error: batchErr } = await supabase
          .from("payroll_batches")
          .insert({
            ...batchPayload,
            created_by: profile?.id || null,
          })
          .select()
          .single();
          
        if (batchErr) throw batchErr;
        currentBatchId = newBatch.id;
        setBatchId(newBatch.id);
      }
      
      setBatchStatus(status);
      
      // Delete old payslips associated with this batch
      await supabase
        .from("payslips")
        .delete()
        .eq("batch_id", currentBatchId);
        
      const payslipsPayload = employeePayroll.map((payItem) => ({
        batch_id: currentBatchId,
        user_id: payItem.employee.id,
        completed_days: payItem.completedDays,
        rows_count: payItem.rows || 0,
        total_hours: payItem.totalHours,
        overtime_hours: payItem.overtime || "0h 00m",
        late_minutes: payItem.totalLateMinutes || 0,
        undertime_hours: payItem.undertime || "0h 00m",
        regular_pay: payItem.regularPay,
        overtime_pay: payItem.overtimePay,
        holiday_pay: payItem.holidayPay || 0,
        night_diff_pay: payItem.nightDiffPay || 0,
        gross_pay: payItem.grossPay,
        late_deduction: payItem.lateDeduction,
        undertime_deduction: payItem.undertimeDeduction,
        // Save individual government deductions so archived payslips show correct breakdown
        sss_deduction: payItem.sssDeduction || 0,
        philhealth_deduction: payItem.philhealthDeduction || 0,
        pagibig_deduction: payItem.pagibigDeduction || 0,
        custom_deductions: payItem.calculatedCustomDeductions || [],
        total_deductions: payItem.totalDeduction,
        net_pay: payItem.netPay,
      }));
      
      const { error: payslipsErr } = await supabase
        .from("payslips")
        .insert(payslipsPayload);
        
      if (payslipsErr) throw payslipsErr;
      
      // Write system audit log
      try {
        const { createAuditLog } = await import("../../../utils/supabaseAuditLogs");
        await createAuditLog({
          workspaceId: workspace.id,
          userId: profile?.id,
          action: status === "approved" ? "payroll_approved" : "payroll_released",
          details: {
            batch_id: currentBatchId,
            start_date: startDate,
            end_date: endDate,
            net_pay: payrollSummary.totalNetPay,
            employees_count: employeePayroll.length,
          },
        });
      } catch (logErr) {
        console.error("Failed to write audit log for payroll status change:", logErr);
      }
      
      const nextStatuses = {};
      employees.forEach((emp) => {
        nextStatuses[`${emp.id}-${startDate}-${endDate}`] = status;
      });
      setPayrollStatuses(nextStatuses);
      addToast(`Payroll successfully updated to ${status}!`, "success");
    } catch (err) {
      console.error("Error saving payroll:", err);
      setPayrollStatuses((current) => ({
        ...current,
        [getPayrollKey(item)]: getPayrollStatus(item),
      }));
      addToast("Failed to save payroll status: " + err.message, "error");
    } finally {
      setSavingBatch(false);
    }
  };

  const exportPayrollCsv = () => {
    const csvRows = [
      ["Employee", "Email", "Status", "Completed Days", "Attendance Rows", "Total Hours", "Overtime", "Late Minutes", "Undertime", "Gross Pay", "Deduction", "Net Pay"],
      ...employeePayroll.map((item) => [
        item.employee.fullName,
        item.employee.email,
        getPayrollStatus(item).toUpperCase(),
        item.completedDays,
        item.rows,
        item.totalHours,
        item.overtime,
        `${item.totalLateMinutes}m`,
        item.undertime,
        formatPeso(item.grossPay),
        formatPeso(item.totalDeduction),
        formatPeso(item.netPay),
      ]),
    ];
    exportCsv(`trackly-payroll-${startDate}-to-${endDate}.csv`, csvRows);
  };

  return (
    <div className="mt-8 grid gap-6 w-full max-w-full overflow-hidden">
      {/* Tab Selectors */}
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-950/40 p-1.5 border border-white/5 w-full max-w-lg">
        <button
          onClick={() => setActiveTab("estimate")}
          className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 text-[11px] min-[375px]:text-xs sm:text-sm font-black transition-all w-full ${
            activeTab === "estimate"
              ? "bg-gradient-to-r from-violet-500/20 to-cyan-500/20 border border-cyan-500/30 text-white shadow-sm"
              : "border border-transparent text-slate-400 hover:text-slate-200"
          }`}
          type="button"
        >
          <Calculator size={14} className="shrink-0" />
          Payroll Estimate
        </button>
        <button
          onClick={() => setActiveTab("archive")}
          className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 text-[11px] min-[375px]:text-xs sm:text-sm font-black transition-all w-full ${
            activeTab === "archive"
              ? "bg-gradient-to-r from-violet-500/20 to-cyan-500/20 border border-cyan-500/30 text-white shadow-sm"
              : "border border-transparent text-slate-400 hover:text-slate-200"
          }`}
          type="button"
        >
          <Clock size={14} className="shrink-0" />
          History Archive
        </button>
      </div>

      {activeTab === "estimate" ? (
        <section className="glass-panel rounded-2xl p-4 sm:p-6 w-full max-w-full overflow-hidden">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end w-full max-w-full overflow-hidden">
            <div className="flex items-start gap-3 sm:gap-4 min-w-0">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-cyan-300/25 bg-cyan-300/10 text-cyan-300">
                <Calculator size={22} />
              </div>
              <div className="min-w-0">
                <h2 className="text-xl font-black text-white">Cutoff Payroll Summary</h2>
                <p className="mt-2 text-xs sm:text-sm leading-relaxed sm:leading-6 text-slate-400 break-words">
                  Estimate payroll using selected cutoff dates, completed attendance days, workspace rates, and multipliers.
                </p>
              </div>
            </div>
            <button
              className="glow-button inline-flex h-12 items-center justify-center gap-2 rounded-xl px-5 text-sm font-black text-white w-full lg:w-auto self-start lg:self-auto shrink-0"
              onClick={exportPayrollCsv}
              type="button"
            >
              <Download size={17} /> Export Payroll CSV
            </button>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Cutoff Start</label>
              <input
                className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.045] px-3 text-sm font-semibold text-white outline-none focus:border-cyan-300/40 focus:ring-2 focus:ring-cyan-300/15"
                onChange={(event) => handleStartDateChange(event.target.value)}
                type="date"
                value={startDate}
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Cutoff End</label>
              <input
                className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.045] px-3 text-sm font-semibold text-white outline-none focus:border-cyan-300/40 focus:ring-2 focus:ring-cyan-300/15"
                min={startDate}
                onChange={(event) => setEndDate(event.target.value)}
                type="date"
                value={endDate}
              />
            </div>
            <SummaryPill label="Payroll Period" value={workspace.payrollPeriod} />
            <SummaryPill label="Overtime Rate" value={`${workspace.overtimeRate || 1.25}x`} />
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryPill label="Total Gross Pay" value={formatPeso(payrollSummary.totalGrossPay)} />
            <SummaryPill label="Total Deductions" value={formatPeso(payrollSummary.totalDeductions)} />
            <SummaryPill label="Total Net Pay" value={formatPeso(payrollSummary.totalNetPay)} />
            <SummaryPill label="Total Hours" value={payrollSummary.totalHours} />
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryPill label="Hourly Rate" value={formatPeso(workspace.hourlyRate)} />
            <SummaryPill label="Daily Rate" value={formatPeso(workspace.dailyRate)} />
            <SummaryPill label="Expected Hours" value={`${workspace.expectedWorkHours || 8}h/day`} />
            <SummaryPill label="Employees" value={employeePayroll.length} />
          </div>

          <p className="mt-5 text-xs font-semibold text-slate-500">Tip: Click an employee row to view payroll breakdown.</p>

          {/* Batch Controls Panel */}
          <div className="mt-4 flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.025] p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-cyan-300/15 bg-cyan-300/5 text-cyan-300">
                <Clock size={22} />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-slate-400">Batch Payroll Status</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-300">This cutoff batch is:</span>
                  <PayrollStatusBadge status={batchStatus} />
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              {batchStatus === "pending" && (
                <button
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-emerald-300/25 bg-emerald-300/10 px-5 text-sm font-black text-emerald-100 transition hover:border-emerald-300/50 disabled:cursor-not-allowed disabled:opacity-45"
                  disabled={savingBatch || employeePayroll.length === 0}
                  onClick={() => updatePayrollStatus(null, "approved")}
                  type="button"
                >
                  Approve Entire Batch
                </button>
              )}
              {batchStatus === "approved" && (
                <button
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-cyan-300/25 bg-cyan-300/10 px-5 text-sm font-black text-cyan-100 transition hover:border-cyan-300/50 disabled:cursor-not-allowed disabled:opacity-45"
                  disabled={savingBatch || employeePayroll.length === 0}
                  onClick={() => updatePayrollStatus(null, "released")}
                  type="button"
                >
                  Release Entire Batch
                </button>
              )}
              {batchStatus === "released" && (
                <div className="inline-flex h-11 items-center gap-2 rounded-xl border border-cyan-300/20 bg-cyan-300/5 px-4 text-sm font-black text-cyan-200">
                  <span>🔒 Cutoff Released & Locked</span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full min-w-[850px] sm:min-w-[600px] text-left text-sm">
              <thead className="bg-white/[0.04] text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-bold">Employee</th>
                  <th className="px-4 py-3 font-bold">Status</th>
                  <th className="px-4 py-3 font-bold">Completed Days</th>
                  <th className="px-4 py-3 font-bold">Rows</th>
                  <th className="px-4 py-3 font-bold">Hours</th>
                  <th className="px-4 py-3 font-bold">Overtime</th>
                  <th className="px-4 py-3 font-bold">Late</th>
                  <th className="px-4 py-3 font-bold">Undertime</th>
                  <th className="px-4 py-3 font-bold">Gross Pay</th>
                  <th className="px-4 py-3 font-bold">Deduction</th>
                  <th className="px-4 py-3 font-bold">Net Pay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {employeePayroll.length === 0 && (
                  <tr>
                    <td colSpan="11" className="px-4 py-10 text-center text-sm text-slate-400">No employees available for payroll estimates yet.</td>
                  </tr>
                )}
                {employeePayroll.map((item) => (
                  <tr
                    key={item.employee.id}
                    className="cursor-pointer transition hover:bg-cyan-300/[0.03]"
                    onClick={() => setSelectedPayroll(item)}
                  >
                    <td className="px-4 py-3">
                      <p className="font-black text-white">{item.employee.fullName}</p>
                      <p className="mt-1 text-xs text-slate-500">{item.employee.email}</p>
                    </td>
                    <td className="px-4 py-3"><PayrollStatusBadge status={getPayrollStatus(item)} /></td>
                    <td className="px-4 py-3 font-bold text-white">{item.completedDays}</td>
                    <td className="px-4 py-3 text-slate-300">{item.rows}</td>
                    <td className="px-4 py-3 font-bold text-cyan-100">{item.totalHours}</td>
                    <td className="px-4 py-3 text-slate-300">{item.overtime}</td>
                    <td className="px-4 py-3 text-amber-200">{item.totalLateMinutes}m</td>
                    <td className="px-4 py-3 text-rose-200">{item.undertime}</td>
                    <td className="px-4 py-3 font-black text-emerald-200">{formatPeso(item.grossPay)}</td>
                    <td className="px-4 py-3 font-black text-rose-200">{formatPeso(item.totalDeduction)}</td>
                    <td className="px-4 py-3 font-black text-cyan-100">{formatPeso(item.netPay)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selectedPayroll && (
            <PayrollBreakdownModal
              item={selectedPayroll}
              onClose={() => setSelectedPayroll(null)}
              startDate={startDate}
              endDate={endDate}
              status={getPayrollStatus(selectedPayroll)}
              onUpdateStatus={(status) => updatePayrollStatus(selectedPayroll, status)}
              isArchive={false}
            />
          )}
        </section>
      ) : (
        <section className="glass-panel rounded-2xl p-4 sm:p-6 w-full max-w-full overflow-hidden">
          <h2 className="text-xl font-black text-white">Released Payroll History</h2>
          <p className="mt-1 text-sm text-slate-400">View locked, frozen historical payslip batches retrieved directly from database records.</p>
          
          {!selectedArchiveBatch ? (
            <div className="mt-5 grid gap-3">
              {/* Search & Filter Controls */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Search periods (YYYY-MM-DD) or creator..."
                    value={archiveSearchQuery}
                    onChange={(e) => setArchiveSearchQuery(e.target.value)}
                    className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.045] px-4 text-sm font-semibold text-white outline-none focus:border-cyan-300/40 focus:ring-2 focus:ring-cyan-300/15"
                  />
                </div>
                <div className="w-full sm:w-48">
                  <select
                    value={archiveStatusFilter}
                    onChange={(e) => setArchiveStatusFilter(e.target.value)}
                    className="h-11 w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 text-sm font-semibold text-white outline-none focus:border-cyan-300/40 focus:ring-2 focus:ring-cyan-300/15"
                  >
                    <option value="all">All Statuses</option>
                    <option value="approved">Approved</option>
                    <option value="released">Released</option>
                  </select>
                </div>
              </div>

              {loadingArchive && <p className="text-slate-400 text-sm">Loading historical batches...</p>}
              {!loadingArchive && filteredArchivedBatches.length === 0 && (
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-8 text-center text-slate-400 text-sm">
                  {archivedBatches.length === 0
                    ? "No historical payroll batches have been approved or released yet."
                    : "No historical batches matched your search/filter criteria."}
                </div>
              )}
              {filteredArchivedBatches.map((batch) => (
                <div
                  key={batch.id}
                  className="flex flex-col justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm sm:flex-row sm:items-center cursor-pointer transition hover:border-cyan-300/30 hover:bg-cyan-300/[0.02]"
                  onClick={() => {
                    setSelectedArchiveBatch(batch);
                    setPayslipSearchQuery("");
                  }}
                >
                  <div>
                    <h3 className="font-black text-white text-base">Cutoff Period: {batch.start_date} to {batch.end_date}</h3>
                    <p className="mt-1 text-xs text-slate-500">Created At: {new Date(batch.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <PayrollStatusBadge status={batch.status} />
                    <button className="rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-xs font-black text-cyan-100">Inspect Batch</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div>
              <div className="mt-5 flex flex-col justify-between gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-center">
                <button
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-bold text-slate-300 transition hover:bg-white/10"
                  onClick={() => {
                    setSelectedArchiveBatch(null);
                    setPayslipSearchQuery("");
                  }}
                >
                  &larr; Back to History List
                </button>
                <div className="text-right">
                  <h3 className="font-black text-white text-lg">Cutoff: {selectedArchiveBatch.start_date} to {selectedArchiveBatch.end_date}</h3>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Status: {selectedArchiveBatch.status}</p>
                </div>
              </div>

              {/* Payslip Employee Search */}
              <div className="mt-4">
                <input
                  type="text"
                  placeholder="Search employees by name or email..."
                  value={payslipSearchQuery}
                  onChange={(e) => setPayslipSearchQuery(e.target.value)}
                  className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.045] px-4 text-sm font-semibold text-white outline-none focus:border-cyan-300/40 focus:ring-2 focus:ring-cyan-300/15"
                />
              </div>

              {loadingPayslips ? (
                <p className="text-slate-400 mt-5 text-sm">Loading frozen payslip snapshots...</p>
              ) : (
                <div className="mt-5 overflow-x-auto rounded-2xl border border-white/10">
                  <table className="w-full min-w-[950px] sm:min-w-[700px] text-left text-sm">
                    <thead className="bg-white/[0.04] text-slate-400">
                      <tr>
                        <th className="px-4 py-3 font-bold">Employee</th>
                        <th className="px-4 py-3 font-bold">Completed Days</th>
                        <th className="px-4 py-3 font-bold">Rows</th>
                        <th className="px-4 py-3 font-bold">Hours</th>
                        <th className="px-4 py-3 font-bold">Overtime</th>
                        <th className="px-4 py-3 font-bold">Late</th>
                        <th className="px-4 py-3 font-bold">Undertime</th>
                        <th className="px-4 py-3 font-bold">Gross Pay</th>
                        <th className="px-4 py-3 font-bold">Deduction</th>
                        <th className="px-4 py-3 font-bold">Net Pay</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {filteredArchivedPayslips.length === 0 && (
                        <tr>
                          <td colSpan="10" className="px-4 py-10 text-center text-sm text-slate-400">
                            {archivedPayslips.length === 0
                              ? "No frozen payslips found in this batch database record."
                              : "No frozen payslips match your search query."}
                          </td>
                        </tr>
                      )}
                      {filteredArchivedPayslips.map((payslip) => {
                        const grossPay = Number(payslip.gross_pay);
                        const rowMapped = {
                          employee: {
                            id: payslip.user_id,
                            fullName: payslip.profile?.full_name || "Employee",
                            email: payslip.profile?.email || "",
                          },
                          completedDays: payslip.completed_days,
                          rows: payslip.rows_count,
                          totalHours: payslip.total_hours,
                          overtime: payslip.overtime_hours,
                          totalLateMinutes: payslip.late_minutes,
                          undertime: payslip.undertime_hours,
                          regularPay: Number(payslip.regular_pay),
                          overtimePay: Number(payslip.overtime_pay),
                          holidayPay: Number(payslip.holiday_pay || 0),
                          nightDiffPay: Number(payslip.night_diff_pay || 0),
                          grossPay,
                          lateDeduction: Number(payslip.late_deduction),
                          undertimeDeduction: Number(payslip.undertime_deduction),
                          // Use saved deduction values if available, otherwise estimate from gross
                          sssDeduction: Number(payslip.sss_deduction ?? Math.min(1350, grossPay * 0.045)),
                          philhealthDeduction: Number(payslip.philhealth_deduction ?? Math.min(1000, grossPay * 0.025)),
                          pagibigDeduction: Number(payslip.pagibig_deduction ?? Math.min(200, grossPay * 0.02)),
                          calculatedCustomDeductions: payslip.custom_deductions || [],
                          totalDeduction: Number(payslip.total_deductions),
                          netPay: Number(payslip.net_pay),
                        };

                        return (
                          <tr
                            key={payslip.id}
                            className="cursor-pointer transition hover:bg-cyan-300/[0.03]"
                            onClick={() => setSelectedPayroll(rowMapped)}
                          >
                            <td className="px-4 py-3">
                              <p className="font-black text-white">{rowMapped.employee.fullName}</p>
                              <p className="mt-1 text-xs text-slate-500">{rowMapped.employee.email}</p>
                            </td>
                            <td className="px-4 py-3 font-bold text-white">{rowMapped.completedDays}</td>
                            <td className="px-4 py-3 text-slate-300">{rowMapped.rows}</td>
                            <td className="px-4 py-3 font-bold text-cyan-100">{rowMapped.totalHours}</td>
                            <td className="px-4 py-3 text-slate-300">{rowMapped.overtime}</td>
                            <td className="px-4 py-3 text-amber-200">{rowMapped.totalLateMinutes}m</td>
                            <td className="px-4 py-3 text-rose-200">{rowMapped.undertime}</td>
                            <td className="px-4 py-3 font-black text-emerald-200">{formatPeso(rowMapped.grossPay)}</td>
                            <td className="px-4 py-3 font-black text-rose-200">{formatPeso(rowMapped.totalDeduction)}</td>
                            <td className="px-4 py-3 font-black text-cyan-100">{formatPeso(rowMapped.netPay)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {selectedPayroll && (
            <PayrollBreakdownModal
              item={selectedPayroll}
              onClose={() => setSelectedPayroll(null)}
              startDate={selectedArchiveBatch?.start_date}
              endDate={selectedArchiveBatch?.end_date}
              status={selectedArchiveBatch?.status}
              isArchive={true}
            />
          )}
        </section>
      )}
    </div>
  );
}

function PayrollBreakdownModal({ endDate, item, onClose, startDate, status }) {
  const rows = [
    ["Completed Days", item.completedDays],
    ["Attendance Rows", item.rows],
    ["Total Hours", item.totalHours],
    ["Overtime", item.overtime],
    ["Late Minutes", `${item.totalLateMinutes || 0}m`],
    ["Undertime", item.undertime],
  ];

  const earnings = [
    ["Regular Pay", formatPeso(item.regularPay)],
    ["Overtime Pay", formatPeso(item.overtimePay)],
  ];

  if (item.holidayPay && Number(item.holidayPay) > 0) {
    earnings.push(["Holiday Premium", formatPeso(item.holidayPay)]);
  }

  if (item.nightDiffPay && Number(item.nightDiffPay) > 0) {
    earnings.push(["Night Differential", formatPeso(item.nightDiffPay)]);
  }

  earnings.push(["Gross Pay", formatPeso(item.grossPay)]);

  // Dynamically compute Philippine government deductions for visualization (fallback to standard rates if not provided)
  const sssDeduction = item.sssDeduction !== undefined ? item.sssDeduction : Math.min(1350, item.grossPay * 0.045);
  const philhealthDeduction = item.philhealthDeduction !== undefined ? item.philhealthDeduction : Math.min(1000, item.grossPay * 0.025);
  const pagibigDeduction = item.pagibigDeduction !== undefined ? item.pagibigDeduction : Math.min(200, item.grossPay * 0.02);

  const customDeductions = item.calculatedCustomDeductions || [];
  
  const deductions = [
    ["Late Deduction", formatPeso(item.lateDeduction)],
    ["Undertime Deduction", formatPeso(item.undertimeDeduction)],
  ];

  if (customDeductions.length > 0) {
    customDeductions.forEach((ded) => {
      const typeLabel = ded.type === "percentage" ? ` (${ded.value}%)` : "";
      deductions.push([`${ded.name}${typeLabel}`, formatPeso(ded.amount)]);
    });
  } else {
    // Fallback to legacy hardcoded Philippine statutory deductions
    deductions.push(["SSS Share (4.5%)", formatPeso(sssDeduction)]);
    deductions.push(["PhilHealth Share (2.5%)", formatPeso(philhealthDeduction)]);
    deductions.push(["Pag-IBIG Share (2.0%)", formatPeso(pagibigDeduction)]);
  }

  deductions.push(["Total Deduction", formatPeso(item.totalDeduction)]);

  const generatePayslipPdf = () => {
    const payrollResult = {
      employee: {
        fullName: item.employee.fullName || "Employee",
        email: item.employee.email || "-",
        role: item.employee.role || "employee",
        dailyRate: item.employee.dailyRate || 0,
        hourlyRate: item.employee.hourlyRate || 0,
        id: item.employee.id || "N/A"
      },
      totalHours: item.totalHours || 0,
      overtimeHours: item.overtime || 0,
      regularPay: Number(item.regularPay || 0),
      overtimePay: Number(item.overtimePay || 0),
      holidayPay: Number(item.holidayPay || 0),
      nightDiffPay: Number(item.nightDiffPay || 0),
      grossPay: Number(item.grossPay || 0),
      lateDeduction: Number(item.lateDeduction || 0),
      undertimeDeduction: Number(item.undertimeDeduction || 0),
      sssDeduction: sssDeduction,
      philhealthDeduction: philhealthDeduction,
      pagibigDeduction: pagibigDeduction,
      calculatedCustomDeductions: customDeductions,
      totalDeduction: Number(item.totalDeduction || 0),
      netPay: Number(item.netPay || 0),
    };
    generatePremiumPayslip(payrollResult, {}, `${startDate} to ${endDate}`);
  };

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/65 p-3 backdrop-blur-sm sm:p-4">
      <div className="glass-panel max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl overflow-y-auto rounded-2xl p-4 sm:max-h-[calc(100dvh-2rem)] sm:p-6 text-slate-200">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">
              Payroll Breakdown
            </p>
            <h2 className="mt-2 text-2xl font-black text-white">
              {item.employee.fullName}
            </h2>
            <p className="mt-1 text-sm text-slate-400">{item.employee.email}</p>
            <p className="mt-2 text-xs font-semibold text-slate-500">
              Cutoff: {startDate} to {endDate}
            </p>
            <div className="mt-3">
              <PayrollStatusBadge status={status} />
            </div>
          </div>

          <button
            aria-label="Close payroll breakdown"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 text-slate-300 transition hover:border-cyan-300/30 hover:text-cyan-200"
            onClick={onClose}
            type="button"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map(([label, value]) => (
            <SummaryCell key={label} label={label} value={value} />
          ))}
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.05] p-4">
            <h3 className="text-sm font-black uppercase tracking-[0.14em] text-emerald-200">
              Earnings
            </h3>
            <div className="mt-4 grid gap-3">
              {earnings.map(([label, value]) => (
                <BreakdownLine key={label} label={label} value={value} />
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-rose-300/15 bg-rose-300/[0.05] p-4">
            <h3 className="text-sm font-black uppercase tracking-[0.14em] text-rose-200">
              Deductions
            </h3>
            <div className="mt-4 grid gap-3">
              {deductions.map(([label, value]) => (
                <BreakdownLine key={label} label={label} value={value} />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-5">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-200">
            Net Pay
          </p>
          <p className="mt-2 text-3xl font-black text-white">
            {formatPeso(item.netPay)}
          </p>
          <p className="mt-2 text-xs leading-5 text-slate-400">
            Net Pay = Gross Pay minus total deductions (including SSS, PhilHealth, Pag-IBIG, Late, and Undertime).
          </p>
          <button
            className="glow-button mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl px-5 text-sm font-black text-white"
            onClick={generatePayslipPdf}
            type="button"
          >
            <Download size={17} /> Generate Payslip PDF
          </button>


        </div>
      </div>
    </div>
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

function PayrollStatusBadge({ status }) {
  const label = status === "released" ? "Released" : status === "approved" ? "Approved" : "Pending";
  const className =
    status === "released"
      ? "border-cyan-300/25 bg-cyan-300/10 text-cyan-100"
      : status === "approved"
        ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
        : "border-amber-300/25 bg-amber-300/10 text-amber-100";

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-[0.68rem] font-black uppercase tracking-[0.12em] ${className}`}>
      {label}
    </span>
  );
}

function BreakdownLine({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.035] p-3 text-sm">
      <span className="text-slate-400">{label}</span>
      <span className="text-right font-black text-white">{value}</span>
    </div>
  );
}

function formatPeso(value) {
  return `PHP ${Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}
