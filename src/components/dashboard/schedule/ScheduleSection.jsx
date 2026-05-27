/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps, no-unused-vars */
import { useState, useEffect, useCallback, useMemo } from "react";
import { 
  CalendarDays, 
  ChevronLeft, 
  ChevronRight, 
  Trash2, 
  Plus, 
  Sparkles,
  Clock, 
  Copy, 
  User, 
  Check, 
  AlertCircle
} from "lucide-react";
import { useToast } from "../../../contexts/ToastContext";
import { 
  fetchWorkspaceSchedules, 
  saveSchedule, 
  deleteSchedule,
  getCurrentCutoffRange,
  getPreviousCutoffRange,
  toLocalISOString
} from "../../../utils/supabaseSchedule";

const DEFAULT_SHIFT_TEMPLATES = [
  { label: "Standard Day Shift", start: "08:00", end: "17:00", color: "#06b6d4", note: "Regular 8-hour workday" },
  { label: "Night Shift", start: "22:00", end: "07:00", color: "#8b5cf6", note: "Night shift support differential" },
  { label: "Afternoon Swing Shift", start: "14:00", end: "23:00", color: "#10b981", note: "Late afternoon & evening coverage" },
  { label: "Mall 10AM - Opening", start: "09:15", end: "19:15", color: "#06b6d4", note: "Mall open 10am opening duty shift" },
  { label: "Mall 10AM - Closing", start: "11:15", end: "21:15", color: "#8b5cf6", note: "Mall open 10am closing duty shift" },
  { label: "Mall 11AM - Opening", start: "10:15", end: "20:15", color: "#10b981", note: "Mall open 11am opening duty shift" },
  { label: "Mall 11AM - Closing", start: "12:15", end: "22:15", color: "#f59e0b", note: "Mall open 11am closing duty shift" },
  { label: "Rest Day", start: "OFF", end: "OFF", color: "#f43f5e", note: "Scheduled Rest Day / Day Off" },
];

const SHIFT_TEMPLATES_KEY = "trackly_shift_templates";

function loadShiftTemplates() {
  try {
    const stored = localStorage.getItem(SHIFT_TEMPLATES_KEY);
    if (stored) return JSON.parse(stored);
  } catch (err) {
    console.warn("Failed to load shift templates from storage", err);
  }
  return DEFAULT_SHIFT_TEMPLATES;
}

const PRESETS_COLORS = [
  "#06b6d4", // Cyan
  "#8b5cf6", // Violet
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#f43f5e", // Rose
  "#ec4899", // Pink
];

