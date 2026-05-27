import { motion } from "framer-motion";
import DashboardShell from "../components/dashboard/DashboardShell";
import PageTransition from "../components/PageTransition";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { workspaceToView } from "../utils/supabaseMappers";
import { fetchAnnouncements, createAnnouncement, deleteAnnouncement } from "../utils/supabaseAnnouncements";
import { fetchWorkspaceHolidays, createWorkspaceHoliday, deleteWorkspaceHoliday } from "../utils/supabaseHolidays";
import { supabase } from "../lib/supabaseClient";
import { fetchWorkspaceEmployees } from "../utils/supabaseAttendance";
import { Plus, Trash2, Globe, Sparkles, Search, X } from "lucide-react";

// Modular Settings Subcomponents
import SettingsInput from "../components/dashboard/SettingsInput";
import AnnouncementsManager from "../components/dashboard/AnnouncementsManager";
import GlobalDeductionsManager from "../components/dashboard/GlobalDeductionsManager";
import GeofenceSettings from "../components/dashboard/GeofenceSettings";
import HolidaysManager from "../components/dashboard/HolidaysManager";

const groups = [
  {
    title: "Attendance Methods",
    items: [
      ["manualTimeTracking", "Manual Time Tracking"],
      ["cameraAttendance", "Camera Attendance with time/date photo"],
      ["locationRequired", "Require Location/GPS"],
      ["faceVerification", "Require AI Face Matching"],
    ],
  },
  {
    title: "Time Buttons",
    items: [
      ["timeIn", "Time In"],
      ["breakIn", "Break In"],
      ["breakOut", "Break Out"],
      ["timeOut", "Time Out"],
    ],
  },
  {
    title: "Break Settings",
    items: [
      ["paidBreakOption", "Paid Break Option"],
      ["unpaidBreakOption", "Unpaid Break Option"],
      ["requireBreakReason", "Require break reason if late/extended"],
    ],
  },
  {
    title: "Employee Tools",
    items: [
      ["employeeComments", "Employee Comments / Reason Notes"],
      ["correctionRequests", "Correction Requests"],
      ["employeePdfExport", "Employee PDF Export"],
      ["salaryEstimate", "Salary Estimate"],
      ["leaveRequests", "Leave Requests"],
      ["restDayStatus", "Rest Day Status"],
      ["announcements", "Announcements"],
    ],
  },
];

