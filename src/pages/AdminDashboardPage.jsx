/* eslint-disable react-hooks/set-state-in-effect, react-hooks/preserve-manual-memoization */
import { motion } from "framer-motion";
import { BarChart3, CheckCircle2, Clock3, Coffee, FileText, UserPlus, UsersRound, UserX } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ActivityFeed from "../components/dashboard/ActivityFeed";
import AttendanceChart from "../components/dashboard/AttendanceChart";
import DashboardShell from "../components/dashboard/DashboardShell";
import EmployeeTable from "../components/dashboard/EmployeeTable";
import NotificationsPanel from "../components/dashboard/NotificationsPanel";
import OverviewCards from "../components/dashboard/OverviewCards";
import QuickActions from "../components/dashboard/QuickActions";
import WorkspaceCard from "../components/dashboard/WorkspaceCard";
import WorkspaceCodeCard from "../components/dashboard/WorkspaceCodeCard";
import PageTransition from "../components/PageTransition";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabaseClient";

// Modular Extracted Admin Modals
import InviteModal from "../components/dashboard/modals/InviteModal";
import ProfileModal from "../components/dashboard/modals/ProfileModal";
import AttendanceModal from "../components/dashboard/modals/AttendanceModal";
import {
  buildActivityFeedFromAttendance,
  buildAttendanceRowsForRange,
  buildAttendanceCsvRows,
  buildDailyAttendanceRows,
  buildOverviewFromAttendance,
  buildWeeklyChartFromAttendance,
  fetchWorkspaceAttendance,
  fetchWorkspaceEmployees,
  todayKey,
  calculateWorkedMinutesFromEvents,
  minutesToHours,
  updateOvertimeApproval,
} from "../utils/supabaseAttendance";
import { workspaceToView } from "../utils/supabaseMappers";
import { exportCsv } from "../utils/tracklyStorage";

