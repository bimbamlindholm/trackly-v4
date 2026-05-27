import { useState } from "react";
import AdminBaseModal from "./AdminBaseModal";

/**
 * Invitation modal that displays workspace codes and clickable link-sharing elements for admins.
 */
export default function InviteModal({ code, onClose }) {
  const [copiedType, setCopiedType] = useState(""); // "" | "code" | "link"
  const inviteLink = `${window.location.origin}/join-workspace?code=${code}`;

  const copy = (text, type) => {
    navigator.clipboard?.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(""), 2000);
  };

  return (
    <AdminBaseModal title="Invite Member" onClose={onClose} maxWidth="max-w-md">
      <div className="grid gap-4">
        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-center">
          <p className="text-sm text-slate-400">Workspace Code</p>
          <p className="mt-2 text-3xl font-black tracking-[0.16em] text-cyan-300 uppercase">{code}</p>
        </div>
        <div className="truncate rounded-xl border border-white/10 bg-[#0E1726]/40 p-4 text-xs text-slate-300 select-all font-mono">
          {inviteLink}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <button 
            className="h-12 rounded-xl border border-cyan-300/30 bg-cyan-300/10 text-xs font-black text-white transition hover:bg-cyan-300/15 cursor-pointer flex items-center justify-center gap-1.5" 
            type="button" 
            onClick={() => copy(code, "code")}
          >
            {copiedType === "code" ? "✓ Copied Code!" : "Copy Code"}
          </button>
          <button 
            className="glow-button h-12 rounded-xl text-xs font-black text-white cursor-pointer" 
            type="button" 
            onClick={() => copy(inviteLink, "link")}
          >
            {copiedType === "link" ? "✓ Copied Link!" : "Copy Invite Link"}
          </button>
        </div>
      </div>
    </AdminBaseModal>
  );
}