function AdminSettingsPage() {
  const { permissions: savedPermissions, profile, updatePermissions, updateWorkspace, workspace: authWorkspace } = useAuth();
  const { addToast } = useToast();
  const [permissions, setPermissions] = useState(savedPermissions);
  const [workspaceSettings, setWorkspaceSettings] = useState(workspaceToView(authWorkspace, profile));
  const [savedKey, setSavedKey] = useState("");
  const [error, setError] = useState("");
  const [workspaceSaved, setWorkspaceSaved] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [checkedEmployeeIds, setCheckedEmployeeIds] = useState([]);
  const workspace = workspaceToView(authWorkspace, profile);

  const [announcements, setAnnouncements] = useState([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true);
  const [announcementForm, setAnnouncementForm] = useState({ title: "", body: "" });
  const [posting, setPosting] = useState(false);

  // Custom Deductions Editor States
  const [newDedName, setNewDedName] = useState("");
  const [newDedType, setNewDedType] = useState("percentage");
  const [newDedValue, setNewDedValue] = useState("");
  const [newDedCap, setNewDedCap] = useState("");

  // Custom Holidays States
  const [holidays, setHolidays] = useState([]);
  const [loadingHolidays, setLoadingHolidays] = useState(false);
  const [newHolidayName, setNewHolidayName] = useState("");
  const [newHolidayDate, setNewHolidayDate] = useState("");
  const [newHolidayType, setNewHolidayType] = useState("regular");

  const authWorkspaceId = authWorkspace?.id;

  // Custom Rule Presets States
  const [presets, setPresets] = useState(() => {
    if (typeof window === "undefined" || !authWorkspaceId) return [];
    try {
      const saved = localStorage.getItem(`trackly_custom_rules_presets_${authWorkspaceId}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [selectedPresetId, setSelectedPresetId] = useState("global");
  const [newPresetName, setNewPresetName] = useState("");
  const [showAddPresetModal, setShowAddPresetModal] = useState(false);
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState("");

  // Form Editing Rules State
  const [editingRules, setEditingRules] = useState({
    name: "",
    industry: "",
    companyAddress: "",
    contactNumber: "",
    expectedWorkHours: 8,
    lateGraceMinutes: 0,
    salaryModel: "hourly",
    baseAmount: 0,
    overtimeRate: 1.25,
    payrollPeriod: "semi-monthly",
    breakHours: 1,
    breakIsPaid: false,
    overtimeThresholdMinutes: 30,
    holidayRegularRate: 2.0,
    holidaySpecialRate: 1.3,
    nightDiffRate: 0.10,
    geofenceEnabled: false,
    geofenceLatitude: null,
    geofenceLongitude: null,
    geofenceRadiusMeters: 100,
    targetEmployeeIds: [] // Specifically for custom presets
  });

  // Sync edits state when selection changes synchronously in render to prevent cascading renders
  const [prevSelectedPresetId, setPrevSelectedPresetId] = useState(selectedPresetId);
  const [prevWorkspaceSettings, setPrevWorkspaceSettings] = useState(workspaceSettings);
  const [prevPresets, setPrevPresets] = useState(presets);

  if (selectedPresetId !== prevSelectedPresetId || workspaceSettings !== prevWorkspaceSettings || presets !== prevPresets) {
    setPrevSelectedPresetId(selectedPresetId);
    setPrevWorkspaceSettings(workspaceSettings);
    setPrevPresets(presets);

    if (selectedPresetId === "global") {
      setEditingRules({
        ...workspaceSettings,
        targetEmployeeIds: []
      });
    } else {
      const activePreset = presets.find((p) => p.id === selectedPresetId);
      if (activePreset) {
        setEditingRules({
          ...activePreset,
          targetEmployeeIds: activePreset.targetEmployeeIds || []
        });
      }
    }
  }

  // Save presets to localStorage
  const savePresetsToStorage = (nextPresets) => {
    setPresets(nextPresets);
    if (authWorkspaceId) {
      localStorage.setItem(`trackly_custom_rules_presets_${authWorkspaceId}`, JSON.stringify(nextPresets));
    }
  };

  const handleAddPreset = (e) => {
    e.preventDefault();
    if (!newPresetName.trim()) return;

    const newPreset = {
      id: "preset_" + Date.now().toString(),
      name: newPresetName.trim(),
      targetEmployeeIds: [],
      // Inherit rules from global settings as base defaults
      expectedWorkHours: workspaceSettings.expectedWorkHours || 8,
      lateGraceMinutes: workspaceSettings.lateGraceMinutes || 0,
      salaryModel: workspaceSettings.salaryModel || "hourly",
      baseAmount: workspaceSettings.baseAmount || 0,
      overtimeRate: workspaceSettings.overtimeRate || 1.25,
      payrollPeriod: workspaceSettings.payrollPeriod || "semi-monthly",
      breakHours: workspaceSettings.breakHours || 1,
      breakIsPaid: workspaceSettings.breakIsPaid || false,
      overtimeThresholdMinutes: workspaceSettings.overtimeThresholdMinutes || 30,
      holidayRegularRate: workspaceSettings.holidayRegularRate || 2.0,
      holidaySpecialRate: workspaceSettings.specialRegularRate || 1.3,
      nightDiffRate: workspaceSettings.nightDiffRate || 0.10,
      geofenceEnabled: workspaceSettings.geofenceEnabled || false,
      geofenceLatitude: workspaceSettings.geofenceLatitude || null,
      geofenceLongitude: workspaceSettings.geofenceLongitude || null,
      geofenceRadiusMeters: workspaceSettings.geofenceRadiusMeters || 100
    };

    const nextPresets = [...presets, newPreset];
    savePresetsToStorage(nextPresets);
    setSelectedPresetId(newPreset.id);
    setNewPresetName("");
    setShowAddPresetModal(false);
    addToast(`Preset "${newPreset.name}" successfully created!`, "success");
  };

  const handleDeletePreset = (presetId, e) => {
    e.stopPropagation(); // Prevent tab focus trigger
    const nextPresets = presets.filter((p) => p.id !== presetId);
    savePresetsToStorage(nextPresets);
    setSelectedPresetId("global");
    addToast("Custom preset successfully removed.", "info");
  };

  useEffect(() => {
    async function loadEmployees() {
      if (!authWorkspaceId) return;
      try {
        const data = await fetchWorkspaceEmployees(authWorkspaceId);
        setEmployees(data || []);
      } catch (err) {
        console.error("Failed to load workspace employees for settings:", err);
      }
    }
    loadEmployees();
  }, [authWorkspaceId]);

  const loadAnnouncements = useCallback(async (showLoading = false) => {
    if (!authWorkspaceId) return;
    if (showLoading) setLoadingAnnouncements(true);
    try {
      const data = await fetchAnnouncements(authWorkspaceId);
      setAnnouncements(data);
    } catch (err) {
      console.error("Failed to load announcements:", err);
    } finally {
      setLoadingAnnouncements(false);
    }
  }, [authWorkspaceId]);

  const loadHolidays = useCallback(async (showLoading = false) => {
    if (!authWorkspaceId) return;
    if (showLoading) setLoadingHolidays(true);
    try {
      const data = await fetchWorkspaceHolidays(authWorkspaceId);
      setHolidays(data);
    } catch (err) {
      console.error("Failed to load custom holidays:", err);
    } finally {
      setLoadingHolidays(false);
    }
  }, [authWorkspaceId]);

  useEffect(() => {
    if (!authWorkspaceId) return undefined;
    let active = true;

    async function initData() {
      try {
        const annData = await fetchAnnouncements(authWorkspaceId);
        if (active) setAnnouncements(annData);
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setLoadingAnnouncements(false);
      }

      try {
        const holData = await fetchWorkspaceHolidays(authWorkspaceId);
        if (active) setHolidays(holData);
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setLoadingHolidays(false);
      }
    }

    initData();
    return () => {
      active = false;
    };
  }, [authWorkspaceId]);

  const handlePostAnnouncement = async (e) => {
    e.preventDefault();
    if (!authWorkspace?.id || !profile?.id) return;
    setPosting(true);
    try {
      await createAnnouncement({
        workspaceId: authWorkspace.id,
        title: announcementForm.title,
        body: announcementForm.body,
        adminId: profile.id,
      });
      setAnnouncementForm({ title: "", body: "" });
      await loadAnnouncements();
    } catch (err) {
      setError(err.message || "Failed to post announcement.");
    } finally {
      setPosting(false);
    }
  };

  const handleDeleteAnnouncement = async (id) => {
    try {
      await deleteAnnouncement(id);
      await loadAnnouncements();
    } catch (err) {
      setError(err.message || "Failed to delete announcement.");
    }
  };

  const handleAddHoliday = async (e) => {
    e.preventDefault();
    if (!authWorkspaceId) return;
    if (!newHolidayName.trim() || !newHolidayDate) return;
    try {
      await createWorkspaceHoliday({
        workspaceId: authWorkspaceId,
        date: newHolidayDate,
        name: newHolidayName,
        type: newHolidayType,
      });
      setNewHolidayName("");
      setNewHolidayDate("");
      setNewHolidayType("regular");
      addToast("Custom holiday added successfully!", "success");
      await loadHolidays();
    } catch (err) {
      addToast(err.message || "Failed to add holiday.", "error");
    }
  };

  const handleDeleteHoliday = async (id) => {
    try {
      await deleteWorkspaceHoliday(id);
      addToast("Custom holiday deleted successfully!", "success");
      await loadHolidays();
    } catch (err) {
      addToast(err.message || "Failed to delete holiday.", "error");
    }
  };

  // Synchronously update local permissions state when auth permissions shift to prevent cascading renders
  const [prevSavedPermissions, setPrevSavedPermissions] = useState(savedPermissions);
  if (savedPermissions !== prevSavedPermissions) {
    setPrevSavedPermissions(savedPermissions);
    setPermissions(savedPermissions);
  }

  // Synchronously update local workspaceSettings when auth workspace profile shifts to prevent cascading renders
  const [prevAuthWorkspace, setPrevAuthWorkspace] = useState(authWorkspace);
  const [prevProfile, setPrevProfile] = useState(profile);
  if (authWorkspace !== prevAuthWorkspace || profile !== prevProfile) {
    setPrevAuthWorkspace(authWorkspace);
    setPrevProfile(profile);
    setWorkspaceSettings(workspaceToView(authWorkspace, profile));
  }

  const toggle = async (key) => {
    const next = { ...permissions, [key]: !permissions[key] };
    setPermissions(next);
    setError("");
    try {
      await updatePermissions(next);
      setSavedKey(key);
    } catch (saveError) {
      setPermissions(permissions);
      setError(saveError.message || "Unable to save permissions.");
    }
  };

  useEffect(() => {
    if (!savedKey) return undefined;
    const timer = window.setTimeout(() => setSavedKey(""), 1200);
    return () => window.clearTimeout(timer);
  }, [savedKey]);

  const handleAddDeduction = (targetIds) => {
    if (!newDedName.trim() || !newDedValue) return;

    const currentDeductions = editingRules.customDeductions || [];
    const newDed = {
      id: "ded_" + Date.now().toString(),
      name: newDedName.trim(),
      type: newDedType,
      value: Number(newDedValue),
      cap: newDedCap ? Number(newDedCap) : null,
      targetIds: targetIds || []
    };

    setEditingRules({
      ...editingRules,
      customDeductions: [...currentDeductions, newDed]
    });

    setNewDedName("");
    setNewDedValue("");
    setNewDedCap("");
  };

  const handleDeleteDeduction = (id) => {
    const currentDeductions = editingRules.customDeductions || [];
    setEditingRules({
      ...editingRules,
      customDeductions: currentDeductions.filter(d => d.id !== id)
    });
  };

  // Filtered employees for checklist search
  const filteredEmployees = employees.filter(emp => {
    const query = employeeSearchQuery.toLowerCase().trim();
    const name = (emp.fullName || emp.full_name || "").toLowerCase();
    const email = (emp.email || "").toLowerCase();
    return !query || name.includes(query) || email.includes(query);
  });

  const saveWorkspaceSettings = async (event) => {
    event.preventDefault();
    setError("");
    setWorkspaceSaved(false);

    if (selectedPresetId === "global") {
      // 1. SAVE GLOBAL DATABASE CONFIGS
      const isDaily = editingRules.salaryModel === "daily";
      const hRate = isDaily ? 0 : Number(editingRules.baseAmount || 0);
      const dRate = isDaily ? Number(editingRules.baseAmount || 0) : 0;

      try {
        await updateWorkspace({
          workspaceName: editingRules.name,
          industry: editingRules.industry,
          teamSize: workspaceSettings.teamSize,
          companyAddress: editingRules.companyAddress,
          contactNumber: editingRules.contactNumber,
          shiftStartTime: editingRules.shiftStartTime || "08:00",
          expectedWorkHours: Number(editingRules.expectedWorkHours),
          lateGraceMinutes: Number(editingRules.lateGraceMinutes),
          hourlyRate: hRate,
          dailyRate: dRate,
          overtimeRate: Number(editingRules.overtimeRate),
          payrollPeriod: editingRules.payrollPeriod,
          breakHours: Number(editingRules.breakHours),
          breakIsPaid: Boolean(editingRules.breakIsPaid),
          overtimeThresholdMinutes: Number(editingRules.overtimeThresholdMinutes),
          customDeductions: editingRules.customDeductions,
          holidayRegularRate: Number(editingRules.holidayRegularRate ?? 2.0),
          holidaySpecialRate: Number(editingRules.holidaySpecialRate ?? 1.3),
          nightDiffRate: Number(editingRules.nightDiffRate ?? 0.10),
          geofenceEnabled: Boolean(editingRules.geofenceEnabled),
          geofenceLatitude: editingRules.geofenceLatitude,
          geofenceLongitude: editingRules.geofenceLongitude,
          geofenceRadiusMeters: Number(editingRules.geofenceRadiusMeters ?? 100),
        });

        if (checkedEmployeeIds.length > 0) {
          const { error: profileError } = await supabase
            .from("profiles")
            .update({
              hourly_rate: hRate,
              daily_rate: dRate,
            })
            .in("id", checkedEmployeeIds);

          if (profileError) throw profileError;
          addToast(`Successfully assigned base rates to ${checkedEmployeeIds.length} employee(s) profiles!`, "success");
        }

        setWorkspaceSaved(true);
        setCheckedEmployeeIds([]); // Clear selection after save
        addToast("Global default rules saved to Supabase successfully!", "success");
      } catch (saveError) {
        setError(saveError.message || "Unable to save workspace settings.");
      }
    } else {
      // 2. SAVE CUSTOM PRESET TO LOCAL STORAGE
      // Double check employees aren't duplicated across presets to prevent conflicting rules
      const cleanedPresets = presets.map((p) => {
        if (p.id === selectedPresetId) {
          return {
            ...p,
            ...editingRules,
            targetEmployeeIds: editingRules.targetEmployeeIds || []
          };
        }
        // Remove employee IDs from other presets if they are checked in this active preset
        return {
          ...p,
          targetEmployeeIds: (p.targetEmployeeIds || []).filter(
            (id) => !editingRules.targetEmployeeIds.includes(id)
          )
        };
      });

      savePresetsToStorage(cleanedPresets);
      setWorkspaceSaved(true);
      addToast(`Custom preset "${editingRules.name}" successfully updated & assigned!`, "success");
    }
  };

  return (
    <PageTransition>
      <DashboardShell workspace={workspace}>
        <motion.main
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="px-3 py-4 sm:px-6 sm:py-6 lg:px-8 bg-[#07111F]"
        >
          <div className="mx-auto max-w-6xl min-w-0 space-y-6">
            <div>
              <h1 className="text-[clamp(1.85rem,9vw,3rem)] font-black tracking-tight text-white leading-none">
                Workspace <span className="gradient-text">Settings</span>
              </h1>
              <p className="mt-3 text-sm text-slate-400">
                Manage global rules, create custom settings presets for specific employees, and toggle permission modules.
              </p>
            </div>

            {error && (
              <div className="rounded-xl border border-rose-300/30 bg-rose-400/10 p-4 text-sm font-semibold text-rose-100 animate-pulse">
                {error}
              </div>
            )}

            {/* Form Box */}
            <form className="glass-panel rounded-2xl p-4 sm:p-6 space-y-6 border border-white/10" onSubmit={saveWorkspaceSettings}>
              
              {/* Presets Switcher Bar */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-300">Active Rules Presets</h3>
                  <button
                    type="button"
                    onClick={() => setShowAddPresetModal(true)}
                    className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-cyan-300 bg-cyan-500/10 border border-cyan-400/25 px-3 py-1.5 rounded-lg hover:bg-cyan-500/20 active:scale-95 transition-all cursor-pointer"
                  >
                    <Plus size={12} /> Add Setting Preset
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 items-center border-b border-white/5 pb-3">
                  {/* Global default tab */}
                  <button
                    type="button"
                    onClick={() => setSelectedPresetId("global")}
                    className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                      selectedPresetId === "global"
                        ? "bg-gradient-to-tr from-cyan-500/20 to-violet-500/20 border-cyan-300/40 text-white shadow-lg"
                        : "border-transparent bg-white/[0.02] text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <Globe size={14} /> Global Defaults (Supabase)
                  </button>

                  {/* Custom Presets tabs */}
                  {presets.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setSelectedPresetId(preset.id)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer border group ${
                        selectedPresetId === preset.id
                          ? "bg-gradient-to-tr from-cyan-500/20 to-violet-500/20 border-cyan-300/40 text-white shadow-lg"
                          : "border-transparent bg-white/[0.02] text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <Sparkles size={13} className="text-cyan-300" />
                      {preset.name}
                      <span className="text-[10px] bg-white/10 text-slate-300 px-1.5 py-0.5 rounded-md">
                        {preset.targetEmployeeIds?.length || 0}
                      </span>
                      <Trash2
                        size={12}
                        onClick={(e) => handleDeletePreset(preset.id, e)}
                        className="text-slate-500 hover:text-rose-400 transition ml-1 shrink-0"
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Employee Checklist Bar (Visible ONLY for Custom Presets at the top) */}
              {selectedPresetId !== "global" && (
                <div className="rounded-2xl border border-cyan-500/15 bg-cyan-500/[0.03] p-4.5 space-y-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-black text-white flex items-center gap-1.5 leading-none">
                        🎯 Affected Employees Checklist Bar
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Select which employees are bound to the custom rules preset <strong>"{editingRules.name}"</strong>. (Checked employees will automatically use these custom rules instead of workspace defaults).
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {/* Search mini bar */}
                      <div className="relative">
                        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="text"
                          placeholder="Search..."
                          value={employeeSearchQuery}
                          onChange={(e) => setEmployeeSearchQuery(e.target.value)}
                          className="h-8 w-28 sm:w-36 rounded-lg border border-white/5 bg-slate-950/40 pl-7 pr-2.5 text-[10px] text-white outline-none focus:border-cyan-300/30"
                        />
                      </div>

                      <label className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-500 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={editingRules.targetEmployeeIds?.length === employees.length && employees.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEditingRules({
                                ...editingRules,
                                targetEmployeeIds: employees.map(emp => emp.id)
                              });
                            } else {
                              setEditingRules({
                                ...editingRules,
                                targetEmployeeIds: []
                              });
                            }
                          }}
                          className="h-3.5 w-3.5 rounded border-white/10 bg-slate-950 text-cyan-500 outline-none cursor-pointer"
                        />
                        Check All
                      </label>
                    </div>
                  </div>

                  {employees.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-4">No employees linked to this workspace yet.</p>
                  ) : (
                    <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 max-h-32 overflow-y-auto border border-white/5 bg-slate-950/30 p-3 rounded-xl custom-scrollbar">
                      {filteredEmployees.map((emp) => {
                        const isChecked = (editingRules.targetEmployeeIds || []).includes(emp.id);
                        return (
                          <label
                            key={emp.id}
                            className={`flex items-center gap-2 text-xs font-semibold cursor-pointer py-1 px-1.5 rounded transition-all select-none border ${
                              isChecked
                                ? "bg-cyan-500/10 border-cyan-400/20 text-cyan-200"
                                : "bg-white/[0.01] border-transparent text-slate-400 hover:bg-white/[0.03] hover:text-slate-300"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const currentIds = editingRules.targetEmployeeIds || [];
                                if (e.target.checked) {
                                  setEditingRules({
                                    ...editingRules,
                                    targetEmployeeIds: [...currentIds, emp.id]
                                  });
                                } else {
                                  setEditingRules({
                                    ...editingRules,
                                    targetEmployeeIds: currentIds.filter(id => id !== emp.id)
                                  });
                                }
                              }}
                              className="h-3.5 w-3.5 rounded border-white/10 bg-slate-950 text-cyan-500 outline-none cursor-pointer"
                            />
                            <span className="truncate">{emp.fullName || emp.full_name || "Employee"}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Form Config Fields */}
              <div className="space-y-4">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <h4 className="text-sm font-black uppercase tracking-[0.16em] text-cyan-300">
                      Preset variables ({selectedPresetId === "global" ? "Global Defaults" : `Preset: ${editingRules.name}`})
                    </h4>
                  </div>
                  <button className="glow-button h-10 w-full rounded-xl px-5 text-xs font-black text-white sm:w-auto" type="submit">
                    Save Rules Configuration
                  </button>
                </div>

                {workspaceSaved && (
                  <div className="rounded-xl border border-emerald-300/30 bg-emerald-400/10 p-3 text-xs font-bold text-emerald-100">
                    🎉 Rules and employee presets successfully saved and assigned!
                  </div>
                )}

                <div className="grid gap-3.5 md:grid-cols-2 lg:grid-cols-4">
                  {selectedPresetId === "global" && (
                    <>
                      <SettingsInput label="Workspace Name" value={editingRules.name || ""} onChange={(value) => setEditingRules({ ...editingRules, name: value })} />
                      <SettingsInput label="Industry" value={editingRules.industry || ""} onChange={(value) => setEditingRules({ ...editingRules, industry: value })} />
                      <SettingsInput label="Company Address" value={editingRules.companyAddress || ""} onChange={(value) => setEditingRules({ ...editingRules, companyAddress: value })} />
                      <SettingsInput label="Contact Number" value={editingRules.contactNumber || ""} onChange={(value) => setEditingRules({ ...editingRules, contactNumber: value })} />
                    </>
                  )}

                  {selectedPresetId !== "global" && (
                    <SettingsInput label="Preset Name" value={editingRules.name || ""} onChange={(value) => setEditingRules({ ...editingRules, name: value })} />
                  )}

                  <SettingsInput label="Expected Hours" type="number" min="1" step="0.25" value={editingRules.expectedWorkHours || ""} onChange={(value) => setEditingRules({ ...editingRules, expectedWorkHours: value })} />
                  <SettingsInput label="Grace Minutes" type="number" min="0" value={editingRules.lateGraceMinutes || ""} onChange={(value) => setEditingRules({ ...editingRules, lateGraceMinutes: value })} />
                  
                  <label className="grid gap-2">
                    <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Salary Model</span>
                    <select
                      className="h-12 rounded-xl border border-white/10 bg-[#0B1424] px-3 text-sm font-semibold text-white outline-none focus:border-cyan-300/50"
                      onChange={(event) => setEditingRules({ ...editingRules, salaryModel: event.target.value })}
                      value={editingRules.salaryModel || "hourly"}
                    >
                      <option value="hourly">Hourly Rate Model</option>
                      <option value="daily">Daily Rate Model</option>
                    </select>
                  </label>

                  <SettingsInput 
                    label={editingRules.salaryModel === "daily" ? "Daily Rate Amount" : "Hourly Rate Amount"} 
                    type="number" 
                    min="0" 
                    step="0.01" 
                    value={editingRules.baseAmount || ""} 
                    onChange={(value) => setEditingRules({ ...editingRules, baseAmount: value })} 
                  />

                  <SettingsInput label="Overtime Rate" type="number" min="1" step="0.05" value={editingRules.overtimeRate || ""} onChange={(value) => setEditingRules({ ...editingRules, overtimeRate: value })} />
                  <label className="grid gap-2">
                    <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Payroll Period</span>
                    <select
                      className="h-12 rounded-xl border border-white/10 bg-[#0B1424] px-3 text-sm font-semibold text-white outline-none focus:border-cyan-300/50"
                      onChange={(event) => setEditingRules({ ...editingRules, payrollPeriod: event.target.value })}
                      value={editingRules.payrollPeriod || "semi-monthly"}
                    >
                      <option value="weekly">Weekly</option>
                      <option value="semi-monthly">Semi-monthly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </label>
                  
                  <SettingsInput 
                    label="Break Hours" 
                    type="number" 
                    min="0" 
                    max="4"
                    step="0.25" 
                    value={editingRules.breakHours || ""} 
                    onChange={(val) => setEditingRules({ ...editingRules, breakHours: Number(val) })} 
                  />
                  
                  <label className="grid gap-2">
                    <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Break Payment</span>
                    <select
                      className="h-12 rounded-xl border border-white/10 bg-[#0B1424] px-3 text-sm font-semibold text-white outline-none focus:border-cyan-300/50"
                      onChange={(event) => setEditingRules({ ...editingRules, breakIsPaid: event.target.value === "paid" })}
                      value={editingRules.breakIsPaid ? "paid" : "unpaid"}
                    >
                      <option value="unpaid">Unpaid Break</option>
                      <option value="paid">Paid Break (Counted in Hours)</option>
                    </select>
                  </label>

                  <SettingsInput 
                    label="OT Threshold (Mins)" 
                    type="number" 
                    min="0" 
                    value={editingRules.overtimeThresholdMinutes || ""} 
                    onChange={(val) => setEditingRules({ ...editingRules, overtimeThresholdMinutes: Number(val) })} 
                  />
                  <SettingsInput 
                    label="Regular Holiday Rate" 
                    type="number" 
                    min="0" 
                    step="0.05" 
                    placeholder="e.g. 2.0"
                    value={editingRules.holidayRegularRate || ""} 
                    onChange={(val) => setEditingRules({ ...editingRules, holidayRegularRate: val })} 
                  />
                  <SettingsInput 
                    label="Special Holiday Rate" 
                    type="number" 
                    min="0" 
                    step="0.05" 
                    placeholder="e.g. 1.3"
                    value={editingRules.holidaySpecialRate || ""} 
                    onChange={(val) => setEditingRules({ ...editingRules, holidaySpecialRate: val })} 
                  />
                  <SettingsInput 
                    label="Night Diff Rate" 
                    type="number" 
                    min="0" 
                    step="0.01" 
                    placeholder="e.g. 0.10"
                    value={editingRules.nightDiffRate || ""} 
                    onChange={(val) => setEditingRules({ ...editingRules, nightDiffRate: val })} 
                  />
                </div>
              </div>

              {/* Employee Checklist Bar for Global Defaults Custom rate assignment */}
              {selectedPresetId === "global" && employees.length > 0 && (
                <div className="mt-5 border border-white/5 bg-slate-900/10 p-4 rounded-2xl space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-black text-white leading-none">Apply Custom Base Rates to Specific Employees</h3>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Select specific employees to assign the configured base rate directly to their profiles. If none are selected, settings only apply as global workspace defaults.
                      </p>
                    </div>
                    <label className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500 cursor-pointer select-none self-start sm:self-center shrink-0">
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
                        className="h-3.5 w-3.5 rounded border-white/10 bg-slate-950 text-cyan-500 outline-none cursor-pointer"
                      />
                      Select All
                    </label>
                  </div>
                  
                  <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 max-h-32 overflow-y-auto border border-white/5 bg-slate-950/20 p-3 rounded-xl custom-scrollbar">
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
                          <span className="truncate">{emp.fullName || emp.full_name || "Employee"}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <GeofenceSettings
                geofenceEnabled={editingRules.geofenceEnabled}
                geofenceLatitude={editingRules.geofenceLatitude}
                geofenceLongitude={editingRules.geofenceLongitude}
                geofenceRadiusMeters={editingRules.geofenceRadiusMeters}
                onUpdateSetting={(key, val) => setEditingRules({ ...editingRules, [key]: val })}
              />

              <GlobalDeductionsManager
                customDeductions={editingRules.customDeductions}
                newDedName={newDedName}
                setNewDedName={setNewDedName}
                newDedType={newDedType}
                setNewDedType={setNewDedType}
                newDedValue={newDedValue}
                setNewDedValue={setNewDedValue}
                newDedCap={newDedCap}
                setNewDedCap={setNewDedCap}
                onAddDeduction={handleAddDeduction}
                onDeleteDeduction={handleDeleteDeduction}
                employees={employees}
              />
            </form>

            <div className="grid gap-4 lg:grid-cols-2">
              {groups.map((group) => (
                <section key={group.title} className="glass-panel rounded-2xl p-4 sm:p-5 border border-white/10">
                  <h2 className="text-lg font-black text-white">{group.title}</h2>
                  <div className="mt-5 grid gap-3">
                    {group.items.map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggle(key)}
                        className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.035] p-3 text-left transition hover:border-cyan-300/35 hover:bg-cyan-300/10 sm:gap-4 sm:p-4 cursor-pointer"
                      >
                        <span className="min-w-0 text-sm font-semibold leading-5 text-slate-200">{label}</span>
                        <span className="flex shrink-0 items-center gap-2 sm:gap-3">
                          {savedKey === key && <span className="text-xs font-black text-emerald-300">Saved</span>}
                          <span className={`relative h-7 w-12 rounded-full transition ${permissions[key] ? "bg-cyan-400" : "bg-slate-700"}`}>
                            <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${permissions[key] ? "left-6" : "left-1"}`} />
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>

            <AnnouncementsManager
              announcements={announcements}
              loadingAnnouncements={loadingAnnouncements}
              announcementForm={announcementForm}
              setAnnouncementForm={setAnnouncementForm}
              onPost={handlePostAnnouncement}
              onDelete={handleDeleteAnnouncement}
              posting={posting}
            />

            <HolidaysManager
              holidays={holidays}
              loadingHolidays={loadingHolidays}
              newHolidayName={newHolidayName}
              setNewHolidayName={setNewHolidayName}
              newHolidayDate={newHolidayDate}
              setNewHolidayDate={setNewHolidayDate}
              newHolidayType={newHolidayType}
              setNewHolidayType={setNewHolidayType}
              onAddHoliday={handleAddHoliday}
              onDeleteHoliday={handleDeleteHoliday}
            />
          </div>
        </motion.main>
      </DashboardShell>

      {/* Add Preset Title Dialog Modal */}
      {showAddPresetModal && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/75 p-4 backdrop-blur-md">
          <form
            onSubmit={handleAddPreset}
            className="glass-panel w-full max-w-md rounded-2xl border border-white/15 bg-slate-950 p-6 shadow-2xl space-y-4 text-slate-200"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                <Sparkles size={16} className="text-cyan-300" /> Create Custom Preset
              </h3>
              <button
                type="button"
                onClick={() => setShowAddPresetModal(false)}
                className="text-slate-400 hover:text-white transition"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Preset Name</label>
              <input
                type="text"
                placeholder="e.g. Night Shift Support, Part-time"
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 text-xs text-white outline-none focus:border-cyan-300"
                required
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddPresetModal(false)}
                className="h-10 rounded-lg px-4 bg-white/5 border border-white/5 hover:bg-white/10 text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="h-10 rounded-lg px-4 bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-xs font-black uppercase text-white shadow-lg shadow-cyan-500/10 transition"
              >
                Create Preset
              </button>
            </div>
          </form>
        </div>
      )}
    </PageTransition>
  );
}

export default AdminSettingsPage;
