/* eslint-disable react-hooks/set-state-in-effect, react-hooks/preserve-manual-memoization */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageTransition from "../components/PageTransition";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";

// Import core Supabase attendance and storage helpers
import {
  buildAttendanceCsvRows,
  buildDailyAttendanceRows,
  calculateWorkedMinutesFromEvents,
  createAttendanceAction,
  fetchMyAttendance,
  todayKey,
  getHaversineDistance,
} from "../utils/supabaseAttendance";
import { exportCsv } from "../utils/tracklyStorage";
import { profileToEmployee, workspaceToView } from "../utils/supabaseMappers";
import { fetchCorrectionRequests, checkIsDateLocked } from "../utils/supabaseCorrections";
import { fetchMyLeaves } from "../utils/supabaseLeaves";
import {
  getOfflineQueue,
  enqueueOfflineAction,
  removeOfflineAction,
  mergeRecordsWithOffline,
} from "../utils/offlineQueue";

// Import modular extracted subcomponents
import EmployeeHeader from "../components/employee/EmployeeHeader";
import WelcomeCard from "../components/employee/WelcomeCard";
import AttendanceActions from "../components/employee/AttendanceActions";
import RecordsSection, { DtrDetailDrawer } from "../components/employee/RecordsSection";
import ProfileCard from "../components/employee/ProfileCard";
import RequestsCard from "../components/employee/RequestsCard";
import PayslipsCard from "../components/employee/PayslipsCard";
import AnnouncementsCard from "../components/employee/AnnouncementsCard";
import ThirteenthMonthCard from "../components/employee/ThirteenthMonthCard";
import { EmployeeAnalyticsSection } from "../components/employee/EmployeeAnalyticsSection";
import EmployeeMobileNav from "../components/employee/EmployeeMobileNav";
import EmployeeScheduleSection from "../components/employee/EmployeeScheduleSection";
import TeamApprovalsSection from "../components/employee/TeamApprovalsSection";
import WorkspaceConnectSection from "../components/employee/WorkspaceConnectSection";
import FieldErrandTracker from "../components/employee/FieldErrandTracker";
import {
  fetchEmployeeErrands,
  startErrand,
  arriveAtErrand,
  completeErrand,
} from "../utils/supabaseErrands";
import CorrectionModal from "../components/employee/modals/CorrectionModal";
import ProfileModal from "../components/employee/modals/ProfileModal";
import EmployeePayslipModal from "../components/employee/modals/EmployeePayslipModal";
import CameraBiometricModal from "../components/employee/modals/CameraBiometricModal";
import HelpSystem from "../components/HelpSystem";
import BreakChoiceModal from "../components/employee/modals/BreakChoiceModal";
import LeaveRequestModal from "../components/employee/modals/LeaveRequestModal";
import OvertimeReasonModal from "../components/employee/modals/OvertimeReasonModal";
import FaceRegistrationModal from "../components/employee/modals/FaceRegistrationModal";
import EmployeeCheckoutModal from "../components/employee/modals/EmployeeCheckoutModal";
import { getCurrentLocation } from "../utils/geolocation";
import { Sparkles } from "lucide-react";

