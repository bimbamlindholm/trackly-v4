/**
 * Standard text/number/time input field with custom styles,
 * used across the Admin settings dashboard pages.
 */
export default function SettingsInput({ label, onChange, value, ...props }) {
  return (
    <label className="grid gap-2 text-left">
      <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{label}</span>
      <input
        className="h-12 rounded-xl border border-white/10 bg-slate-900 px-3 text-sm font-semibold text-white outline-none focus:border-cyan-300/50 transition"
        onChange={(event) => onChange(event.target.value)}
        value={value != null ? value : ""}
        {...props}
      />
    </label>
  );
}
