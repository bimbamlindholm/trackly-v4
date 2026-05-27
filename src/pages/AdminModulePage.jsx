import { motion } from "framer-motion";
import { UsersRound } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import DashboardShell from "../components/dashboard/DashboardShell";
import PageTransition from "../components/PageTransition";
import { useAuth } from "../contexts/AuthContext";
import {
  fetchWorkspaceAttendance,
  fetchWorkspaceEmployees,
} from "../utils/supabaseAttendance";
import { workspaceToView } from "../utils/supabaseMappers";

// Import extracted subcomponents
import EmployeesSection from "../components/dashboard/employees/EmployeesSection";
import AttendanceSection from "../components/dashboard/attendance/AttendanceSection";
import ReportsSection from "../components/dashboard/reports/ReportsSection";
import PayrollSection from "../components/dashboard/payroll/PayrollSection";
import LeavesSection from "../components/dashboard/leaves/LeavesSection";
import ScheduleSection from "../components/dashboard/schedule/ScheduleSection";

const descriptions = {
  employees: "Manage employee records, roles, departments, and workspace access.",
  attendance: "Review real team attendance records, daily status, late logs, and break activity.",
  reports: "Generate attendance exports, cutoff summaries, and performance reports.",
  payroll: "Review dynamic payroll estimates, approve batches, freeze history and download PDF payslips.",
  schedule: "Visually build, assign, and customize employee shifts with templates, quick presets, and Mon-Fri scheduling generator.",
  leaves: "Review real employee leave requests, approve Vacation (VL), Sick (SL), or Emergency (EL) leaves.",
};

function AdminModulePage({ module }) {
  const { profile, workspace: authWorkspace } = useAuth();
  const [searchParams] = useSearchParams();
  const [employees, setEmployees] = useState([]);
  const [records, setRecords] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const filter = searchParams.get("filter");
  const title = module.replace(/^\w/, (char) => char.toUpperCase());
  const workspace = workspaceToView(authWorkspace, profile);

  const authWorkspaceId = authWorkspace?.id;
  const loadData = useCallback(async () => {
    if (!authWorkspaceId) return;
    setLoading(true);
    setError("");
    try {
      const [workspaceEmployees, workspaceRecords] = await Promise.all([
        fetchWorkspaceEmployees(authWorkspaceId),
        fetchWorkspaceAttendance(authWorkspaceId),
      ]);
      setEmployees(workspaceEmployees);
      setRecords(workspaceRecords);
    } catch (loadError) {
      setError(loadError.message || "Unable to load module data.");
    } finally {
      setLoading(false);
    }
  }, [authWorkspaceId]);

  useEffect(() => {
    let active = true;
    const fetchAsync = async () => {
      await Promise.resolve();
      if (!active) return;
      loadData();
    };
    fetchAsync();
    return () => {
      active = false;
    };
  }, [loadData]);

  return (
    <PageTransition>
      <DashboardShell workspace={workspace}>
        <motion.main
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="px-3 py-4 sm:px-6 sm:py-6 lg:px-8"
        >
          <div className="mx-auto max-w-6xl min-w-0">
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-cyan-300">Admin Module</p>
            <h1 className="mt-3 text-[clamp(1.85rem,9vw,3.2rem)] font-black tracking-tight text-white">
              {title}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base sm:leading-7">
              {descriptions[module] || "This admin workspace section uses your real Supabase workspace data."}
            </p>

            {filter && (
              <div className="mt-5 inline-flex rounded-full border border-cyan-300/25 bg-cyan-300/10 px-4 py-2 text-sm font-black text-cyan-100">
                Active filter: {filter}
              </div>
            )}

            {error && (
              <div className="mt-6 rounded-2xl border border-rose-300/30 bg-rose-400/10 p-4 text-sm font-semibold text-rose-100">
                {error}
              </div>
            )}

            {loading ? (
              <section className="glass-panel mt-8 rounded-2xl p-6 text-sm text-slate-300">
                Loading real workspace data from Supabase...
              </section>
            ) : (
              <ModuleContent
                employees={employees}
                module={module}
                records={records}
                routeFilter={filter}
                workspace={workspace}
              />
            )}
          </div>
        </motion.main>
      </DashboardShell>
    </PageTransition>
  );
}

function ModuleContent({ employees, module, records, routeFilter, workspace }) {
  if (module === "employees") return <EmployeesSection employees={employees} workspace={workspace} />;
  if (module === "attendance") return <AttendanceSection employees={employees} records={records} routeFilter={routeFilter} workspace={workspace} />;
  if (module === "reports") return <ReportsSection employees={employees} records={records} workspace={workspace} />;
  if (module === "payroll") return <PayrollSection employees={employees} records={records} workspace={workspace} />;
  if (module === "leaves") return <LeavesSection workspace={workspace} />;
  if (module === "schedule") return <ScheduleSection employees={employees} workspace={workspace} />;

  return (
    <section className="glass-panel mt-8 rounded-2xl p-6">
      <div className="flex items-start gap-4">
        <div className="grid h-14 w-14 place-items-center rounded-2xl border border-cyan-300/25 bg-cyan-300/10 text-cyan-300">
          <UsersRound size={25} />
        </div>
        <div>
          <h2 className="text-xl font-black text-white">Real data foundation ready</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">
            This section no longer shows fake demo records. It is ready to be expanded using real workspace data.
          </p>
        </div>
      </div>
    </section>
  );
}

export default AdminModulePage;
