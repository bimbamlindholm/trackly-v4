import { useEffect, useState, useCallback } from "react";
import { CalendarCheck2, Check, X, Clock } from "lucide-react";
import { useAuth } from "../../../contexts/AuthContext";
import { useToast } from "../../../contexts/ToastContext";
import { fetchWorkspaceLeaves, updateLeaveStatus } from "../../../utils/supabaseLeaves";

const STATUS_STYLES = {
  approved: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  rejected: "border-rose-500/30 bg-rose-500/10 text-rose-300",
  pending: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  approved_by_supervisor: "border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
};

const LEAVE_TYPE_LABELS = {
  vacation: "Vacation (VL)",
  sick: "Sick (SL)",
  emergency: "Emergency (EL)",
};

const LEAVE_TYPE_COLORS = {
  vacation: "border-emerald-500/35 bg-emerald-500/10 text-emerald-300",
  sick: "border-amber-500/35 bg-amber-500/10 text-amber-300",
  emergency: "border-rose-500/35 bg-rose-500/10 text-rose-300",
};

export default function LeavesSection({ workspace }) {
  const { profile } = useAuth();
  const { addToast } = useToast();
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState(null);

  const workspaceId = workspace?.id;
  const [prevWorkspaceId, setPrevWorkspaceId] = useState(workspaceId);

  if (workspaceId !== prevWorkspaceId) {
    setPrevWorkspaceId(workspaceId);
    setLoading(true);
  }

  const loadLeaves = useCallback(async () => {
    if (!workspaceId) return;
    try {
      const data = await fetchWorkspaceLeaves(workspaceId);
      setLeaves(data);
    } catch (err) {
      addToast(err.message || "Failed to load leave requests.", "error");
    } finally {
      setLoading(false);
    }
  }, [workspaceId, addToast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadLeaves();
  }, [loadLeaves]);

  const handleAction = async (id, status) => {
    if (!profile?.id) return;
    setActioningId(id);
    setLoading(true);
    try {
      await updateLeaveStatus(id, status, profile.id);
      addToast(`Leave request successfully ${status}!`, "success");
      await loadLeaves();
    } catch (err) {
      addToast(err.message || "Failed to update leave status.", "error");
      setLoading(false);
    } finally {
      setActioningId(null);
    }
  };

  const pendingLeaves = leaves.filter((l) => l.status === "pending" || l.status === "approved_by_supervisor");
  const historyLeaves = leaves.filter((l) => l.status !== "pending" && l.status !== "approved_by_supervisor");

  return (
    <div className="mt-8 space-y-8">
      {/* Overview stats header */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="glass-panel border border-white/5 bg-white/[0.015] p-5 rounded-2xl">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Pending Requests</p>
          <div className="mt-2 flex items-center justify-between">
            <h3 className="text-3xl font-black text-white">{pendingLeaves.length}</h3>
            <span className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-2 py-1 text-xs font-black text-amber-300">
              Needs Review
            </span>
          </div>
        </div>

        <div className="glass-panel border border-white/5 bg-white/[0.015] p-5 rounded-2xl">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Approved Leaves</p>
          <div className="mt-2 flex items-center justify-between">
            <h3 className="text-3xl font-black text-white">
              {leaves.filter((l) => l.status === "approved").length}
            </h3>
            <span className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 text-xs font-black text-emerald-300">
              Paid Active
            </span>
          </div>
        </div>

        <div className="glass-panel border border-white/5 bg-white/[0.015] p-5 rounded-2xl">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Total Filed Requests</p>
          <div className="mt-2 flex items-center justify-between">
            <h3 className="text-3xl font-black text-white">{leaves.length}</h3>
            <span className="rounded-lg bg-cyan-500/10 border border-cyan-500/20 px-2 py-1 text-xs font-black text-cyan-300">
              All Time
            </span>
          </div>
        </div>
      </div>

      {/* Main Section */}
      <div className="grid gap-6 lg:grid-cols-[1.6fr_0.9fr]">
        
        {/* Pending leave requests */}
        <section className="glass-panel min-w-0 rounded-2xl p-5 sm:p-6 border border-white/10 bg-slate-950/20 shadow-xl">
          <div className="flex items-center gap-2 mb-5">
            <CalendarCheck2 className="text-cyan-300" size={20} />
            <h2 className="text-lg font-black text-white">Pending Leave Requests</h2>
          </div>

          {loading ? (
            <p className="text-sm text-slate-400">Loading leave requests from database...</p>
          ) : pendingLeaves.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.01] p-8 text-center text-sm leading-6 text-slate-400">
              No pending leave requests. Excellent!
            </div>
          ) : (
            <div className="space-y-4">
              {pendingLeaves.map((leave) => (
                <div 
                  key={leave.id} 
                  className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition hover:border-cyan-300/20"
                >
                  <div className="space-y-2 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h4 className="font-black text-white leading-none">
                        {leave.profile?.full_name || "Unknown Employee"}
                      </h4>
                      <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${LEAVE_TYPE_COLORS[leave.leave_type] || LEAVE_TYPE_COLORS.vacation}`}>
                        {LEAVE_TYPE_LABELS[leave.leave_type] || leave.leave_type}
                      </span>
                      {leave.status === "approved_by_supervisor" ? (
                        <span className="rounded-full border border-cyan-500/35 bg-cyan-500/10 text-cyan-300 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-[0_0_10px_rgba(6,182,212,0.15)] animate-pulse">
                          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                          Level 2 Ready (Pre-Approved)
                        </span>
                      ) : (
                        <span className="rounded-full border border-amber-500/35 bg-amber-500/10 text-amber-300 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider">
                          Level 1 Pending
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 truncate">
                      {leave.profile?.email}
                    </p>
                    <p className="text-sm font-semibold text-slate-200">
                      Duration: <span className="font-bold text-cyan-300">{leave.start_date}</span> to <span className="font-bold text-cyan-300">{leave.end_date}</span>
                    </p>
                    {leave.reason && (
                      <p className="text-xs leading-5 text-slate-400 bg-black/30 p-2.5 rounded-xl border border-white/5 mt-1 italic">
                        "{leave.reason}"
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0 md:self-center">
                    <button
                      onClick={() => handleAction(leave.id, "approved")}
                      disabled={actioningId !== null}
                      className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 text-xs font-black text-emerald-300 transition hover:bg-emerald-500/20 active:scale-95 disabled:opacity-50"
                      type="button"
                    >
                      <Check size={14} />
                      Approve
                    </button>
                    <button
                      onClick={() => handleAction(leave.id, "rejected")}
                      disabled={actioningId !== null}
                      className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 px-4 text-xs font-black text-rose-300 transition hover:bg-rose-500/20 active:scale-95 disabled:opacity-50"
                      type="button"
                    >
                      <X size={14} />
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Leave history & archive */}
        <section className="glass-panel min-w-0 rounded-2xl p-5 sm:p-6 border border-white/10 bg-slate-950/20 shadow-xl flex flex-col">
          <div className="flex items-center gap-2 mb-5">
            <Clock className="text-slate-400" size={18} />
            <h2 className="text-lg font-black text-white">Leave History</h2>
          </div>

          {loading ? (
            <p className="text-sm text-slate-400">Loading history...</p>
          ) : historyLeaves.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.01] p-6 text-center text-xs leading-5 text-slate-500 flex-1 flex flex-col justify-center">
              No leave request history archived yet.
            </div>
          ) : (
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {historyLeaves.map((leave) => (
                <div key={leave.id} className="rounded-xl border border-white/5 bg-white/[0.01] p-3 text-xs space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-white truncate max-w-[150px]">
                      {leave.profile?.full_name || "Employee"}
                    </p>
                    <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${STATUS_STYLES[leave.status] || STATUS_STYLES.pending}`}>
                      {leave.status}
                    </span>
                  </div>
                  <p className="text-slate-400 leading-normal font-semibold">
                    {LEAVE_TYPE_LABELS[leave.leave_type] || leave.leave_type}: {leave.start_date} to {leave.end_date}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
