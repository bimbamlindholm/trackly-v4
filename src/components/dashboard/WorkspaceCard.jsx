import { useState } from "react";
import { BriefcaseBusiness, Settings, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "../../contexts/ToastContext";

function WorkspaceCard({ workspace }) {
  const { addToast } = useToast();
  
  // Interactive mock subscription state for Organization Workspace
  const [subTier, setSubTier] = useState(() => {
    return localStorage.getItem("trackly_mock_workspace_subscription_tier") || workspace.subscriptionTier || "free";
  });

  // Synchronously update mock subscription state when the prop updates to prevent cascading renders
  const [prevSubTier, setPrevSubTier] = useState(workspace.subscriptionTier);
  if (workspace.subscriptionTier !== prevSubTier) {
    setPrevSubTier(workspace.subscriptionTier);
    const savedMock = localStorage.getItem("trackly_mock_workspace_subscription_tier");
    if (!savedMock) {
      setSubTier(workspace.subscriptionTier);
    }
  }

  const handleUpgradeWorkspace = () => {
    localStorage.setItem("trackly_mock_workspace_subscription_tier", "premium");
    setSubTier("premium");
    addToast("Workspace upgraded successfully to Workspace Premium (Demo Mode)! All connected employees now inherit Premium Pay access.", "success");
    // Dispatch event to notify other sections
    window.dispatchEvent(new Event("trackly_workspace_subscription_changed"));
  };

  const handleRevertWorkspace = () => {
    localStorage.setItem("trackly_mock_workspace_subscription_tier", "free");
    setSubTier("free");
    addToast("Workspace downgraded back to Standard Free Tier.", "info");
    window.dispatchEvent(new Event("trackly_workspace_subscription_changed"));
  };

  return (
    <section className="glass-panel rounded-2xl p-4 sm:p-6 flex flex-col justify-between h-full relative overflow-hidden">
      <div className="absolute -top-10 -right-10 w-28 h-28 bg-violet-500/5 rounded-full blur-[40px] pointer-events-none" />
      
      <div>
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg font-black text-white">Workspace</h2>
          <Link
            to="/admin-dashboard/workspace"
            className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-300 transition hover:border-cyan-300/35 hover:bg-cyan-300/10 hover:text-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-300/40"
            aria-label="Open workspace details"
          >
            <Settings size={18} />
          </Link>
        </div>
        <div className="mx-auto mt-4 grid h-20 w-20 place-items-center rounded-full border border-violet-300/30 bg-violet-400/10 text-violet-300">
          <BriefcaseBusiness size={36} />
        </div>
        <h3 className="mt-5 break-words text-center text-lg font-black text-white sm:text-xl">{workspace.name}</h3>
        <p className="mt-1 text-center text-xs text-slate-400">Code: <strong className="text-white tracking-widest">{workspace.code}</strong></p>
        <p className="mt-1 text-center text-[11px] text-slate-500">Created on {workspace.createdDate}</p>
        
        <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
          <div className="rounded-xl bg-violet-400/10 px-3 py-1.5 text-xs font-bold text-violet-200 border border-violet-500/10">
            {workspace.role || "Workspace Owner"}
          </div>
          
          {subTier === "premium" ? (
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-cyan-400/35 bg-cyan-400/15 text-[10px] font-black text-cyan-300 uppercase tracking-widest animate-pulse shadow-[0_0_15px_rgba(34,211,238,0.15)]">
              <Sparkles size={10} /> Premium Active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-600/35 bg-slate-800/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Standard Free
            </span>
          )}
        </div>
      </div>

      <div className="mt-6 border-t border-white/5 pt-4">
        {subTier === "premium" ? (
          <div className="space-y-2">
            <p className="text-[10px] text-center text-slate-400 italic">
              Organization Premium billing is active (₱999/mo).
            </p>
            <button
              type="button"
              onClick={handleRevertWorkspace}
              className="w-full py-2.5 rounded-xl border border-white/5 bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-black transition cursor-pointer"
            >
              Downgrade to Standard Free
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-[10px] text-center text-slate-400 leading-relaxed">
              Upgrade to invite more than 5 members, enable automated PhilHealth/SSS deductions, & geofenced biometrics!
            </p>
            <button
              type="button"
              onClick={handleUpgradeWorkspace}
              className="glow-button w-full py-3 rounded-xl text-center text-xs font-black text-white active:scale-95 transition cursor-pointer"
            >
              Upgrade Workspace (₱999/mo)
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

export default WorkspaceCard;
