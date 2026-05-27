import { motion } from "framer-motion";
import { Check, Clipboard, Link as LinkIcon, Settings } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import DashboardShell from "../components/dashboard/DashboardShell";
import PageTransition from "../components/PageTransition";
import { useAuth } from "../contexts/AuthContext";
import { workspaceToView } from "../utils/supabaseMappers";

function AdminWorkspacePage() {
  const { profile, workspace: authWorkspace } = useAuth();
  const workspace = workspaceToView(authWorkspace, profile);
  const inviteLink = `https://trackly.app/join/${workspace.code}`;
  const [copied, setCopied] = useState("");

  const copy = async (value, type) => {
    if (navigator.clipboard) await navigator.clipboard.writeText(value);
    setCopied(type);
    window.setTimeout(() => setCopied(""), 1400);
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
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.22em] text-cyan-300">Workspace</p>
                <h1 className="mt-3 text-[clamp(1.85rem,9vw,3.2rem)] font-black tracking-tight text-white">
                  Workspace <span className="gradient-text">Details</span>
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base sm:leading-7">
                  View workspace identity, code, invite link, and company setup details.
                </p>
              </div>
              <Link
                to="/admin-dashboard/settings"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-cyan-300/25 bg-cyan-300/10 px-5 text-sm font-black text-cyan-100 transition hover:bg-cyan-300/15"
              >
                <Settings size={17} />
                Workspace Settings
              </Link>
            </div>

            <div className="mt-6 grid gap-4 sm:mt-8 sm:gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <section className="glass-panel rounded-2xl border-cyan-300/30 p-4 sm:p-6">
                <p className="text-sm font-bold text-slate-400">Workspace Code</p>
                <h2 className="mt-3 break-all text-[clamp(2.1rem,15vw,5rem)] font-black tracking-[0.08em] text-cyan-300 sm:tracking-[0.12em]">
                  {workspace.code}
                </h2>
                <p className="mt-4 max-w-xl text-sm leading-6 text-slate-300">
                  Share this code or invite link with team members when employee joining is ready.
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <button className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-cyan-300/30 bg-cyan-300/10 text-sm font-black text-white transition hover:bg-cyan-300/15" type="button" onClick={() => copy(workspace.code, "code")}>
                    {copied === "code" ? <Check size={17} /> : <Clipboard size={17} />}
                    {copied === "code" ? "Copied" : "Copy Code"}
                  </button>
                  <button className="glow-button inline-flex h-12 items-center justify-center gap-2 rounded-xl text-sm font-black text-white" type="button" onClick={() => copy(inviteLink, "link")}>
                    {copied === "link" ? <Check size={17} /> : <LinkIcon size={17} />}
                    {copied === "link" ? "Copied" : "Copy Invite Link"}
                  </button>
                </div>
              </section>

              <section className="glass-panel rounded-2xl p-4 sm:p-6">
                <h2 className="text-lg font-black text-white">{workspace.name}</h2>
                <div className="mt-5 grid gap-3 text-sm">
                  <Info label="Invite Link" value={inviteLink} />
                  <Info label="Industry" value={workspace.industry} />
                  <Info label="Team Size" value={workspace.teamSize} />
                  <Info label="Created Date" value={workspace.createdDate} />
                  <Info label="Company Address" value={workspace.companyAddress || "Not set"} />
                  <Info label="Contact Number" value={workspace.contactNumber || "Not set"} />
                  <Info label="Shift Start" value={workspace.shiftStartTime} />
                  <Info label="Expected Hours" value={`${workspace.expectedWorkHours}h/day`} />
                  <Info label="Late Grace" value={`${workspace.lateGraceMinutes} min`} />
                  <Info label="Payroll Period" value={workspace.payrollPeriod} />
                </div>
              </section>
            </div>
          </div>
        </motion.main>
      </DashboardShell>
    </PageTransition>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.035] p-4">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 break-words font-bold text-white">{value}</p>
    </div>
  );
}

export default AdminWorkspacePage;
