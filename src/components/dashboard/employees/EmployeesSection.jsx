/* eslint-disable react-hooks/set-state-in-effect */
import { Clipboard, Shield, Users, X, Save, Edit2 } from "lucide-react";
import { useState, useEffect } from "react";
import { fetchWorkspaceEmployees, updateMemberRoleAndSupervisor } from "../../../utils/supabaseAttendance";

export default function EmployeesSection({ employees: initialEmployees, workspace }) {
  const [employees, setEmployees] = useState(initialEmployees || []);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [selectedRole, setSelectedRole] = useState("Employee");
  const [selectedSupervisorId, setSelectedSupervisorId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const inviteLink = `${window.location.origin}/join-workspace?code=${workspace.code}`;

  // Sync state with props
  useEffect(() => {
    if (initialEmployees) {
      setEmployees(initialEmployees);
    }
  }, [initialEmployees]);

  const reloadEmployees = async () => {
    try {
      const data = await fetchWorkspaceEmployees(workspace.id);
      setEmployees(data);
    } catch (err) {
      console.error("Failed to reload employees:", err);
    }
  };

  const handleEditClick = (employee) => {
    setEditingEmployee(employee);
    setSelectedRole(employee.role || "Employee");
    setSelectedSupervisorId(employee.supervisorId || "");
    setError("");
    setSuccess("");
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!editingEmployee) return;

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await updateMemberRoleAndSupervisor(
        workspace.id,
        editingEmployee.id,
        selectedRole,
        selectedSupervisorId || null
      );
      setSuccess("Employee workspace settings updated successfully!");
      await reloadEmployees();
      setTimeout(() => {
        setEditingEmployee(null);
      }, 1200);
    } catch (err) {
      setError(err.message || "Failed to update employee workspace settings.");
    } finally {
      setLoading(false);
    }
  };

  // Candidates for supervisor role (excluding self)
  const supervisorCandidates = employees.filter(
    (emp) =>
      emp.id !== editingEmployee?.id &&
      (emp.role === "Supervisor" || emp.role === "Manager" || emp.role === "Admin")
  );

  return (
    <div className="mt-8 grid gap-6">
      {/* Invite Code Panel */}
      <section className="glass-panel relative overflow-hidden rounded-2xl p-4 sm:p-6">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <Users className="text-cyan-300" size={22} />
              Invite Employees
            </h2>
            <p className="mt-2 text-sm text-slate-400">Share this code with your team to let them self-register into this workspace.</p>
          </div>
          <button
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-5 text-sm font-black text-cyan-100 transition hover:bg-cyan-300/20 active:scale-98 sm:w-auto"
            onClick={() => {
              navigator.clipboard?.writeText(workspace.code);
            }}
            type="button"
          >
            <Clipboard size={17} /> Copy Code
          </button>
        </div>
        <p className="mt-5 break-all text-2xl font-black tracking-[0.12em] text-cyan-300 sm:text-3xl sm:tracking-[0.16em]">{workspace.code}</p>
        <p className="mt-3 break-words rounded-xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300 select-all font-mono">
          {inviteLink}
        </p>
      </section>

      {/* Employees Grid */}
      <section className="glass-panel relative rounded-2xl p-4 sm:p-6">
        <h2 className="text-xl font-black text-white flex items-center gap-2 mb-6">
          <Shield className="text-violet-300" size={22} />
          Workspace Employees
        </h2>
        
        <div className="grid gap-4">
          {employees.length === 0 && (
            <p className="text-sm text-slate-400 py-4 text-center">No employees have joined this workspace yet.</p>
          )}
          {employees.map((employee) => {
            const role = employee.role || "Employee";
            let badgeClass = "bg-slate-400/10 text-slate-300 border-white/10";
            if (role === "Admin") badgeClass = "bg-rose-400/15 text-rose-300 border-rose-500/30";
            if (role === "Manager") badgeClass = "bg-violet-400/15 text-violet-300 border-violet-500/30";
            if (role === "Supervisor") badgeClass = "bg-cyan-400/15 text-cyan-300 border-cyan-500/30";

            return (
              <div 
                key={employee.id} 
                className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-4 transition hover:border-cyan-300/20"
              >
                <div className="min-w-0 w-full sm:w-auto">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-black text-white truncate">{employee.fullName}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-bold ${badgeClass}`}>
                      {role}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-sm text-slate-400">{employee.email}</p>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-slate-500">
                    <span>{employee.department || "No Department"}</span>
                    <span>•</span>
                    <span>{employee.position || "No Position"}</span>
                    {employee.supervisorName && (
                      <>
                        <span>•</span>
                        <span className="text-cyan-300">Supervisor: {employee.supervisorName}</span>
                      </>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleEditClick(employee)}
                  className="flex h-10 w-full shrink-0 items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.05] px-4 text-xs font-bold text-slate-200 transition hover:bg-white/[0.1] sm:w-auto"
                  type="button"
                >
                  <Edit2 size={13} /> Manage Settings
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Edit Modal (Glassmorphic Backdrop & Panel) */}
      {editingEmployee && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/70 p-4 backdrop-blur-md">
          <div className="glass-panel relative max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/15 bg-slate-900/90 p-4 shadow-2xl sm:p-6">
            <div className="flex items-center justify-between mb-5 border-b border-white/10 pb-4">
              <div>
                <h3 className="text-lg font-black text-white">Employee Settings</h3>
                <p className="text-xs text-slate-400 mt-1">Configure role and hierarchy details for {editingEmployee.fullName}</p>
              </div>
              <button 
                onClick={() => setEditingEmployee(null)}
                className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/[0.03] text-slate-400 hover:text-white transition"
                type="button"
              >
                <X size={16} />
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-xl border border-rose-300/30 bg-rose-400/10 p-3 text-xs font-semibold text-rose-100">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 rounded-xl border border-emerald-300/30 bg-emerald-400/10 p-3 text-xs font-semibold text-emerald-100">
                {success}
              </div>
            )}

            <form onSubmit={handleSave} className="grid gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-[0.14em] text-slate-400 mb-2">
                  Workspace Role
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 text-sm text-white outline-none focus:border-cyan-300/40 transition cursor-pointer"
                >
                  <option value="Employee">Employee</option>
                  <option value="Supervisor">Supervisor</option>
                  <option value="Manager">Manager</option>
                </select>
                <p className="mt-1.5 text-[10px] text-slate-500 font-semibold leading-relaxed">
                  Supervisors & Managers can access the "My Team" portal to review subordinate attendance and pre-approve leave / DTR corrections.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-[0.14em] text-slate-400 mb-2">
                  Assign Supervisor
                </label>
                <select
                  value={selectedSupervisorId}
                  onChange={(e) => setSelectedSupervisorId(e.target.value)}
                  className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 text-sm text-white outline-none focus:border-cyan-300/40 transition cursor-pointer"
                >
                  <option value="">No Supervisor (Directly escalated to Admin)</option>
                  {supervisorCandidates.map((cand) => (
                    <option key={cand.id} value={cand.id}>
                      {cand.fullName} ({cand.role})
                    </option>
                  ))}
                </select>
                <p className="mt-1.5 text-[10px] text-slate-500 font-semibold leading-relaxed">
                  Subordinate correction and leave requests will route to this supervisor first for Level 1 pre-approval.
                </p>
              </div>

              <div className="mt-4 grid gap-3 border-t border-white/10 pt-4 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setEditingEmployee(null)}
                  className="h-12 rounded-xl border border-white/10 bg-white/[0.03] text-sm font-bold text-slate-300 transition hover:bg-white/[0.08]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="glow-button h-12 rounded-xl text-sm font-black text-white transition flex items-center justify-center gap-1.5"
                >
                  <Save size={16} />
                  {loading ? "Saving..." : "Save Settings"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