export default function ScheduleSection({ employees = [], workspace }) {
  const { addToast } = useToast();
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Preset shift templates — stored in localStorage so deletions persist
  const [shiftTemplates, setShiftTemplates] = useState(() => loadShiftTemplates());

  const handleDeleteTemplate = (labelToDelete) => {
    if (!window.confirm(`Remove "${labelToDelete}" from preset templates?`)) return;
    setShiftTemplates((prev) => {
      const updated = prev.filter((t) => t.label !== labelToDelete);
      localStorage.setItem(SHIFT_TEMPLATES_KEY, JSON.stringify(updated));
      return updated;
    });
    addToast(`"${labelToDelete}" removed from presets.`, "success");
  };

  const handleResetTemplates = () => {
    if (!window.confirm("Restore all default preset shift templates?")) return;
    localStorage.removeItem(SHIFT_TEMPLATES_KEY);
    setShiftTemplates(DEFAULT_SHIFT_TEMPLATES);
    addToast("Preset templates restored to defaults.", "success");
  };

  // Calendar Date Navigation (Viewing Month/Year)
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // View Toggle Mode
  const [viewMode, setViewMode] = useState("calendar"); // "calendar" or "cutoff"

  // Selection States
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [selectedDateStr, setSelectedDateStr] = useState("");
  const [activeScheduleId, setActiveScheduleId] = useState(null);
  
  // Shift Editor Form State
  const [shiftLabel, setShiftLabel] = useState("Standard Day Shift");
  const [shiftStart, setShiftStart] = useState("08:00");
  const [shiftEnd, setShiftEnd] = useState("17:00");
  const [shiftColor, setShiftColor] = useState("#06b6d4");
  const [shiftNotes, setShiftNotes] = useState("");
  const [isCustomShift, setIsCustomShift] = useState(false);
  const [checkedEmployeeIds, setCheckedEmployeeIds] = useState([]);

  useEffect(() => {
    if (selectedEmployeeId) {
      setCheckedEmployeeIds([selectedEmployeeId]);
    } else {
      setCheckedEmployeeIds([]);
    }
  }, [selectedEmployeeId, selectedDateStr]);

  // Cutoff calculation based on workspace settings
  const payrollPeriod = workspace?.payrollPeriod || workspace?.payroll_period || "semi-monthly";
  const currentCutoff = useMemo(() => getCurrentCutoffRange(payrollPeriod), [payrollPeriod]);
  const previousCutoff = useMemo(() => getPreviousCutoffRange(payrollPeriod), [payrollPeriod]);

  // Chronological list of dates in the current payroll cutoff
  const cutoffDays = useMemo(() => {
    if (!currentCutoff.start || !currentCutoff.end) return [];
    const start = new Date(currentCutoff.start);
    const end = new Date(currentCutoff.end);
    const days = [];
    
    let current = new Date(start);
    while (current <= end) {
      const dateStr = toLocalISOString(current);
      days.push({
        dateStr,
        dayNum: current.getDate(),
        dayName: current.toLocaleDateString("en-US", { weekday: "short" }),
        monthName: current.toLocaleDateString("en-US", { month: "short" }),
      });
      current.setDate(current.getDate() + 1);
    }
    return days;
  }, [currentCutoff]);

  const workspaceId = workspace?.id;

  // Auto-select first employee if none selected
  useEffect(() => {
    if (employees.length > 0 && !selectedEmployeeId) {
      setSelectedEmployeeId(employees[0].id);
    }
  }, [employees, selectedEmployeeId]);

  const loadSchedules = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const data = await fetchWorkspaceSchedules(workspaceId);
      setSchedules(data);
    } catch (err) {
      addToast(err.message || "Failed to load shift schedules.", "error");
    } finally {
      setLoading(false);
    }
  }, [workspaceId, addToast]);

  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

  // Calendar Helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDateStr("");
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDateStr("");
  };

  // Convert calendar date to dynamic YYYY-MM-DD
  const getDateString = (dayNum) => {
    const formattedMonth = String(month + 1).padStart(2, "0");
    const formattedDay = String(dayNum).padStart(2, "0");
    return `${year}-${formattedMonth}-${formattedDay}`;
  };

  // Filter schedules for active employee and date (maps each date to an array of schedules to support multiple shifts per date)
  const employeeSchedulesMap = useMemo(() => {
    const map = {};
    schedules
      .filter((s) => s.user_id === selectedEmployeeId)
      .forEach((s) => {
        if (!map[s.date]) map[s.date] = [];
        map[s.date].push(s);
      });
    return map;
  }, [schedules, selectedEmployeeId]);

  // Current active employee object
  const activeEmployee = useMemo(() => {
    return employees.find((e) => e.id === selectedEmployeeId);
  }, [employees, selectedEmployeeId]);

  // Current selected date schedules list
  const selectedDateSchedules = useMemo(() => {
    return employeeSchedulesMap[selectedDateStr] || [];
  }, [employeeSchedulesMap, selectedDateStr]);

  // Form Template Change
  const handleApplyTemplate = (tpl) => {
    setShiftLabel(tpl.label);
    setShiftStart(tpl.start);
    setShiftEnd(tpl.end);
    setShiftColor(tpl.color);
    setShiftNotes(tpl.note || "");
    setIsCustomShift(false);
  };

  // Save Schedule Handler
  const handleSaveSchedule = async (e) => {
    if (e) e.preventDefault();
    if (!workspaceId || checkedEmployeeIds.length === 0 || !selectedDateStr) {
      addToast("Please select at least one employee and date.", "warning");
      return;
    }

    setSaving(true);
    try {
      let successCount = 0;
      for (const empId of checkedEmployeeIds) {
        const existingShifts = schedules.filter((s) => s.user_id === empId && s.date === selectedDateStr);
        
        let targetId = undefined;
        if (empId === selectedEmployeeId && activeScheduleId) {
          targetId = activeScheduleId;
        } else if (existingShifts.length === 1 && !activeScheduleId) {
          // Overwrite if only one shift exists and no specific block is selected
          targetId = existingShifts[0].id;
        }

        await saveSchedule({
          id: targetId,
          workspace_id: workspaceId,
          user_id: empId,
          date: selectedDateStr,
          shift_start: shiftStart,
          shift_end: shiftEnd,
          label: shiftLabel,
          color: shiftColor,
          notes: shiftNotes.trim() || undefined,
        });
        successCount++;
      }

      addToast(`Shift saved successfully for ${successCount} employee(s)!`, "success");
      await loadSchedules();
      setSelectedDateStr("");
      setActiveScheduleId(null);
    } catch (err) {
      addToast(err.message || "Failed to save shift schedules.", "error");
    } finally {
      setSaving(false);
    }
  };

  // Delete Schedule Handler
  const handleDeleteSchedule = async (scheduleId) => {
    if (!window.confirm("Are you sure you want to clear this scheduled shift?")) return;
    
    setSaving(true);
    try {
      await deleteSchedule(scheduleId);
      addToast("Scheduled shift cleared successfully.", "success");
      await loadSchedules();
      setSelectedDateStr("");
    } catch (err) {
      addToast(err.message || "Failed to clear schedule.", "error");
    } finally {
      setSaving(false);
    }
  };

  // Save Custom Shift Config as reusable preset template in local storage
  const handleSaveToPresets = () => {
    if (!shiftLabel.trim()) {
      addToast("Please enter a custom shift label.", "warning");
      return;
    }
    
    if (shiftTemplates.some((t) => t.label.toLowerCase() === shiftLabel.trim().toLowerCase())) {
      addToast("A shift template with this label already exists.", "warning");
      return;
    }
    
    const newTemplate = {
      label: shiftLabel.trim(),
      start: shiftStart,
      end: shiftEnd,
      color: shiftColor,
      note: shiftNotes.trim() || "Custom saved shift template",
    };
    
    setShiftTemplates((prev) => {
      const updated = [...prev, newTemplate];
      localStorage.setItem(SHIFT_TEMPLATES_KEY, JSON.stringify(updated));
      return updated;
    });
    
    addToast(`"${shiftLabel.trim()}" successfully saved to your preset templates!`, "success");
  };

  // Bulk Generator: Auto-assign Mon-Fri for the entire month!
  const handleBulkGenerateWeekdays = async () => {
    if (!selectedEmployeeId || !workspaceId) return;
    if (!window.confirm(`Auto-assign Mon-Fri 'Standard Day Shift' (08:00 - 17:00) for ${activeEmployee?.fullName} for the entire month?`)) return;
    setSaving(true);
    let successCount = 0;
    try {
      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = getDateString(day);
        const dayOfWeek = new Date(year, month, day).getDay();
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
          const activeSchedule = employeeSchedulesMap[dateStr]?.[0];
          await saveSchedule({
            id: activeSchedule?.id || undefined,
            workspace_id: workspaceId,
            user_id: selectedEmployeeId,
            date: dateStr,
            shift_start: "08:00",
            shift_end: "17:00",
            label: "Standard Day Shift",
            color: "#06b6d4",
            notes: "Auto-generated weekdays for the month",
          });
          successCount++;
        }
      }
      addToast(`Assigned ${successCount} weekday shifts successfully!`, "success");
      await loadSchedules();
    } catch (err) {
      addToast(err.message || "Failed to bulk generate.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleBulkGenerateCutoff = async () => {
    if (!selectedEmployeeId || !workspaceId) return;
    const confirmMsg = `Auto-assign '${shiftLabel}' (${shiftStart} - ${shiftEnd}) to weekdays in cutoff (${currentCutoff.start} to ${currentCutoff.end})?`;
    if (!window.confirm(confirmMsg)) return;
    setSaving(true);
    let successCount = 0;
    try {
      for (const day of cutoffDays) {
        const dayOfWeek = new Date(day.dateStr).getDay();
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
          const activeSchedule = employeeSchedulesMap[day.dateStr]?.[0];
          await saveSchedule({
            id: activeSchedule?.id || undefined,
            workspace_id: workspaceId,
            user_id: selectedEmployeeId,
            date: day.dateStr,
            shift_start: shiftStart,
            shift_end: shiftEnd,
            label: shiftLabel,
            color: shiftColor,
            notes: shiftNotes.trim() || `Auto-assigned for cutoff`,
          });
          successCount++;
        }
      }
      addToast(`Scheduled ${successCount} cutoff shifts!`, "success");
      await loadSchedules();
    } catch (err) {
      addToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleCopyPreviousCutoff = async () => {
    if (!selectedEmployeeId || !workspaceId) return;
    const confirmMsg = `Copy previous cutoff's schedules (${previousCutoff.start} to ${previousCutoff.end}) to current cutoff (${currentCutoff.start} to ${currentCutoff.end})?`;
    if (!window.confirm(confirmMsg)) return;
    setSaving(true);
    try {
      const prevSchedules = schedules.filter(
        (s) => s.user_id === selectedEmployeeId && s.date >= previousCutoff.start && s.date <= previousCutoff.end
      );
      if (prevSchedules.length === 0) {
        addToast("No schedules found in the previous cutoff period.", "info");
        setSaving(false);
        return;
      }
      prevSchedules.sort((a, b) => a.date.localeCompare(b.date));
      const prevDays = [];
      let cur = new Date(previousCutoff.start);
      while (cur <= new Date(previousCutoff.end)) {
        prevDays.push(toLocalISOString(cur));
        cur.setDate(cur.getDate() + 1);
      }
      let copyCount = 0;
      for (let i = 0; i < cutoffDays.length; i++) {
        const targetDateStr = cutoffDays[i].dateStr;
        if (i < prevDays.length) {
          const prevDateStr = prevDays[i];
          const sourceSchedule = prevSchedules.find((s) => s.date === prevDateStr);
          if (sourceSchedule) {
            const activeSchedule = employeeSchedulesMap[targetDateStr]?.[0];
            await saveSchedule({
              id: activeSchedule?.id || undefined,
              workspace_id: workspaceId,
              user_id: selectedEmployeeId,
              date: targetDateStr,
              shift_start: sourceSchedule.shift_start,
              shift_end: sourceSchedule.shift_end,
              label: sourceSchedule.label,
              color: sourceSchedule.color,
              notes: sourceSchedule.notes || "Copied from previous cutoff",
            });
            copyCount++;
          }
        }
      }
      addToast(`Duplicated ${copyCount} shifts!`, "success");
      await loadSchedules();
    } catch (err) {
      addToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const calendarCells = useMemo(() => {
    const cells = [];
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push({ dayNum: null, dateStr: null });
    }

    // Active calendar date cells
    for (let day = 1; day <= daysInMonth; day++) {
      cells.push({
        dayNum: day,
        dateStr: getDateString(day),
      });
    }

    return cells;
  }, [firstDayIndex, daysInMonth, month, year]);

  // Analytics for the active view period (month calendar or payroll cutoff period)
  const activeStats = useMemo(() => {
    let shiftsCount = 0;
    let restDaysCount = 0;
    let totalScheduledHours = 0;

    const daysToCheck = viewMode === "cutoff" 
      ? cutoffDays.map(d => d.dateStr)
      : Array.from({ length: daysInMonth }, (_, i) => getDateString(i + 1));

    daysToCheck.forEach((dateStr) => {
      const daySchedules = employeeSchedulesMap[dateStr];
      if (daySchedules && Array.isArray(daySchedules)) {
        daySchedules.forEach((s) => {
          const isRestDay = s.shift_start === "OFF" || s.shift_end === "OFF" || s.label?.toLowerCase().includes("rest");
          if (isRestDay) {
            restDaysCount++;
          } else {
            shiftsCount++;
            const [startHour] = s.shift_start.split(":").map(Number);
            const [endHour] = s.shift_end.split(":").map(Number);
            if (!isNaN(startHour) && !isNaN(endHour)) {
              let diff = endHour - startHour;
              if (diff < 0) diff += 24;
              totalScheduledHours += Math.max(0, diff - 1);
            } else {
              totalScheduledHours += 8;
            }
          }
        });
      }
    });

    return {
      shiftsCount,
      restDaysCount,
      totalHours: totalScheduledHours,
    };
  }, [employeeSchedulesMap, viewMode, cutoffDays, daysInMonth, month, year]);

  return (
    <div className="mt-8 space-y-6">
      
      {/* Top Overview Bar */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        
        {/* Active Employee Selector Panel */}
        <div className="glass-panel border border-white/5 bg-white/[0.015] p-5 rounded-2xl flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Employee Workspace Scheduling</p>
            <div className="mt-2.5 flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-400/10 text-cyan-400 border border-cyan-400/20">
                <User size={20} />
              </div>
              <div className="flex-1">
                <select
                  value={selectedEmployeeId}
                  onChange={(e) => {
                    setSelectedEmployeeId(e.target.value);
                    setSelectedDateStr("");
                  }}
                  className="w-full bg-transparent border-0 text-white font-black text-lg focus:ring-0 outline-none cursor-pointer pr-8 leading-normal"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id} className="bg-[#0B1524] text-white py-2 text-sm font-semibold">
                      {emp.fullName} ({emp.position || "Employee"})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 font-semibold leading-none mt-0.5">Select a team member to edit/view schedule</p>
              </div>
            </div>
          </div>
        </div>

        {/* Payroll Cutoff Period Card */}
        <div className="glass-panel border border-white/5 bg-white/[0.015] p-5 rounded-2xl flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Payroll Cutoff Period</p>
            <div className="mt-2.5 flex items-start gap-2.5">
              <div className="rounded-lg bg-violet-500/10 border border-violet-500/20 px-2 py-1 text-[10px] font-black text-violet-300 uppercase shrink-0">
                {payrollPeriod === "semi-monthly" ? "Semi-Monthly" : "Monthly"}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-black text-white leading-tight">
                  {new Date(currentCutoff.start).toLocaleDateString("en-US", { month: "short", day: "numeric" })} - {new Date(currentCutoff.end).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>
                <p className="text-[9px] text-slate-400 font-semibold mt-1">
                  Active cutoff cycle for calculations
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Analytics stats */}
        <div className="glass-panel border border-white/5 bg-white/[0.015] p-5 rounded-2xl">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
            {viewMode === "cutoff" ? "Cutoff" : "Month"} Scheduled Shifts
          </p>
          <div className="mt-2 flex items-center justify-between">
            <h3 className="text-3xl font-black text-white">{activeStats.shiftsCount}</h3>
            <span className="rounded-lg bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 text-[10px] font-black text-cyan-300">
              Shifts
            </span>
          </div>
        </div>

        <div className="glass-panel border border-white/5 bg-white/[0.015] p-5 rounded-2xl">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
            {viewMode === "cutoff" ? "Cutoff" : "Month"} Pay Hours
          </p>
          <div className="mt-2 flex items-center justify-between">
            <h3 className="text-3xl font-black text-white">{activeStats.totalHours}h</h3>
            <span className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-black text-emerald-300">
              Est. Pay Hrs
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Calendar Left, Shift Editor Right */}
      <div className="grid gap-6 lg:grid-cols-12">
        
        {/* Visual Monthly Calendar Grid or Cutoff Days List */}
        <div className="lg:col-span-8 glass-panel min-w-0 rounded-2xl p-5 border border-white/10 bg-slate-950/20 shadow-xl flex flex-col justify-between">
          
          {/* Header Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/5 pb-4 mb-4 gap-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="text-cyan-300" size={20} />
              <h2 className="text-md font-black text-white tracking-wide">
                Schedule &bull; <span className="text-cyan-300 font-extrabold">{viewMode === "cutoff" ? "Cutoff Period" : `${monthNames[month]} ${year}`}</span>
              </h2>
            </div>

            {/* View Mode Toggle Pill */}
            <div className="flex items-center rounded-xl bg-slate-900/60 p-1 border border-white/5 self-start sm:self-auto shrink-0">
              <button
                type="button"
                onClick={() => setViewMode("calendar")}
                className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-200 ${
                  viewMode === "calendar"
                    ? "bg-cyan-500/10 border border-cyan-400/20 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.1)]"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Calendar
              </button>
              <button
                type="button"
                onClick={() => setViewMode("cutoff")}
                className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-200 ${
                  viewMode === "cutoff"
                    ? "bg-cyan-500/10 border border-cyan-400/20 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.1)]"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Cutoff Days
              </button>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              {viewMode === "calendar" && (
                <>
                  <button 
                    type="button"
                    onClick={handlePrevMonth}
                    className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/5 text-slate-300 hover:text-white transition active:scale-95"
                    title="Previous Month"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button 
                    type="button"
                    onClick={handleNextMonth}
                    className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/5 text-slate-300 hover:text-white transition active:scale-95"
                    title="Next Month"
                  >
                    <ChevronRight size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={handleBulkGenerateWeekdays}
                    disabled={saving || !selectedEmployeeId}
                    className="flex items-center gap-1.5 rounded-lg border border-cyan-400/35 bg-cyan-400/10 px-3 py-1.5 text-[10px] font-black uppercase text-cyan-300 hover:bg-cyan-400/20 transition active:scale-95 disabled:opacity-50"
                    title="Auto-Assign Mon-Fri Shifts"
                  >
                    <Sparkles size={11} />
                    Bulk Mon-Fri
                  </button>
                </>
              )}

              {viewMode === "cutoff" && (
                <>
                  <button
                    type="button"
                    onClick={handleBulkGenerateCutoff}
                    disabled={saving || !selectedEmployeeId}
                    className="flex items-center gap-1.5 rounded-lg border border-cyan-400/35 bg-cyan-400/10 px-3 py-1.5 text-[10px] font-black uppercase text-cyan-300 hover:bg-cyan-400/20 transition active:scale-95 disabled:opacity-50"
                    title="Auto-Assign Shift to weekdays in cutoff"
                  >
                    <Sparkles size={11} />
                    Apply to Cutoff
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyPreviousCutoff}
                    disabled={saving || !selectedEmployeeId}
                    className="flex items-center gap-1.5 rounded-lg border border-violet-500/35 bg-violet-500/10 px-3 py-1.5 text-[10px] font-black uppercase text-violet-300 hover:bg-violet-500/20 transition active:scale-95 disabled:opacity-50"
                    title="Copy previous cutoff's schedules"
                  >
                    <Copy size={11} />
                    Copy Previous
                  </button>
                </>
              )}
            </div>
          </div>

          {viewMode === "calendar" ? (
            <>
              {/* Weekday Labels */}
              <div className="grid grid-cols-7 gap-1 text-center mb-1">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayName) => (
                  <span key={dayName} className="text-[10px] font-black uppercase tracking-wider text-slate-500 py-1">
                    {dayName}
                  </span>
                ))}
              </div>

              {/* Month Cells Grid */}
              <div className="grid grid-cols-7 gap-1.5 min-h-[360px]">
                {calendarCells.map((cell, idx) => {
                  const isEmpty = cell.dayNum === null;
                  const cellSchedules = cell.dateStr ? (employeeSchedulesMap[cell.dateStr] || []) : [];
                  const isSelected = selectedDateStr === cell.dateStr;
                  const isToday = cell.dateStr === new Date().toISOString().split('T')[0];

                  if (isEmpty) {
                    return <div key={`empty-${idx}`} className="bg-transparent rounded-xl pointer-events-none opacity-0" />;
                  }

                  return (
                    <button
                      key={cell.dateStr}
                      onClick={() => {
                        setSelectedDateStr(cell.dateStr);
                        if (cellSchedules.length > 0) {
                          const firstSched = cellSchedules[0];
                          setActiveScheduleId(firstSched.id);
                          setShiftLabel(firstSched.label);
                          setShiftStart(firstSched.shift_start);
                          setShiftEnd(firstSched.shift_end);
                          setShiftColor(firstSched.color);
                          setShiftNotes(firstSched.notes || "");
                          
                          // Check if it is a preset template or custom
                          const matchTpl = shiftTemplates.find(
                            (t) => t.start === firstSched.shift_start && t.end === firstSched.shift_end
                          );
                          setIsCustomShift(!matchTpl);
                        } else {
                          setActiveScheduleId(null);
                          // Apply default Standard shift
                          handleApplyTemplate(DEFAULT_SHIFT_TEMPLATES[0]);
                        }
                      }}
                      className={`relative rounded-xl border p-2 text-left min-h-[82px] flex flex-col justify-between transition group focus:outline-none ${
                        isSelected
                          ? "border-cyan-400 bg-cyan-500/[0.06] shadow-[0_0_15px_rgba(6,182,212,0.12)]"
                          : isToday
                          ? "border-cyan-400/40 bg-white/[0.02] hover:border-cyan-400/60"
                          : "border-white/5 bg-white/[0.006] hover:border-white/10 hover:bg-white/[0.015]"
                      }`}
                      type="button"
                    >
                      {/* Day Indicator */}
                      <div className="flex items-center justify-between w-full">
                        <span className={`text-xs font-black leading-none ${
                          isToday ? "text-cyan-300 font-extrabold bg-cyan-400/10 border border-cyan-400/20 px-1.5 py-0.5 rounded-md" : "text-slate-400"
                        }`}>
                          {cell.dayNum}
                        </span>
                        
                        {cellSchedules.length > 0 && (
                          <div className="flex items-center gap-0.5 shrink-0">
                            {cellSchedules.slice(0, 3).map((sched) => (
                              <span key={sched.id} className="h-1.5 w-1.5 rounded-full block animate-pulse" style={{ backgroundColor: sched.color }} />
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Scheduled Shift Card display */}
                      {cellSchedules.length > 0 ? (
                        <div className="space-y-1 w-full mt-1.5">
                          {cellSchedules.map((sched) => {
                            const isRestDay = sched.shift_start === "OFF" || sched.label?.toLowerCase().includes("rest");
                            return (
                              <div 
                                key={sched.id}
                                className="px-1 py-0.5 rounded-md border text-[8px] font-black truncate leading-tight select-none w-full flex items-center justify-between"
                                style={{ 
                                  borderColor: `${sched.color}35`, 
                                  backgroundColor: `${sched.color}08`,
                                  color: sched.color
                                }}
                              >
                                <span className="truncate max-w-[70%] font-black uppercase text-[7.5px] tracking-wide">{sched.label}</span>
                                <span className="font-mono text-[7.5px] opacity-90">
                                  {isRestDay ? "OFF" : sched.shift_start}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="mt-2 text-[8px] font-bold text-slate-600 group-hover:text-cyan-400/50 uppercase transition-all duration-300 leading-none">
                          + Add shift
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            /* Cutoff Days Chronological List */
            <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10">
              {cutoffDays.map((day) => {
                const cellSchedules = employeeSchedulesMap[day.dateStr] || [];
                const isSelected = selectedDateStr === day.dateStr;
                const isToday = day.dateStr === toLocalISOString(new Date());

                return (
                  <button
                    key={day.dateStr}
                    onClick={() => {
                      setSelectedDateStr(day.dateStr);
                      if (cellSchedules.length > 0) {
                        const firstSched = cellSchedules[0];
                        setActiveScheduleId(firstSched.id);
                        setShiftLabel(firstSched.label);
                        setShiftStart(firstSched.shift_start);
                        setShiftEnd(firstSched.shift_end);
                        setShiftColor(firstSched.color);
                        setShiftNotes(firstSched.notes || "");
                        
                        const matchTpl = shiftTemplates.find(
                          (t) => t.start === firstSched.shift_start && t.end === firstSched.shift_end
                        );
                        setIsCustomShift(!matchTpl);
                      } else {
                        setActiveScheduleId(null);
                        handleApplyTemplate(DEFAULT_SHIFT_TEMPLATES[0]);
                      }
                    }}
                    type="button"
                    className={`w-full text-left rounded-xl border p-3 flex items-center justify-between transition group focus:outline-none ${
                      isSelected
                        ? "border-cyan-400 bg-cyan-500/[0.06] shadow-[0_0_15px_rgba(6,182,212,0.12)]"
                        : isToday
                        ? "border-cyan-400/40 bg-white/[0.02] hover:border-cyan-400/60"
                        : "border-white/5 bg-white/[0.006] hover:border-white/10 hover:bg-white/[0.015]"
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      {/* Date Badge */}
                      <div className={`flex flex-col items-center justify-center h-12 w-12 rounded-xl border shrink-0 text-center transition-all ${
                        isToday 
                          ? "bg-cyan-400/10 border-cyan-400/30 text-cyan-300"
                          : isSelected
                          ? "bg-cyan-500/5 border-cyan-400/20 text-white"
                          : "bg-white/[0.01] border-white/5 text-slate-300 group-hover:border-white/10"
                      }`}>
                        <span className="text-[10px] font-black uppercase tracking-wider opacity-60 leading-none">{day.dayName}</span>
                        <span className="text-lg font-black mt-0.5 leading-none">{day.dayNum}</span>
                      </div>

                      {/* Shift Info */}
                      <div className="min-w-0 flex-1">
                        {cellSchedules.length > 0 ? (
                          <div className="space-y-2">
                            {cellSchedules.map((sched) => {
                              const isRestDay = sched.shift_start === "OFF" || sched.label?.toLowerCase().includes("rest");
                              return (
                                <div key={sched.id} className="space-y-0.5 border-l-2 pl-2" style={{ borderColor: sched.color }}>
                                  <div className="flex items-center gap-2">
                                    <span 
                                      className="px-1.5 py-0.5 rounded text-[8.5px] font-black tracking-wider uppercase opacity-90"
                                      style={{ 
                                        backgroundColor: `${sched.color}15`, 
                                        color: sched.color,
                                        border: `1px solid ${sched.color}30`
                                      }}
                                    >
                                      {sched.label}
                                    </span>
                                    {isToday && (
                                      <span className="text-[8px] font-bold text-cyan-400 bg-cyan-400/10 px-1 py-0.2 rounded uppercase tracking-wider">
                                        Today
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-white font-extrabold flex items-center gap-1 mt-0.5">
                                    <Clock size={10} className="text-slate-400" />
                                    {isRestDay ? (
                                      <span className="text-rose-400">Scheduled Rest Day</span>
                                    ) : (
                                      <span className="font-mono text-slate-200">{sched.shift_start} - {sched.shift_end}</span>
                                    )}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div>
                            <p className="text-xs font-bold text-slate-500 group-hover:text-cyan-400/60 uppercase transition-all duration-300">
                              Rest Day / Unassigned
                            </p>
                            <p className="text-[10px] text-slate-600 mt-0.5">No shift scheduled. Click to assign.</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Quick status icon */}
                    <div className="shrink-0 pl-2">
                      {cellSchedules.length > 0 ? (
                        <div className="flex flex-col gap-0.5">
                          {cellSchedules.slice(0, 3).map((sched) => (
                            <span 
                              key={sched.id}
                              className="h-2 w-2 rounded-full block" 
                              style={{ backgroundColor: sched.color }}
                            />
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-600 group-hover:text-cyan-400 transition-all font-black pr-1">
                          + ADD
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Dynamic Shift Editor Drawer/Sidebar */}
        <div className="lg:col-span-4 flex flex-col gap-5">
          
          {selectedDateStr ? (
            <form 
              onSubmit={handleSaveSchedule}
              className="glass-panel rounded-2xl p-5 border border-white/10 bg-slate-950/20 shadow-xl space-y-4"
            >
              <div className="border-b border-white/5 pb-3">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Shift Configuration Builder</p>
                <h3 className="text-sm font-black text-white mt-1">
                  Assign Date: <span className="text-cyan-300 font-bold">{selectedDateStr}</span>
                </h3>
              </div>

              {/* List of current shifts for the selected employee and date to allow multi-shift switching and clearing */}
              {selectedDateSchedules && selectedDateSchedules.length > 0 && (
                <div className="space-y-2 border-b border-white/5 pb-3">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Scheduled Shift Blocks ({selectedDateSchedules.length})</label>
                  </div>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10">
                    {selectedDateSchedules.map((sched) => {
                      const isSelected = activeScheduleId === sched.id;
                      const isRest = sched.shift_start === "OFF" || sched.label?.toLowerCase().includes("rest");
                      return (
                        <div 
                          key={sched.id}
                          onClick={() => {
                            setActiveScheduleId(sched.id);
                            setShiftLabel(sched.label);
                            setShiftStart(sched.shift_start);
                            setShiftEnd(sched.shift_end);
                            setShiftColor(sched.color);
                            setShiftNotes(sched.notes || "");
                            
                            const matchTpl = shiftTemplates.find(
                              (t) => t.start === sched.shift_start && t.end === sched.shift_end
                            );
                            setIsCustomShift(!matchTpl);
                          }}
                          className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                            isSelected 
                              ? "border-cyan-400 bg-cyan-400/5 text-white" 
                              : "border-white/5 bg-slate-900/40 text-slate-300 hover:border-white/10"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: sched.color }} />
                            <div className="truncate">
                              <p className="font-extrabold text-[10.5px] leading-tight truncate">{sched.label}</p>
                              <p className="text-[9px] text-slate-400 font-mono mt-0.5">
                                {isRest ? "REST DAY / OFF" : `${sched.shift_start} - ${sched.shift_end}`}
                              </p>
                            </div>
                          </div>
                          
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSchedule(sched.id);
                            }}
                            className="h-6 w-6 flex items-center justify-center rounded-lg text-rose-400/50 hover:text-rose-400 hover:bg-rose-500/15 transition-all duration-150 shrink-0"
                            title="Delete shift"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Button to add an additional shift block */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveScheduleId(null);
                      setShiftLabel("Standard Day Shift");
                      setShiftStart("08:00");
                      setShiftEnd("17:00");
                      setShiftColor("#06b6d4");
                      setShiftNotes("");
                      setIsCustomShift(false);
                      addToast("Configuration builder reset for new shift block.", "info");
                    }}
                    className="flex items-center gap-1.5 text-[9px] font-black uppercase text-cyan-400 hover:text-cyan-300 py-1 transition-all mt-1"
                  >
                    <Plus size={11} />
                    + Add New Shift Block
                  </button>
                </div>
              )}

              {/* Employee Multiselection List */}
              <div className="space-y-2 border-b border-white/5 pb-3">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Assign To Employees</label>
                  <label className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-slate-500 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={checkedEmployeeIds.length === employees.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setCheckedEmployeeIds(employees.map(emp => emp.id));
                        } else {
                          setCheckedEmployeeIds([]);
                        }
                      }}
                      className="h-3 w-3 rounded border-white/10 bg-slate-950 text-cyan-500 outline-none cursor-pointer"
                    />
                    Select All
                  </label>
                </div>
                <div className="max-h-32 overflow-y-auto space-y-1.5 border border-white/5 bg-slate-900/40 p-2 rounded-xl">
                  {employees.map((emp) => {
                    const isChecked = checkedEmployeeIds.includes(emp.id);
                    return (
                      <label key={emp.id} className="flex items-center gap-2 text-xs text-slate-300 font-semibold cursor-pointer py-1 px-1.5 rounded hover:bg-white/5 transition-all select-none">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setCheckedEmployeeIds([...checkedEmployeeIds, emp.id]);
                            } else {
                              setCheckedEmployeeIds(checkedEmployeeIds.filter(id => id !== emp.id));
                            }
                          }}
                          className="h-3.5 w-3.5 rounded border-white/10 bg-slate-950 text-cyan-500 outline-none cursor-pointer"
                        />
                        <span className="truncate">{emp.fullName} ({emp.position || "Employee"})</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Template Presets selector */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Preset Shift Templates</label>
                  <button
                    type="button"
                    onClick={handleResetTemplates}
                    title="Restore all default templates"
                    className="text-[8px] font-black uppercase tracking-wider text-slate-500 hover:text-cyan-400 transition-colors px-1.5 py-0.5 rounded border border-transparent hover:border-cyan-400/20"
                  >
                    ↺ Reset
                  </button>
                </div>
                <div className="grid gap-2">
                  {shiftTemplates.map((tpl) => {
                    const isMatching = shiftStart === tpl.start && shiftEnd === tpl.end && shiftLabel === tpl.label;
                    return (
                      <div
                        key={tpl.label}
                        className={`group relative flex items-center justify-between rounded-xl border text-xs font-semibold transition-all duration-200 pr-1 ${
                          isMatching 
                            ? "border-cyan-400 bg-cyan-400/5 text-white" 
                            : "border-white/5 bg-white/[0.01] text-slate-300 hover:border-white/10 hover:bg-white/[0.02]"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleApplyTemplate(tpl)}
                          className="flex-1 text-left p-2.5 flex items-center gap-2"
                        >
                          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: tpl.color }} />
                          <div>
                            <p className="font-bold text-[10.5px]">{tpl.label}</p>
                            <p className="text-[9px] text-slate-400 font-mono mt-0.5">
                              {tpl.start === "OFF" ? "DAY OFF / REST DAY" : `${tpl.start} - ${tpl.end}`}
                            </p>
                          </div>
                        </button>
                        <div className="flex items-center gap-1 shrink-0 pl-1">
                          {isMatching && <Check size={13} className="text-cyan-300" />}
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleDeleteTemplate(tpl.label); }}
                            title={`Remove "${tpl.label}" preset`}
                            className="h-6 w-6 flex items-center justify-center rounded-lg text-rose-400/50 hover:text-rose-400 hover:bg-rose-500/15 transition-all duration-150 active:scale-90"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {shiftTemplates.length === 0 && (
                    <p className="text-[10px] text-slate-500 text-center py-3">
                      No presets. Click <span className="text-cyan-400 cursor-pointer" onClick={handleResetTemplates}>↺ Reset</span> to restore defaults.
                    </p>
                  )}
                </div>
              </div>

              {/* Custom Shift Toggle */}
              <div className="flex items-center justify-between border-t border-white/5 pt-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Custom Manual Config</span>
                <button
                  type="button"
                  onClick={() => setIsCustomShift(!isCustomShift)}
                  className={`text-[9px] font-black uppercase px-2 py-1 rounded-md border transition-all ${
                    isCustomShift 
                      ? "border-cyan-400 bg-cyan-400/10 text-cyan-300" 
                      : "border-white/10 bg-white/5 text-slate-400 hover:text-white"
                  }`}
                >
                  {isCustomShift ? "Custom Active" : "Customize"}
                </button>
              </div>

              {/* Custom fields */}
              {isCustomShift && (
                <div className="space-y-3 bg-white/[0.01] border border-white/5 p-3.5 rounded-xl animate-fade-in">
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-wider text-slate-500 block mb-1">Shift Custom Label</label>
                    <input
                      type="text"
                      value={shiftLabel}
                      onChange={(e) => setShiftLabel(e.target.value)}
                      placeholder="e.g. Morning Overtime, Half Day"
                      required
                      className="h-10 w-full rounded-lg border border-white/10 bg-[#0E1726] px-3 text-xs font-semibold text-white outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] font-black uppercase tracking-wider text-slate-500 block mb-1">Check In Time</label>
                      <input
                        type="time"
                        value={shiftStart}
                        onChange={(e) => setShiftStart(e.target.value)}
                        required
                        className="h-10 w-full rounded-lg border border-white/10 bg-[#0E1726] px-3 text-xs font-semibold text-white outline-none focus:border-cyan-400 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black uppercase tracking-wider text-slate-500 block mb-1">Check Out Time</label>
                      <input
                        type="time"
                        value={shiftEnd}
                        onChange={(e) => setShiftEnd(e.target.value)}
                        required
                        className="h-10 w-full rounded-lg border border-white/10 bg-[#0E1726] px-3 text-xs font-semibold text-white outline-none focus:border-cyan-400 font-mono"
                      />
                    </div>
                  </div>

                  {/* Preset Colors picker */}
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-wider text-slate-500 block mb-1.5">Shift Highlight Color</label>
                    <div className="flex items-center gap-1.5">
                      {PRESETS_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setShiftColor(c)}
                          className={`h-6 w-6 rounded-full border transition-all ${
                            shiftColor === c ? "border-white scale-110 shadow-lg" : "border-transparent hover:scale-105"
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Save to presets quick trigger */}
                  <div className="pt-2 border-t border-white/5 flex justify-end">
                    <button
                      type="button"
                      onClick={handleSaveToPresets}
                      className="flex items-center gap-1 bg-cyan-400/10 border border-cyan-400/35 hover:bg-cyan-400/20 text-cyan-300 rounded-lg px-2.5 py-1 text-[9px] font-black uppercase transition-all duration-200 active:scale-95 shadow-[0_0_10px_rgba(6,182,212,0.05)]"
                    >
                      💾 Save to Presets
                    </button>
                  </div>
                </div>
              )}

              {/* Notes field */}
              <div>
                <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">Shift Notes / Tasks</label>
                <textarea
                  value={shiftNotes}
                  onChange={(e) => setShiftNotes(e.target.value)}
                  placeholder="e.g. Perform server updates, monitor visual logs"
                  rows={2}
                  className="w-full rounded-lg border border-white/10 bg-[#0E1726] p-3 text-xs font-semibold text-white outline-none focus:border-cyan-400 resize-none leading-relaxed"
                />
              </div>

              {/* Form Action buttons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 glow-button flex h-10 items-center justify-center gap-1.5 rounded-xl text-xs font-black text-white transition disabled:opacity-50"
                >
                  <Check size={14} />
                  {saving ? "Saving..." : "Save Shift"}
                </button>
                
                {employeeSchedulesMap[selectedDateStr] && (
                  <button
                    type="button"
                    onClick={() => handleDeleteSchedule(employeeSchedulesMap[selectedDateStr].id)}
                    disabled={saving}
                    className="grid h-10 w-10 place-items-center rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 transition active:scale-95 disabled:opacity-50"
                    title="Clear Shift"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </form>
          ) : (
            <div className="glass-panel rounded-2xl p-5 border border-white/10 bg-slate-950/20 shadow-xl text-center py-12 flex flex-col items-center justify-center">
              <div className="h-12 w-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 mb-3 animate-pulse">
                <AlertCircle size={22} />
              </div>
              <h4 className="text-sm font-black text-white leading-none">No date selected</h4>
              <p className="text-[11px] leading-relaxed text-slate-400 mt-2 max-w-[200px]">
                Click on any calendar day cell in the grid to assign, modify, or clear shift schedules dynamically.
              </p>
            </div>
          )}

          {/* Helpful Tips Panel */}
          <div className="glass-panel border border-white/5 bg-white/[0.01] p-4 rounded-xl text-[11px] leading-relaxed text-slate-400 flex gap-2.5">
            <span className="text-cyan-300">💡</span>
            <div>
              <p className="font-bold text-white leading-none">Dynamic Calculation Sync</p>
              <p className="mt-1">
                Assigning a specific shift start time automatically updates late-tracking checks for the employee on that day! For example, assigning a 10:00 AM shift allows them to clock in without a late penalty until 10:00 AM.
              </p>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