function AdminDashboardPage() {
  const navigate = useNavigate();
  const { profile, workspace: authWorkspace } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [records, setRecords] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const today = todayKey();
  const workspace = workspaceToView(authWorkspace, profile);



  const loadDashboardData = useCallback(async () => {
    if (!authWorkspace?.id) {
      setEmployees([]);
      setRecords([]);
      setLoadingData(false);
      return;
    }

    setLoadingData(true);
    setError("");
    try {
      const [workspaceEmployees, workspaceRecords] = await Promise.all([
        fetchWorkspaceEmployees(authWorkspace.id),
        fetchWorkspaceAttendance(authWorkspace.id),
      ]);
      setEmployees(workspaceEmployees);
      setRecords(workspaceRecords);
    } catch (loadError) {
      setError(loadError.message || "Unable to load workspace dashboard data.");
      setEmployees([]);
      setRecords([]);
    } finally {
      setLoadingData(false);
    }
  }, [authWorkspace?.id]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  useEffect(() => {
    if (!supabase || !authWorkspace?.id) return undefined;

    const channel = supabase
      .channel(`trackly-admin-attendance-${authWorkspace.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "attendance_records",
          filter: `workspace_id=eq.${authWorkspace.id}`,
        },
        () => loadDashboardData(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authWorkspace?.id, loadDashboardData]);

  const attendanceRules = useMemo(() => workspaceToView(authWorkspace, profile), [authWorkspace, profile]);
  const todayRows = useMemo(() => buildDailyAttendanceRows(records, employees, today, attendanceRules), [attendanceRules, employees, records, today]);
  const overview = useMemo(() => buildOverviewFromAttendance(employees, todayRows), [employees, todayRows]);
  const overviewCards = useMemo(() => buildOverviewCards(overview, employees.length), [employees.length, overview]);
  const activityFeed = useMemo(() => buildActivityFeedFromAttendance(records), [records]);
  const notifications = useMemo(() => buildNotifications(overview), [overview]);
  const chartData = useMemo(() => buildWeeklyChartFromAttendance(records, attendanceRules), [records, attendanceRules]);
  const chartSummary = {
    avgAttendance: employees.length > 0
      ? `${Math.round((overview.present / employees.length) * 100)}%`
      : "0%",
    absent: String(overview.absent),
    totalHours: overview.totalHours,
  };

  const pendingOvertimeRequests = useMemo(() => {
    // Find all unique events with overtime_reason and overtime_approved === null
    const otRecords = records.filter((r) => r.overtime_reason && r.overtime_approved === null);
    
    return otRecords.map((r) => {
      const emp = employees.find((e) => e.id === r.userId);
      
      // Calculate daily worked time for this employee on this date to derive exact OT hours
      const dayEvents = records.filter((rec) => rec.userId === r.userId && rec.date === r.date);
      const workedMins = calculateWorkedMinutesFromEvents(dayEvents, attendanceRules);
      const expectedMins = attendanceRules.expectedWorkHours * 60;
      const otMins = Math.max(0, workedMins - expectedMins);
      const otHours = (otMins / 60).toFixed(2);

      return {
        id: r.id,
        employeeId: r.userId,
        employeeName: emp?.fullName || r.employeeName || "Employee",
        date: r.date,
        reason: r.overtime_reason,
        workedHours: minutesToHours(workedMins),
        otHours,
        rawRecord: r
      };
    });
  }, [records, employees, attendanceRules]);

  const handleOvertimeAction = async (request, approved) => {
    if (!authWorkspace?.id) return;
    try {
      await updateOvertimeApproval({
        workspaceId: authWorkspace.id,
        employeeId: request.employeeId,
        date: request.date,
        approved,
        approvedHours: approved ? Number(request.otHours) : null
      });
      refresh();
    } catch (err) {
      alert("Failed to update overtime approval: " + err.message);
    }
  };

  const refresh = () => {
    loadDashboardData();
  };

  const handleQuickAction = (label) => {
    if (label === "Add Employee") setModal("invite");
    if (label === "Invite Member") setModal("invite");
    if (label === "View Attendance") navigate("/admin-dashboard/attendance");
    if (label === "Generate Report") {
      exportCsv(`trackly-admin-report-${today}.csv`, buildAttendanceCsvRows(buildAttendanceRowsForRange(records, employees, today, today, attendanceRules)));
      navigate("/admin-dashboard/reports");
    }
  };

  const handleRemoveEmployee = async (id) => {
    const employee = employees.find((emp) => emp.id === id);
    const name = employee?.fullName || "this employee";
    const confirmed = window.confirm(`Are you sure you want to remove ${name} from the workspace? This action cannot be undone.`);
    if (!confirmed) return;
    if (!supabase || !authWorkspace?.id) return;
    await supabase.from("workspace_members").delete().eq("workspace_id", authWorkspace.id).eq("user_id", id);
    refresh();
  };

  const handleViewProfile = (employee) => {
    setSelectedEmployee(employee);
    setModal("profile");
  };

  const handleViewAttendance = (employee) => {
    setSelectedEmployee(employee);
    setModal("attendance");
  };




  return (
    <PageTransition>
      <DashboardShell workspace={workspace}>
        <motion.main
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="px-3 py-4 sm:px-6 sm:py-6 lg:px-8"
        >
          <div className="mx-auto max-w-[1500px]">
            <div className="mb-6 flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
              <div>
                <h1 className="text-[clamp(1.65rem,8vw,3rem)] font-black tracking-tight text-white">
                  Welcome back, {profile?.full_name?.split(" ")[0] || "Admin"}!
                </h1>
                <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">Here's what's happening in your workspace today.</p>
              </div>
            </div>

            <OverviewCards cards={overviewCards} />

            <div className="mt-5 grid gap-4 sm:mt-6 sm:gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(340px,0.95fr)]">
              <div className="grid min-w-0 gap-4 sm:gap-6">
                <div className="grid gap-4 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.95fr)]">
                  <QuickActions onAction={handleQuickAction} />
                  <ActivityFeed activities={activityFeed} />
                </div>
                <WorkspaceCodeCard code={workspace.code} />
                {error && (
                  <div className="rounded-2xl border border-rose-300/30 bg-rose-400/10 p-4 text-sm font-semibold text-rose-100">
                    {error}
                  </div>
                )}
                {loadingData && (
                  <div className="glass-panel rounded-2xl p-5 text-sm text-slate-300">
                    Loading real workspace data from Supabase...
                  </div>
                )}
                {pendingOvertimeRequests.length > 0 && (
                  <div className="glass-panel rounded-2xl p-5 border border-white/10 bg-slate-950/10">
                    <div className="flex items-center gap-2 mb-4">
                      <Clock3 className="text-cyan-300 animate-pulse" size={20} />
                      <h2 className="text-lg font-black text-white">Pending Overtime Approvals</h2>
                      <span className="ml-auto rounded-full bg-cyan-400/20 px-2.5 py-0.5 text-xs font-black text-cyan-300">
                        {pendingOvertimeRequests.length} pending
                      </span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {pendingOvertimeRequests.map((req) => (
                        <div
                          key={req.id}
                          className="rounded-xl border border-white/10 bg-white/[0.02] p-4 flex flex-col justify-between transition hover:border-cyan-300/35"
                        >
                          <div>
                            <div className="flex justify-between items-start gap-2">
                              <p className="text-sm font-black text-white truncate">{req.employeeName}</p>
                              <span className="text-[10px] font-bold text-slate-400 bg-white/5 rounded px-1.5 py-0.5 shrink-0">
                                {req.date}
                              </span>
                            </div>
                            <p className="mt-1.5 text-xs text-cyan-200 font-semibold">
                              Worked: {req.workedHours} ({req.otHours}h eligible OT)
                            </p>
                            <div className="mt-2 rounded bg-white/[0.03] p-2 border border-white/5">
                              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Reason:</p>
                              <p className="text-xs text-slate-300 italic mt-0.5 line-clamp-2">"{req.reason}"</p>
                            </div>
                          </div>
                          <div className="mt-4 grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => handleOvertimeAction(req, false)}
                              className="h-9 rounded-lg border border-rose-500/30 hover:border-rose-500 bg-rose-500/5 hover:bg-rose-500/10 text-xs font-bold text-rose-300 transition"
                            >
                              Deny
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOvertimeAction(req, true)}
                              className="h-9 rounded-lg bg-cyan-400 hover:bg-cyan-500 text-xs font-black text-slate-950 transition flex items-center justify-center gap-1"
                            >
                              Approve
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <EmployeeTable
                  employees={employees}
                  onRemove={handleRemoveEmployee}
                  onViewAttendance={handleViewAttendance}
                  onViewProfile={handleViewProfile}
                  records={todayRows}
                />
              </div>

              <aside className="grid min-w-0 gap-4 content-start sm:gap-6">
                <WorkspaceCard workspace={workspace} />
                <AttendanceChart data={chartData} summary={chartSummary} />
                <NotificationsPanel notifications={notifications} onCreateAnnouncement={() => setModal("invite")} />
              </aside>
            </div>
          </div>
        </motion.main>

        {modal === "invite" && <InviteModal code={workspace.code} onClose={() => setModal(null)} />}
        {modal === "profile" && selectedEmployee && (
          <ProfileModal employee={selectedEmployee} records={records} rules={attendanceRules} onClose={() => setModal(null)} />
        )}
        {modal === "attendance" && selectedEmployee && (
          <AttendanceModal employee={selectedEmployee} records={records} rules={attendanceRules} onClose={() => setModal(null)} />
        )}
      </DashboardShell>
    </PageTransition>
  );
}

function buildOverviewCards(overview, employeeCount) {
  return [
    { icon: UsersRound, label: "Total Employees", value: String(overview.activeEmployeeCount), status: "Active workspace members", tone: "cyan", to: "/admin-dashboard/employees" },
    { icon: UserPlus, label: "Present Today", value: String(overview.present), status: employeeCount > 0 ? `${Math.round((overview.present / employeeCount) * 100)}% of employees` : "No employees yet", tone: "green", to: "/admin-dashboard/attendance?filter=present" },
    { icon: Clock3, label: "Late Today", value: String(overview.late), status: employeeCount > 0 ? "Based on first time in" : "No employees yet", tone: "orange", to: "/admin-dashboard/attendance?filter=late" },
    { icon: Coffee, label: "On Break", value: String(overview.onBreak), status: employeeCount > 0 ? "Current state is on break" : "No employees yet", tone: "purple", to: "/admin-dashboard/attendance?filter=break" },
    { icon: CheckCircle2, label: "Completed", value: String(overview.completed), status: employeeCount > 0 ? "Finished shifts today" : "No employees yet", tone: "green", to: "/admin-dashboard/attendance?filter=completed" },
    { icon: UserX, label: "Absent Today", value: String(overview.absent), status: employeeCount > 0 ? "No time in recorded" : "No employees yet", tone: "orange", to: "/admin-dashboard/attendance?filter=offline" },
    { icon: BarChart3, label: "Total Work Hours", value: overview.totalHours, status: `${overview.absent} absent today`, tone: "blue", to: "/admin-dashboard/reports" },
  ];
}

function buildNotifications(overview) {
  return [
    overview.late > 0 && { icon: Clock3, text: `${overview.late} employees are late today.`, time: "Today", tone: "orange" },
    overview.activeEmployeeCount > 0 && { icon: UserPlus, text: `${overview.activeEmployeeCount} active employees in workspace.`, time: "Now", tone: "green" },
    overview.present > 0 && { icon: FileText, text: `${overview.present} real attendance records today.`, time: "Today", tone: "blue" },
  ].filter(Boolean);
}



export default AdminDashboardPage;
