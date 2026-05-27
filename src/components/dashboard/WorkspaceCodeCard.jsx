import { Check, Clipboard, Link as LinkIcon, Settings } from "lucide-react";
import { useState } from "react";

function WorkspaceCodeCard({ code }) {
  const [copied, setCopied] = useState("");
  const inviteLink = `https://trackly.app/join/${code}`;

  const copy = async (text, type) => {
    if (navigator.clipboard) await navigator.clipboard.writeText(text);
    setCopied(type);
    window.setTimeout(() => setCopied(""), 1400);
  };

  return (
    <section className="glass-panel rounded-2xl border-cyan-300/35 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-base font-black text-white sm:text-lg">Your Workspace Code</h2>
        <a
          href="/admin-dashboard/settings"
          className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-300 transition hover:border-cyan-300/35 hover:bg-cyan-300/10 hover:text-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-300/40"
          aria-label="Open workspace settings"
        >
          <Settings size={17} />
        </a>
      </div>
      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="break-all text-[clamp(1.75rem,9vw,2.5rem)] font-black tracking-[0.08em] text-cyan-300 sm:tracking-[0.12em]">{code}</p>
          <p className="mt-3 max-w-md text-sm leading-6 text-slate-300">
            Share this code with your team so they can join your workspace.
          </p>
        </div>
        <button
          type="button"
          onClick={() => copy(code, "code")}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-cyan-300/15"
        >
          {copied === "code" ? <Check size={18} /> : <Clipboard size={18} />}
          {copied === "code" ? "Copied" : "Copy Code"}
        </button>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0 break-all rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3 text-xs leading-5 text-slate-200 sm:truncate sm:text-sm">
          {inviteLink}
        </div>
        <button
          type="button"
          onClick={() => copy(inviteLink, "link")}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-300/30 bg-violet-400/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-violet-400/15"
        >
          {copied === "link" ? <Check size={18} /> : <LinkIcon size={18} />}
          {copied === "link" ? "Copied" : "Copy Link"}
        </button>
      </div>
    </section>
  );
}

export default WorkspaceCodeCard;
