import { Plus, Trash2, Calendar } from "lucide-react";
import SettingsInput from "./SettingsInput";

/**
 * Holiday manager dashboard sub-panel.
 * Allows administrators to define dynamic custom workspace holidays (local town fiestas, company foundation days, etc.).
 */
export default function HolidaysManager({
  holidays = [],
  loadingHolidays = false,
  newHolidayName,
  setNewHolidayName,
  newHolidayDate,
  setNewHolidayDate,
  newHolidayType,
  setNewHolidayType,
  onAddHoliday,
  onDeleteHoliday,
}) {
  return (
    <section className="glass-panel mt-6 rounded-2xl p-4 sm:mt-8 sm:p-6 border border-white/10 bg-slate-950/10 text-left">
      <div className="flex items-center gap-2.5 mb-5 border-b border-white/5 pb-4">
        <Calendar className="text-cyan-300 shrink-0" size={22} />
        <div>
          <h2 className="text-lg font-black text-white">Workspace Custom Holidays</h2>
          <p className="text-xs text-slate-400">Declare custom company holidays, foundation days, or local township fiestas for automatic payroll rate adjustments.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        {/* Post New Holiday Form */}
        <form onSubmit={onAddHoliday} className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Add Custom Holiday</h3>
          <SettingsInput 
            label="Holiday Date" 
            type="date"
            value={newHolidayDate}
            onChange={(val) => setNewHolidayDate(val)}
            required
          />
          <SettingsInput 
            label="Holiday Name" 
            placeholder="e.g. Company Anniversary, Town Fiesta"
            value={newHolidayName}
            onChange={(val) => setNewHolidayName(val)}
            required
          />
          <label className="grid gap-2 text-left">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Holiday Type</span>
            <select
              className="h-12 rounded-xl border border-white/10 bg-slate-900 px-3 text-sm font-semibold text-white outline-none focus:border-cyan-300/50 transition cursor-pointer"
              value={newHolidayType}
              onChange={(e) => setNewHolidayType(e.target.value)}
            >
              <option value="regular">Regular Holiday (Double Pay / 2.0x)</option>
              <option value="special">Special Non-Working Day (1.3x)</option>
            </select>
          </label>
          <button 
            disabled={!newHolidayName.trim() || !newHolidayDate}
            className="glow-button h-11 w-full rounded-xl text-sm font-black text-white flex items-center justify-center gap-2 cursor-pointer transition disabled:opacity-40"
            type="submit"
          >
            <Plus size={16} /> Add Holiday
          </button>
        </form>

        {/* Current Active Custom Holidays List */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Active Custom Holidays</h3>
          
          {loadingHolidays ? (
            <p className="text-xs text-slate-500">Loading custom holiday list...</p>
          ) : holidays.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/5 bg-white/[0.01] p-6 text-center text-xs text-slate-500">
              Walang custom holidays na nakarehistro. Magrehistro sa kaliwa para magamit sa payroll calculations.
            </div>
          ) : (
            <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
              {holidays.map((item) => (
                <div key={item.id} className="rounded-xl border border-white/5 bg-white/[0.02] p-3 flex justify-between items-center gap-3 transition hover:border-cyan-500/20">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-white truncate">{item.name}</p>
                    <p className="mt-1 text-xs text-slate-400 font-semibold font-mono flex items-center gap-2">
                      <span>📅 {item.date}</span>
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-600" />
                      <span className={item.type === "regular" ? "text-cyan-300 font-bold" : "text-purple-300 font-bold"}>
                        {item.type === "regular" ? "Regular" : "Special"}
                      </span>
                    </p>
                  </div>
                  <button 
                    onClick={() => onDeleteHoliday(item.id)}
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
