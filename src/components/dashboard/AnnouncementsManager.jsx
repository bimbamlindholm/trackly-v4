import { Megaphone, Plus, Trash2 } from "lucide-react";
import SettingsInput from "./SettingsInput";

/**
 * Announcement manager dashboard sub-panel.
 * Allows administrators to compose system-wide broadcasts and delete active announcements.
 */
export default function AnnouncementsManager({
  announcements,
  loadingAnnouncements,
  announcementForm,
  setAnnouncementForm,
  onPost,
  onDelete,
  posting,
}) {
  return (
    <section className="glass-panel mt-6 rounded-2xl p-4 sm:mt-8 sm:p-6 border border-white/10 bg-slate-950/10 text-left">
      <div className="flex items-center gap-2.5 mb-5 border-b border-white/5 pb-4">
        <Megaphone className="text-cyan-300 shrink-0" size={22} />
        <div>
          <h2 className="text-lg font-black text-white">Broadcast Announcements</h2>
          <p className="text-xs text-slate-400">Post announcements that will appear instantly on all employee dashboards.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        {/* Post New Announcement Form */}
        <form onSubmit={onPost} className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">New Announcement</h3>
          <SettingsInput 
            label="Title" 
            placeholder="e.g. System Maintenance Schedule"
            value={announcementForm.title}
            onChange={(val) => setAnnouncementForm({ ...announcementForm, title: val })}
            required
          />
          <label className="grid gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Body Content</span>
            <textarea
              className="min-h-[100px] rounded-xl border border-white/10 bg-slate-900 p-3 text-sm font-semibold text-white outline-none focus:border-cyan-300/50 transition"
              placeholder="e.g. Please be informed that Trackly will undergo system upgrades on..."
              value={announcementForm.body}
              onChange={(event) => setAnnouncementForm({ ...announcementForm, body: event.target.value })}
              required
            />
          </label>
          <button 
            disabled={posting}
            className="glow-button h-11 w-full rounded-xl text-sm font-black text-white flex items-center justify-center gap-2 cursor-pointer transition disabled:opacity-40"
            type="submit"
          >
            <Plus size={16} />
            {posting ? "Posting..." : "Post Announcement"}
          </button>
        </form>

        {/* Current Active Announcements List */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Current Announcements</h3>
          
          {loadingAnnouncements ? (
            <p className="text-xs text-slate-500">Loading broadcast list...</p>
          ) : announcements.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/5 bg-white/[0.01] p-6 text-center text-xs text-slate-500">
              No active announcements. Keep your team informed by creating one.
            </div>
          ) : (
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {announcements.map((item) => (
                <div key={item.id} className="rounded-xl border border-white/5 bg-white/[0.02] p-3 flex justify-between items-start gap-3 transition hover:border-cyan-500/20">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-white truncate">{item.title}</p>
                    <p className="mt-1 text-xs text-slate-400 line-clamp-3 leading-relaxed">{item.body}</p>
                    <p className="mt-2 text-[9px] font-bold uppercase tracking-wider text-slate-600">
                      {new Date(item.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  </div>
                  <button 
                    onClick={() => onDelete(item.id)}
                    className="p-2 rounded-lg border border-white/10 text-rose-400 hover:bg-rose-500/10 hover:border-rose-400/20 transition shrink-0 cursor-pointer"
                    type="button"
                    aria-label="Delete"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
