import { motion } from "framer-motion";
import { Check, X, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import DashboardShell from "../components/dashboard/DashboardShell";
import PageTransition from "../components/PageTransition";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { workspaceToView } from "../utils/supabaseMappers";
import {
  fetchCorrectionRequests,
  updateCorrectionRequestStatus,
} from "../utils/supabaseCorrections";

function AdminCorrectionsPage() {
  const { profile, workspace: authWorkspace } = useAuth();
  const { addToast } = useToast();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  const workspace = workspaceToView(authWorkspace, profile);

  useEffect(() => {
    let active = true;
    async function loadRequests() {
      if (!workspace.id) return;
      try {
        setLoading(true);
        const data = await fetchCorrectionRequests(workspace.id);
        if (active) {
          setRequests(data);
        }
      } catch (err) {
        console.error(err);
        addToast("Failed to load correction requests.", "error");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    loadRequests();
    return () => {
      active = false;
    };
  }, [workspace.id, addToast]);

  const decide = async (request, decision) => {
    if (!profile?.id) {
      addToast("You must be logged in to perform this action.", "error");
      return;
    }
    try {
      setProcessingId(request.id);
      await updateCorrectionRequestStatus(request.id, decision, profile.id);
      addToast(`Request ${decision.toLowerCase()} successfully!`, "success");
      
      // Reload requests
      const data = await fetchCorrectionRequests(workspace.id);
      setRequests(data);
    } catch (err) {
      console.error(err);
      addToast(err.message || `Failed to ${decision.toLowerCase()} request.`, "error");
    } finally {
      setProcessingId(null);
    }
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
          <div className="mx-auto max-w-6xl min-w-0">
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-cyan-300">Admin Review</p>
            <h1 className="mt-3 text-[clamp(1.85rem,9vw,3.2rem)] font-black tracking-tight text-white">
              Correction <span className="gradient-text">Requests</span>
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base sm:leading-7">
              Employees cannot edit DTR records directly. Approve or reject their submitted correction requests here.
            </p>

            <section className="glass-panel mt-6 overflow-hidden rounded-2xl p-4 sm:mt-8 sm:p-5">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
                  <Loader2 className="animate-spin text-cyan-300" size={32} />
                  <p className="text-sm">Retrieving correction requests...</p>
                </div>
              ) : (
                <>
                  {/* Mobile responsive view */}
                  <div className="grid gap-3 md:hidden">
                    {requests.length === 0 && (
                      <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 text-center text-sm text-slate-400">
                        No correction requests yet.
                      </div>
                    )}
                    {requests.map((request) => (
                      <article key={`${request.id}-card`} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-black text-white">{request.employeeName}</p>
                            <p className="mt-1 text-xs text-slate-500">{request.date} | {request.requestType}</p>
                          </div>
                          <span className={`shrink-0 rounded-lg px-2 py-1 text-[0.68rem] font-black ${
                            request.status === "Pending" ? "bg-amber-400/15 text-amber-200" :
                            request.status === "Approved by Supervisor" ? "bg-cyan-400/15 text-cyan-200 border border-cyan-500/20" :
                            request.status === "Approved" ? "bg-emerald-400/15 text-emerald-200" :
                            "bg-rose-400/15 text-rose-200"
                          }`}>
                            {request.status}
                          </span>
                        </div>
                        <div className="mt-4 grid gap-2 text-xs">
                          <MobileInfo label="Current" value={request.currentValue || "-"} />
                          <MobileInfo label="Requested" value={request.requestedValue || "-"} />
                          <MobileInfo label="Reason" value={request.reason || "-"} />
                        </div>
                        {(request.status === "Pending" || request.status === "Approved by Supervisor") && (
                          <div className="mt-4 grid grid-cols-2 gap-2">
                            <button
                              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-400/15 px-3 py-2 text-xs font-black text-emerald-200 disabled:opacity-50 transition hover:bg-emerald-400/25"
                              type="button"
                              disabled={processingId !== null}
                              onClick={() => decide(request, "Approved")}
                            >
                              {processingId === request.id ? (
                                <Loader2 className="animate-spin" size={14} />
                              ) : (
                                <Check size={14} />
                              )}
                              Approve
                            </button>
                            <button
                              className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-400/15 px-3 py-2 text-xs font-black text-rose-200 disabled:opacity-50 transition hover:bg-rose-400/25"
                              type="button"
                              disabled={processingId !== null}
                              onClick={() => decide(request, "Rejected")}
                            >
                              {processingId === request.id ? (
                                <Loader2 className="animate-spin" size={14} />
                              ) : (
                                <X size={14} />
                              )}
                              Reject
                            </button>
                          </div>
                        )}
                      </article>
                    ))}
                  </div>

                  {/* Desktop view */}
                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full min-w-[900px] text-left text-sm">
                      <thead className="text-xs text-slate-400">
                        <tr>
                          <th className="py-3">Employee Name</th>
                          <th className="py-3">Date</th>
                          <th className="py-3">Request Type</th>
                          <th className="py-3">Current Value</th>
                          <th className="py-3">Requested Value</th>
                          <th className="py-3">Reason</th>
                          <th className="py-3">Status</th>
                          <th className="py-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10">
                        {requests.length === 0 && (
                          <tr>
                            <td colSpan="8" className="py-8 text-center text-slate-400">
                              No correction requests yet.
                            </td>
                          </tr>
                        )}
                        {requests.map((request) => (
                          <tr key={request.id} className="text-slate-300">
                            <td className="py-3 font-bold text-white">{request.employeeName}</td>
                            <td className="py-3">{request.date}</td>
                            <td className="py-3">{request.requestType}</td>
                            <td className="py-3">{request.currentValue || "-"}</td>
                            <td className="py-3">{request.requestedValue || "-"}</td>
                            <td className="max-w-[220px] py-3 break-words">{request.reason || "-"}</td>
                            <td className="py-3">
                              <span className={`rounded-lg px-2 py-1 text-xs font-black ${
                                request.status === "Pending" ? "bg-amber-400/15 text-amber-200" :
                                request.status === "Approved by Supervisor" ? "bg-cyan-400/15 text-cyan-200 border border-cyan-500/20" :
                                request.status === "Approved" ? "bg-emerald-400/15 text-emerald-200" :
                                "bg-rose-400/15 text-rose-200"
                              }`}>
                                {request.status}
                              </span>
                            </td>
                            <td className="py-3">
                              {(request.status === "Pending" || request.status === "Approved by Supervisor") && (
                                <div className="flex gap-2">
                                  <button
                                    className="rounded-lg bg-emerald-400/15 p-2 text-emerald-200 transition hover:bg-emerald-400/25 disabled:opacity-50"
                                    type="button"
                                    disabled={processingId !== null}
                                    onClick={() => decide(request, "Approved")}
                                    aria-label="Approve"
                                  >
                                    {processingId === request.id ? (
                                      <Loader2 className="animate-spin" size={16} />
                                    ) : (
                                      <Check size={16} />
                                    )}
                                  </button>
                                  <button
                                    className="rounded-lg bg-rose-400/15 p-2 text-rose-200 transition hover:bg-rose-400/25 disabled:opacity-50"
                                    type="button"
                                    disabled={processingId !== null}
                                    onClick={() => decide(request, "Rejected")}
                                    aria-label="Reject"
                                  >
                                    {processingId === request.id ? (
                                      <Loader2 className="animate-spin" size={16} />
                                    ) : (
                                      <X size={16} />
                                    )}
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </section>
          </div>
        </motion.main>
      </DashboardShell>
    </PageTransition>
  );
}

function MobileInfo({ label, value }) {
  return (
    <div className="min-w-0 rounded-xl border border-white/10 bg-white/[0.035] p-3">
      <p className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-1 break-words font-bold text-white">{value}</p>
    </div>
  );
}

export default AdminCorrectionsPage;