export default function EmployeeDashboardPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const {
    logout,
    permissions,
    profile,
    refreshSessionData,
    updateProfile,
    workspace,
    validateWorkspaceCode,
    membership,
  } = useAuth();

  const [connectCode, setConnectCode] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState("");

  const handleConnectWorkspace = async (e) => {
    e.preventDefault();
    setConnecting(true);
    setConnectError("");

    try {
      if (!connectCode.trim()) throw new Error("Please enter a workspace code.");
      const ws = await validateWorkspaceCode(connectCode);
      
      const { supabase: supabaseClient } = await import("../lib/supabaseClient");
      const { error: memberError } = await supabaseClient
        .from("workspace_members")
        .upsert({
          workspace_id: ws.id,
          user_id: profile.id,
          role: "employee",
          status: "active",
        }, { onConflict: "workspace_id,user_id" });

      if (memberError) throw memberError;

      addToast(`Successfully connected to ${ws.workspace_name}!`, "success");
      await refreshSessionData();
    } catch (err) {
      setConnectError(err.message || "Failed to connect to workspace.");
      addToast(err.message || "Failed to connect to workspace.", "error");
    } finally {
      setConnecting(false);
    }
  };

  const [employee, setEmployee] = useState(profileToEmployee(profile));
  const [attendanceEvents, setAttendanceEvents] = useState([]);
  const [requests, setRequests] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [isTodayLocked, setIsTodayLocked] = useState(false);
  const [modal, setModal] = useState(null);
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [comment, setComment] = useState("");
  const [actionError, setActionError] = useState("");
  const [submittingAction, setSubmittingAction] = useState("");
  const [selectedDetailRecord, setSelectedDetailRecord] = useState(null);
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [tempSelfie, setTempSelfie] = useState(null);

  // Interactive mock workspace subscription state
  const [subTier, setSubTier] = useState(() => {
    return localStorage.getItem("trackly_mock_workspace_subscription_tier") || workspace?.subscriptionTier || "free";
  });

  useEffect(() => {
    const handleSubChange = () => {
      setSubTier(localStorage.getItem("trackly_mock_workspace_subscription_tier") || "free");
    };
    window.addEventListener("trackly_workspace_subscription_changed", handleSubChange);
    return () => {
      window.removeEventListener("trackly_workspace_subscription_changed", handleSubChange);
    };
  }, [workspace]);

  // Field Errands States
  const [activeErrand, setActiveErrand] = useState(null);
  const [errandType, setErrandType] = useState("Bank Deposit");
  const [errandPurpose, setErrandPurpose] = useState("");
  const [errandNotes, setErrandNotes] = useState("");
  const [errandPhoto, setErrandPhoto] = useState(null);
  const [submittingErrand, setSubmittingErrand] = useState(false);

  const isManagerOrSupervisor = useMemo(() => {
    return ["manager", "supervisor"].includes(String(membership?.role || "").toLowerCase());
  }, [membership]);

  const myEvents = useMemo(
    () => attendanceEvents.filter((record) => record.userId === profile?.id),
    [attendanceEvents, profile?.id],
  );

  const myRecords = useMemo(() => {
    const dates = [...new Set(myEvents.map((record) => record.date))];
    const rules = workspaceToView(workspace, profile);

    return dates
      .sort((first, second) => new Date(second) - new Date(first))
      .map((date) => buildDailyAttendanceRows(myEvents, [employee], date, rules)[0])
      .filter(Boolean);
  }, [employee, myEvents, workspace, profile]);

  const todayRecord = useMemo(
    () => myRecords.find((record) => record.date === todayKey()),
    [myRecords],
  );

  const myRequests = useMemo(
    () => requests.filter((request) => request.employeeId === employee.id),
    [requests, employee.id]
  );

  const loadAttendance = useCallback(async () => {
    if (!workspace?.id || !profile?.id) {
      setAttendanceEvents([]);
      return;
    }

    try {
      // Fetch only this employee's own records (privacy-safe, server-side filtered)
      const myRecordsData = await fetchMyAttendance(workspace.id, profile.id);
      
      // Cache records locally for offline use
      try {
        localStorage.setItem(`trackly_cached_attendance_${profile.id}`, JSON.stringify(myRecordsData));
      } catch (cacheErr) {
        console.error("Failed to write to local storage cache:", cacheErr);
      }

      const queue = getOfflineQueue(profile.id);
      const merged = mergeRecordsWithOffline(myRecordsData, queue, profile);
      setAttendanceEvents(merged);
      setActionError("");
    } catch (error) {
      // Fallback: Load from local storage cache when offline or fetch fails
      let cachedData = [];
      try {
        const rawCache = localStorage.getItem(`trackly_cached_attendance_${profile.id}`);
        if (rawCache) cachedData = JSON.parse(rawCache);
      } catch (cacheErr) {
        console.error("Failed to read local storage cache:", cacheErr);
      }

      const queue = getOfflineQueue(profile.id);
      const merged = mergeRecordsWithOffline(cachedData, queue, profile);
      setAttendanceEvents(merged);

      // Clean up UI error indicator if it is just a routine offline network failure
      if (!navigator.onLine) {
        setActionError("");
      } else {
        setActionError(error.message || "Unable to load attendance records.");
      }
    }
  }, [workspace?.id, profile]);

  useEffect(() => {
    setEmployee(profileToEmployee(profile));
  }, [profile]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  const loadErrands = useCallback(async () => {
    if (!workspace?.id || !profile?.id) {
      setActiveErrand(null);
      return;
    }
    try {
      const data = await fetchEmployeeErrands(workspace.id, profile.id);
      const active = data.find((e) => e.status === "started" || e.status === "arrived");
      setActiveErrand(active || null);
    } catch (err) {
      console.error("Error loading employee errands:", err);
    }
  }, [workspace?.id, profile?.id]);

  useEffect(() => {
    loadErrands();
  }, [loadErrands]);

  const loadRequests = useCallback(async () => {
    if (!workspace?.id || !profile?.id) {
      setRequests([]);
      setLeaveRequests([]);
      return;
    }
    try {
      const [correctionsData, leavesData] = await Promise.all([
        fetchCorrectionRequests(workspace.id),
        fetchMyLeaves(profile.id),
      ]);
      setRequests(correctionsData);
      setLeaveRequests(leavesData);
    } catch (err) {
      console.error("Error loading requests:", err);
    }
  }, [workspace?.id, profile?.id]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    const handleOpenCheckout = () => {
      setModal("employee-checkout");
    };

    window.addEventListener("trackly_open_employee_checkout", handleOpenCheckout);
    return () => {
      window.removeEventListener("trackly_open_employee_checkout", handleOpenCheckout);
    };
  }, []);
  useEffect(() => {
    async function checkTodayLock() {
      if (!workspace?.id) return;
      try {
        const locked = await checkIsDateLocked(todayKey(), workspace.id);
        setIsTodayLocked(locked);
      } catch (err) {
        console.error("Failed to check if today is locked:", err);
      }
    }
    checkTodayLock();
  }, [workspace?.id]);

  // Auto-reset active tab to Dashboard if the current tab gets disabled by the admin
  useEffect(() => {
    if (activeTab === "Announcements" && !permissions.announcements) {
      setActiveTab("Dashboard");
    } else if (activeTab === "Correction Requests" && !permissions.correctionRequests && !permissions.leaveRequests) {
      setActiveTab("Dashboard");
    }
  }, [permissions, activeTab]);
  const enabledTimeButtons = useMemo(() => {
    const buttons = [];

    if (isTodayLocked) return buttons;
    if (!permissions.manualTimeTracking) return buttons;

    const hasTimeIn = Boolean(todayRecord?.timeIn);
    const hasTimeOut = Boolean(todayRecord?.timeOut);
    const isOnBreak = Boolean(todayRecord?.isOnBreak);

    if (!hasTimeIn && permissions.timeIn) {
      return [{ label: "Time In", field: "timeIn" }];
    }

    if (hasTimeIn && !hasTimeOut) {
      if (isOnBreak) {
        if (permissions.breakOut) {
          buttons.push({ label: "Break Out", field: "breakOut" });
        }
      } else {
        if (permissions.breakIn) {
          buttons.push({ label: "Break In", field: "breakIn" });
        }
        if (permissions.timeOut) {
          buttons.push({ label: "Time Out", field: "timeOut" });
        }
      }
    }

    return buttons;
  }, [permissions, todayRecord, isTodayLocked]);

  const visibleFeatureCount = useMemo(() => {
    const featureKeys = [
      "cameraAttendance",
      "locationRequired",
      "employeeComments",
      "correctionRequests",
      "employeePdfExport",
      "salaryEstimate",
      "leaveRequests",
      "restDayStatus",
      "announcements",
    ];

    const breakFeature =
      permissions.breakIn &&
      (permissions.paidBreakOption || permissions.unpaidBreakOption || permissions.requireBreakReason);

    return (
      (permissions.manualTimeTracking && enabledTimeButtons.length > 0 ? 1 : 0) +
      (breakFeature ? 1 : 0) +
      featureKeys.filter((key) => permissions[key]).length
    );
  }, [enabledTimeButtons.length, permissions]);

  const refresh = () => {
    setEmployee(profileToEmployee(profile));
    loadRequests();
    loadAttendance();
    loadErrands();
  };

  const handleRegisterFace = async (base64Photo) => {
    try {
      localStorage.setItem(`trackly_local_face_photo_${profile.id}`, base64Photo);
      const updatedProfile = await updateProfile({ ...profile, face_photo: base64Photo });
      await refreshSessionData();
      setEmployee(profileToEmployee(updatedProfile));
      addToast("AI Face Profile registered successfully!", "success");
      setModal(null);
    } catch (err) {
      console.warn("Failed to sync face profile, local storage fallback:", err);
      setEmployee(curr => ({ ...curr, facePhoto: base64Photo }));
      addToast("Face registered locally (Offline fallback)!", "success");
      setModal(null);
    }
  };

  const updateStatus = (status) => {
    setEmployee((current) => ({ ...current, status }));
  };

  const [syncingOffline, setSyncingOffline] = useState(false);
  const [isOfflineState, setIsOfflineState] = useState(!navigator.onLine);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [lastSyncedTime, setLastSyncedTime] = useState(() => {
    return localStorage.getItem(`trackly_last_synced_${profile?.id}`) || "";
  });
  const [syncError, setSyncError] = useState("");

  // Synchronize dynamic online/offline browser state
  useEffect(() => {
    const updateOnlineStatus = () => {
      setIsOfflineState(!navigator.onLine);
    };

    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);

    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
  }, []);

  // Update dynamic count of unsynchronized DTR items in the queue
  const updatePendingCount = useCallback(() => {
    if (profile?.id) {
      const queue = getOfflineQueue(profile.id);
      setPendingSyncCount(queue.length);
    }
  }, [profile?.id]);

  useEffect(() => {
    updatePendingCount();
  }, [attendanceEvents, updatePendingCount]);

  // Sync engine to push offline events back to Supabase in chronological order
  const handleSyncOfflineEvents = useCallback(async () => {
    if (!profile?.id || !workspace?.id) return;
    if (!navigator.onLine) {
      addToast("Cannot sync offline events: you are still offline.", "warning");
      return;
    }

    const queue = getOfflineQueue(profile.id);
    if (queue.length === 0) return;

    setSyncingOffline(true);
    setSyncError("");
    addToast(`Syncing ${queue.length} pending offline actions...`, "info");

    let successCount = 0;
    let failCount = 0;

    for (const item of queue) {
      try {
        await createAttendanceAction({
          action: item.action,
          profile,
          workspaceId: workspace.id,
          comment: item.comment || undefined,
          overtimeReason: item.overtimeReason || undefined,
          latitude: item.latitude,
          longitude: item.longitude,
          timestamp: item.timestamp, // Original clock-in/out timestamp
          verificationPhoto: item.verificationPhoto || undefined,
        });

        removeOfflineAction(profile.id, item.id);
        successCount++;
      } catch (err) {
        console.error("Failed to sync offline item:", item, err);
        failCount++;
        // Prevent further pushes if we lost connection mid-sync
        if (!navigator.onLine || err.message?.toLowerCase().includes("fetch")) {
          setSyncError("Network lost mid-sync. Will auto-retry once stable.");
          break;
        } else {
          setSyncError(err.message || "Failed to sync some actions.");
        }
      }
    }

    setSyncingOffline(false);
    updatePendingCount();
    await loadAttendance();

    if (successCount > 0) {
      const timeStr = new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" });
      localStorage.setItem(`trackly_last_synced_${profile.id}`, timeStr);
      setLastSyncedTime(timeStr);
      addToast(`Successfully synced ${successCount} offline action(s)!`, "success");
    }
    if (failCount > 0) {
      addToast(`Failed to sync ${failCount} actions. They remain in the queue.`, "error");
    }
  }, [profile, workspace?.id, addToast, updatePendingCount, loadAttendance]);

  // Automatically trigger sync once connection is restored
  useEffect(() => {
    if (!isOfflineState && profile?.id && workspace?.id) {
      const queue = getOfflineQueue(profile.id);
      if (queue.length > 0 && !syncingOffline) {
        handleSyncOfflineEvents();
      }
    }
  }, [isOfflineState, profile?.id, workspace?.id, syncingOffline, handleSyncOfflineEvents]);

  const executeRecordAction = async (field, overtimeReason, verificationPhoto) => {
    const actionMap = {
      timeIn: "time_in",
      breakIn: "break_in",
      breakOut: "break_out",
      timeOut: "time_out",
    };

    setSubmittingAction(field);
    setActionError("");

    try {
      const rules = workspaceToView(workspace, profile);
      let lat = null;
      let lon = null;

      if (rules.geofenceEnabled) {
        addToast("Verifying geofence coordinates...", "info");
        try {
          const coords = await getCurrentLocation();
          lat = coords.latitude;
          lon = coords.longitude;

          if (rules.geofenceLatitude == null || rules.geofenceLongitude == null) {
            throw new Error("Geofencing is active but office location is not set by admin.");
          }

          const distance = getHaversineDistance(
            lat,
            lon,
            rules.geofenceLatitude,
            rules.geofenceLongitude
          );

          if (distance > rules.geofenceRadiusMeters) {
            const roundedDist = Math.round(distance);
            const roundedLimit = rules.geofenceRadiusMeters;
            throw new Error(`Outside Allowed Range: You are ${roundedDist}m away. Office radius limit is ${roundedLimit}m.`);
          }
          addToast("Geofence checked! You are within range.", "success");
        } catch (locErr) {
          throw new Error(locErr.message || "Failed to verify geofence location.", { cause: locErr });
        }
      }

      // 1. Direct offline mode handling
      if (!navigator.onLine) {
        enqueueOfflineAction(profile.id, {
          action: actionMap[field],
          comment: comment.trim() || undefined,
          overtimeReason: overtimeReason || undefined,
          latitude: lat,
          longitude: lon,
          verificationPhoto: verificationPhoto || undefined,
        });

        setComment("");

        if (field === "timeIn") updateStatus("Working");
        if (field === "breakIn") updateStatus("On Break");
        if (field === "breakOut") updateStatus("Working");
        if (field === "timeOut") updateStatus("Completed");

        addToast("Offline Mode Active! Event saved locally and will auto-sync once connected.", "warning");
        await loadAttendance();
        return;
      }

      try {
        await createAttendanceAction({
          action: actionMap[field],
          profile,
          workspaceId: workspace?.id,
          comment: comment.trim() || undefined,
          overtimeReason: overtimeReason || undefined,
          latitude: lat,
          longitude: lon,
          verificationPhoto: verificationPhoto || undefined,
        });

        // Clear comment after successful action
        setComment("");

        if (field === "timeIn") {
          updateStatus("Working");
          addToast("Successfully timed in! Have a great shift.", "success");
        }
        if (field === "breakIn") {
          updateStatus("On Break");
          addToast("Break started. Enjoy your break!", "success");
        }
        if (field === "breakOut") {
          updateStatus("Working");
          addToast("Break ended. Welcome back to work!", "success");
        }
        if (field === "timeOut") {
          updateStatus("Completed");
          addToast("Successfully timed out! Shift completed.", "success");
        }

        await loadAttendance();
      } catch (error) {
        // 2. Transmit-time network loss handling
        const isNetworkError =
          error.message?.toLowerCase().includes("fetch") ||
          error.message?.toLowerCase().includes("network") ||
          error.message?.toLowerCase().includes("failed to fetch") ||
          error.message?.toLowerCase().includes("load");

        if (isNetworkError) {
          enqueueOfflineAction(profile.id, {
            action: actionMap[field],
            comment: comment.trim() || undefined,
            overtimeReason: overtimeReason || undefined,
            latitude: lat,
            longitude: lon,
            verificationPhoto: verificationPhoto || undefined,
          });

          setComment("");

          if (field === "timeIn") updateStatus("Working");
          if (field === "breakIn") updateStatus("On Break");
          if (field === "breakOut") updateStatus("Working");
          if (field === "timeOut") updateStatus("Completed");

          addToast("Network disrupted! Event saved in offline queue and will sync shortly.", "warning");
          await loadAttendance();
        } else {
          throw error;
        }
      }
    } catch (error) {
      setActionError(error.message || "Unable to save attendance action.");
      addToast(error.message || "Unable to save attendance action.", "error");
    } finally {
      setSubmittingAction("");
    }
  };

  const recordAction = async (field, verificationPhoto) => {
    if (isTodayLocked) {
      setActionError("Cannot record attendance: today falls in a locked/released payroll period.");
      addToast("Cannot record attendance: today falls in a locked/released payroll period.", "error");
      return;
    }

    // Intercept with Face Verification if active
    if (permissions.faceVerification && (field === "timeIn" || field === "timeOut")) {
      if (!employee.facePhoto) {
        setActionError("Kailangang mag-enroll ng Face Profile bago makapag-Time In/Out.");
        addToast("Kailangang mag-enroll ng Face Profile bago makapag-Time In/Out.", "error");
        setModal("face-registration");
        return;
      }
      if (!verificationPhoto) {
        setModal("camera-biometric");
        return;
      }
    }

    const hasTimeIn = Boolean(todayRecord?.timeIn);
    const hasTimeOut = Boolean(todayRecord?.timeOut);
    const isOnBreak = Boolean(todayRecord?.isOnBreak);

    if (field === "timeIn" && hasTimeIn) {
      setActionError("You already timed in today.");
      addToast("You already timed in today.", "warning");
      return;
    }

    if (field === "breakIn") {
      if (!hasTimeIn) {
        setActionError("You must Time In before starting a break.");
        addToast("You must Time In before starting a break.", "warning");
        return;
      }
      if (hasTimeOut) {
        setActionError("Cannot start a break after Time Out.");
        addToast("Cannot start a break after Time Out.", "warning");
        return;
      }
      if (isOnBreak) {
        setActionError("You are already on a break.");
        addToast("You are already on a break.", "warning");
        return;
      }
    }

    if (field === "breakOut") {
      if (!isOnBreak) {
        setActionError("You need to start a break before ending it.");
        addToast("You need to start a break before ending it.", "warning");
        return;
      }
    }

    if (field === "timeOut") {
      if (!hasTimeIn) {
        setActionError("You must Time In before Timing Out.");
        addToast("You must Time In before Timing Out.", "warning");
        return;
      }
      if (hasTimeOut) {
        setActionError("You have already timed out today.");
        addToast("You have already timed out today.", "warning");
        return;
      }
      if (isOnBreak) {
        setActionError("You must end your break before Timing Out.");
        addToast("You must end your break before Timing Out.", "warning");
        return;
      }

      // Check if current shift exceeded standard work hours + overtime threshold
      const rules = workspaceToView(workspace, profile);
      const todayEvents = myEvents.filter((event) => event.date === todayKey());
      
      // Simulate timeout event at current time
      const simTimeoutEvent = {
        action: "time_out",
        timestamp: new Date().toISOString(),
      };
      
      const simulatedWorkedMinutes = calculateWorkedMinutesFromEvents(
        [...todayEvents, simTimeoutEvent],
        rules
      );

      const standardMinutes = rules.expectedWorkHours * 60;
      const thresholdMinutes = rules.overtimeThresholdMinutes ?? 30;

      if (simulatedWorkedMinutes > (standardMinutes + thresholdMinutes)) {
        setTempSelfie(verificationPhoto);
        setModal("overtime-reason");
        return;
      }
    }

    if (field === "breakIn") {
      const choices = [
        permissions.paidBreakOption && "Paid Break",
        permissions.unpaidBreakOption && "Unpaid Break",
      ].filter(Boolean);

      if (choices.length > 1) {
        setModal("break-choice");
        return;
      }
    }

    await executeRecordAction(field, undefined, verificationPhoto);
  };

  const saveComment = async () => {
    if (!comment.trim()) return;
    if (!workspace?.id || !profile?.id) {
      addToast("Cannot save comment: no workspace or profile loaded.", "warning");
      return;
    }
    if (!todayRecord?.latestTimestamp) {
      addToast("Please record an attendance action before adding a comment.", "warning");
      return;
    }

    setSubmittingAction("comment");
    try {
      // Find the most recent attendance record for today and update its comment field directly
      const { supabase: supabaseClient } = await import("../lib/supabaseClient");
      const { error } = await supabaseClient
        .from("attendance_records")
        .update({ comment: comment.trim() })
        .eq("workspace_id", workspace.id)
        .eq("user_id", profile.id)
        .eq("date", todayKey())
        .eq("timestamp", todayRecord.latestTimestamp);

      if (error) throw error;
      setComment("");
      addToast("Comment saved successfully!", "success");
      await loadAttendance();
    } catch (err) {
      addToast(err.message || "Failed to save comment.", "error");
    } finally {
      setSubmittingAction("");
    }
  };

  const handleStartErrand = async () => {
    if (!workspace?.id || !profile?.id) return;
    setSubmittingErrand(true);
    try {
      addToast("Getting GPS coordinates...", "info");
      let lat = null;
      let lng = null;
      try {
        const coords = await getCurrentLocation();
        lat = coords.latitude;
        lng = coords.longitude;
      } catch (locErr) {
        console.warn("Could not get GPS for errand start:", locErr);
        addToast("GPS warning: Errand starting without verified location.", "warning");
      }

      await startErrand({
        workspaceId: workspace.id,
        userId: profile.id,
        errandType,
        purpose: errandPurpose,
        startLat: lat,
        startLng: lng,
      });

      addToast("Errand logged! Keep safe en route.", "success");
      await loadErrands();
    } catch (err) {
      addToast(err.message || "Failed to start errand.", "error");
    } finally {
      setSubmittingErrand(false);
    }
  };

  const handleArriveErrand = async () => {
    if (!activeErrand) return;
    setSubmittingErrand(true);
    try {
      addToast("Verifying coordinates and logging arrival...", "info");
      let lat = null;
      let lng = null;
      try {
        const coords = await getCurrentLocation();
        lat = coords.latitude;
        lng = coords.longitude;
      } catch (locErr) {
        console.warn("Could not get GPS for errand arrival:", locErr);
      }

      await arriveAtErrand({
        errandId: activeErrand.id,
        arrivalLat: lat,
        arrivalLng: lng,
        photoUrlOrBase64: errandPhoto,
      });

      addToast("Arrival registered and slip verified!", "success");
      await loadErrands();
    } catch (err) {
      addToast(err.message || "Failed to log arrival.", "error");
    } finally {
      setSubmittingErrand(false);
    }
  };

  const handleCompleteErrand = async () => {
    if (!activeErrand) return;
    setSubmittingErrand(true);
    try {
      addToast("Finishing errand and recording GPS...", "info");
      let lat = null;
      let lng = null;
      try {
        const coords = await getCurrentLocation();
        lat = coords.latitude;
        lng = coords.longitude;
      } catch (locErr) {
        console.warn("Could not get GPS for errand completion:", locErr);
      }

      await completeErrand({
        errandId: activeErrand.id,
        endLat: lat,
        endLng: lng,
        notes: errandNotes,
      });

      addToast("Errand completed! Returned to standard duty.", "success");
      
      // Reset inputs
      setErrandPurpose("");
      setErrandNotes("");
      setErrandPhoto(null);
      
      await loadErrands();
    } catch (err) {
      addToast(err.message || "Failed to complete errand.", "error");
    } finally {
      setSubmittingErrand(false);
    }
  };

  return (
    <PageTransition>
      <main className="relative min-h-screen overflow-x-hidden bg-[#07111F] text-slate-50">
        <div className="galaxy-bg" />
        <div className="noise-overlay" />

        <div className="relative z-10">
          <EmployeeHeader
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            isManagerOrSupervisor={isManagerOrSupervisor}
            permissions={permissions}
            onLogout={async () => {
              await logout();
              navigate("/");
            }}
          />

          {(isOfflineState || pendingSyncCount > 0) && (
            <div className={`relative z-[99] border-y py-2.5 text-xs font-semibold flex flex-col sm:flex-row items-center justify-center gap-3 px-4 ${
              isOfflineState 
                ? "bg-gradient-to-r from-amber-500/20 via-orange-500/10 to-amber-500/20 border-amber-500/30 text-amber-200"
                : "bg-gradient-to-r from-emerald-500/20 via-teal-500/10 to-emerald-500/20 border-emerald-500/30 text-emerald-200"
            }`}>
              <div className="flex items-center gap-2 flex-wrap justify-center">
                <span className={`inline-block h-2.5 w-2.5 rounded-full ${
                  isOfflineState 
                    ? "bg-amber-400 shadow-[0_0_10px_#f59e0b] animate-pulse" 
                    : "bg-emerald-400 shadow-[0_0_10px_#10b981]"
                }`}></span>
                <span className="tracking-wide">
                  {isOfflineState ? (
                    <span><strong>Offline Mode Active</strong> &bull; Clock actions will auto-sync once connected.</span>
                  ) : (
                    <span><strong>Online Connected</strong> &bull; Network connection restored.</span>
                  )}
                  {pendingSyncCount > 0 && (
                    <span className="ml-1.5 px-2 py-0.5 rounded bg-white/10 text-white font-bold">
                      {pendingSyncCount} pending action(s)
                    </span>
                  )}
                  {lastSyncedTime && (
                    <span className="ml-1.5 text-slate-300">
                      • Last synced: {lastSyncedTime}
                    </span>
                  )}
                </span>
                {syncError && (
                  <span className="text-rose-300 font-bold bg-rose-500/20 border border-rose-500/30 rounded px-2.5 py-0.5 ml-2 animate-bounce">
                    ⚠️ {syncError}
                  </span>
                )}
              </div>
              
              {pendingSyncCount > 0 && (
                <button 
                  onClick={handleSyncOfflineEvents}
                  disabled={syncingOffline || isOfflineState}
                  className={`rounded-full border px-4 py-1 text-[10px] uppercase font-black tracking-wider transition active:scale-95 disabled:opacity-50 ${
                    isOfflineState
                      ? "bg-amber-500/10 border-amber-400/30 text-amber-200 cursor-not-allowed"
                      : "bg-emerald-500/30 border-emerald-400/50 text-emerald-100 hover:bg-emerald-500/50"
                  }`}
                >
                  {syncingOffline ? "Syncing..." : isOfflineState ? "Waiting for network..." : "Sync / Retry Now"}
                </button>
              )}
            </div>
          )}
          {!workspace ? (
            <WorkspaceConnectSection
              profile={profile}
              connectCode={connectCode}
              setConnectCode={setConnectCode}
              connectError={connectError}
              connecting={connecting}
              onSubmit={handleConnectWorkspace}
            />
          ) : (
            <>
              {permissions.faceVerification && !employee.facePhoto && (
                <div className="mx-auto max-w-7xl px-3 pt-4 sm:px-6 sm:pt-5 lg:px-8">
                  <div className="glass-panel border-rose-500/30 bg-rose-500/5 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-[0_0_30px_rgba(239,68,68,0.05)] animate-pulse">
                    <div className="flex items-center gap-3 text-center sm:text-left">
                      <span className="text-2xl">👤</span>
                      <div>
                        <h4 className="text-sm font-black text-white">AI Face Verification Profile Required</h4>
                        <p className="text-xs text-rose-300 font-semibold mt-0.5">Your company requires face matching. Please register your face profile before checking in.</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setModal("face-registration")}
                      className="px-5 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-xs font-black text-white shadow-lg shadow-rose-500/20 active:scale-95 transition-all"
                    >
                      Enroll Face Profile
                    </button>
                  </div>
                </div>
              )}

              <section className="mx-auto max-w-7xl px-3 pb-28 pt-4 sm:px-6 sm:pt-5 lg:px-8 lg:pb-10 lg:pt-7">
                {activeTab === "My Schedule" ? (
                  <EmployeeScheduleSection profile={profile} workspace={workspace} />
                ) : activeTab === "My Team" ? (
                  <TeamApprovalsSection />
                ) : (
                  <div className="grid min-w-0 gap-4 sm:gap-5 lg:gap-6">
                    <div className={activeTab === "Dashboard" ? "block" : "hidden lg:block"}>
                      <WelcomeCard employee={employee} permissions={permissions} workspace={workspace} />
                    </div>

                    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.85fr)] xl:gap-6">
                      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5 lg:gap-6">
                        <div className={activeTab === "Dashboard" ? "block" : "hidden lg:block"}>
                          {!permissions.salaryEstimate ? (
                            <div className="relative overflow-hidden glass-panel border-rose-500/10 bg-slate-950/40 p-6 sm:p-8 rounded-2xl text-center shadow-lg min-h-[220px] flex items-center justify-center">
                              <div className="flex flex-col items-center justify-center p-4">
                                <div className="h-10 w-10 rounded-xl bg-rose-500/15 border border-rose-400/20 flex items-center justify-center text-rose-400 mb-3 shadow-[0_0_15px_rgba(239,68,68,0.15)]">
                                  🔒
                                </div>
                                <h4 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider">Salary Analytics Disabled</h4>
                                <p className="text-[10px] sm:text-xs text-slate-400 max-w-sm mt-2 leading-relaxed font-semibold">
                                  Salary estimates and earnings analytics are currently disabled for this workspace by your administrator.
                                </p>
                              </div>
                            </div>
                          ) : subTier === "free" ? (
                            <div className="relative overflow-hidden glass-panel border-cyan-500/10 bg-slate-950/40 p-6 sm:p-8 rounded-2xl text-center shadow-lg min-h-[300px] flex items-center justify-center">
                              <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center p-6">
                                <div className="h-12 w-12 rounded-xl bg-cyan-500/15 border border-cyan-400/20 flex items-center justify-center text-cyan-400 mb-3 shadow-[0_0_15px_rgba(6,182,212,0.15)] animate-pulse">
                                  <Sparkles size={20} />
                                </div>
                                <h4 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider">Salary Analytics Locked</h4>
                                <p className="text-[10px] sm:text-xs text-slate-400 max-w-sm mt-2 leading-relaxed">
                                  Your organization is currently on the <strong className="text-slate-200">Standard Free Tier</strong>. Ask your Workspace Admin to upgrade to <strong className="text-cyan-300">Workspace Premium</strong> to unlock automated team salary, SSS/PhilHealth/Pag-IBIG calculations, and visual analytics!
                                </p>
                                <button
                                  type="button"
                                  onClick={() => {
                                    localStorage.setItem("trackly_mock_workspace_subscription_tier", "premium");
                                    setSubTier("premium");
                                    addToast("Workspace upgraded (Demo Mode)! Team salary analytics unlocked.", "success");
                                    window.dispatchEvent(new Event("trackly_workspace_subscription_changed"));
                                  }}
                                  className="mt-5 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-400 hover:to-violet-400 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition active:scale-95 shadow-md hover:shadow-lg cursor-pointer"
                                >
                                  Demo Upgrade Workspace
                                </button>
                              </div>
                              <div className="opacity-10 blur-md pointer-events-none w-full">
                                <EmployeeAnalyticsSection myRecords={myRecords} />
                              </div>
                            </div>
                          ) : (
                            <EmployeeAnalyticsSection myRecords={myRecords} />
                          )}
                        </div>

                        <div className={activeTab === "My Attendance" ? "block" : "hidden lg:block"}>
                          <AttendanceActions
                            actionError={actionError}
                            comment={comment}
                            enabledTimeButtons={enabledTimeButtons}
                            featureCount={visibleFeatureCount}
                            onCommentChange={setComment}
                            onCorrection={() => setModal("correction")}
                            onRecordAction={recordAction}
                            onSaveComment={saveComment}
                            onDownload={() => exportCsv("my-trackly-attendance.csv", buildAttendanceCsvRows(myRecords))}
                            permissions={permissions}
                            submittingAction={submittingAction}
                            onBiometricClick={(type) => setModal(type)}
                            isTodayLocked={isTodayLocked}
                            onLeave={() => setModal("leave")}
                            isOffline={isOfflineState}
                            pendingOfflineCount={pendingSyncCount}
                            onSyncNow={handleSyncOfflineEvents}
                          />
                        </div>

                        {todayRecord?.timeIn && !todayRecord?.timeOut && (
                          <div className={activeTab === "My Attendance" ? "block" : "hidden lg:block"}>
                            <FieldErrandTracker
                              activeErrand={activeErrand}
                              errandType={errandType}
                              setErrandType={setErrandType}
                              errandPurpose={errandPurpose}
                              setErrandPurpose={setErrandPurpose}
                              errandNotes={errandNotes}
                              setErrandNotes={setErrandNotes}
                              errandPhoto={errandPhoto}
                              setErrandPhoto={setErrandPhoto}
                              onStart={handleStartErrand}
                              onArrive={handleArriveErrand}
                              onComplete={handleCompleteErrand}
                              submitting={submittingErrand}
                            />
                          </div>
                        )}

                        <div className={activeTab === "My Attendance" ? "block" : "hidden lg:block"}>
                          <RecordsSection
                            records={myRecords}
                            permissions={permissions}
                            onCorrection={() => setModal("correction")}
                            onSelectDetail={setSelectedDetailRecord}
                          />
                        </div>
                      </div>

                      <aside className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-5 lg:grid-cols-2 xl:grid-cols-[minmax(0,1fr)]">
                        <div className={activeTab === "My Profile" ? "block" : "hidden lg:block"}>
                          <ProfileCard employee={employee} onEdit={() => setModal("profile")} />
                        </div>
                        {permissions.salaryEstimate && (
                          <div className={activeTab === "My Profile" ? "block" : "hidden lg:block"}>
                            <ThirteenthMonthCard profile={profile} />
                          </div>
                        )}
                        {(permissions.correctionRequests || permissions.leaveRequests) ? (
                          <div className={activeTab === "Correction Requests" ? "block" : "hidden lg:block"}>
                            <RequestsCard
                              requests={permissions.correctionRequests ? myRequests : []}
                              leaveRequests={permissions.leaveRequests ? leaveRequests : []}
                            />
                          </div>
                        ) : activeTab === "Correction Requests" ? (
                          <div className="glass-panel border-rose-500/10 bg-slate-950/40 p-6 rounded-2xl text-center shadow-lg min-h-[160px] flex flex-col items-center justify-center">
                            <h4 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider">Requests Disabled</h4>
                            <p className="text-[10px] sm:text-xs text-slate-400 max-w-sm mt-2 leading-relaxed font-semibold">
                              Both DTR corrections and leave requests are disabled by your workspace administrator.
                            </p>
                          </div>
                        ) : null}
                        <div className={activeTab === "My Profile" ? "block" : "hidden lg:block"}>
                          <PayslipsCard profile={profile} onViewPayslip={setSelectedPayslip} />
                        </div>
                        {permissions.announcements && (
                          <div className={activeTab === "Announcements" ? "block" : "hidden lg:block"}>
                            <AnnouncementsCard workspaceId={workspace?.id} />
                          </div>
                        )}
                      </aside>
                    </div>
                  </div>
                )}
              </section>

              <EmployeeMobileNav activeTab={activeTab} setActiveTab={setActiveTab} isManagerOrSupervisor={isManagerOrSupervisor} permissions={permissions} />
            </>
          )}
        </div>

        {modal === "correction" && (
          <CorrectionModal employee={employee} onClose={() => setModal(null)} onSaved={refresh} />
        )}

        {modal === "leave" && (
          <LeaveRequestModal employee={employee} onClose={() => setModal(null)} onSaved={refresh} />
        )}

        {modal === "profile" && (
          <ProfileModal
            employee={employee}
            onClose={() => setModal(null)}
            onSaved={async (next) => {
              const updatedProfile = await updateProfile(next);
              await refreshSessionData();
              setEmployee(profileToEmployee(updatedProfile));
              setModal(null);
            }}
          />
        )}

        {selectedPayslip && (
          <EmployeePayslipModal
            payslip={selectedPayslip}
            profile={profile}
            onClose={() => setSelectedPayslip(null)}
          />
        )}

        {modal === "camera-biometric" && (
          <CameraBiometricModal
            employee={employee}
            enabledTimeButtons={enabledTimeButtons}
            onRecordAction={recordAction}
            onClose={() => setModal(null)}
          />
        )}



        {modal === "face-registration" && (
          <FaceRegistrationModal
            onRegister={handleRegisterFace}
            onClose={() => setModal(null)}
          />
        )}

        {modal === "break-choice" && (
          <BreakChoiceModal
            onClose={() => setModal(null)}
            onSelect={(breakType) => {
              setModal(null);
              // Store break type as a comment so it's saved with the attendance record
              setComment(breakType === "paid" ? "paid_break" : "unpaid_break");
              executeRecordAction("breakIn");
            }}
          />
        )}

        {modal === "overtime-reason" && (
          <OvertimeReasonModal
            onClose={() => setModal(null)}
            onSubmit={async (reason) => {
              setModal(null);
              await executeRecordAction("timeOut", reason, tempSelfie);
              setTempSelfie(null);
            }}
          />
        )}

        {selectedDetailRecord && (
          <DtrDetailDrawer
            record={selectedDetailRecord}
            employee={employee}
            onClose={() => setSelectedDetailRecord(null)}
          />
        )}

        {modal === "employee-checkout" && (
          <EmployeeCheckoutModal
            profile={profile}
            onClose={() => setModal(null)}
            onSuccess={() => {
              setModal(null);
              addToast("🎉 Premium Access unlocked successfully! Welcome to Trackly Premium.", "success");
              refresh();
            }}
          />
        )}
        <HelpSystem role="employee" />
      </main>
    </PageTransition>
  );
}
