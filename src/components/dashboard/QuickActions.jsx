import { quickActions } from "./dashboardData";

function QuickActions({ onAction }) {
  return (
    <section className="glass-panel rounded-2xl p-4 sm:p-5">
      <h2 className="text-lg font-black text-white">Quick Actions</h2>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:mt-5 sm:gap-3 lg:grid-cols-4">
        {quickActions.map(({ icon: Icon, label }) => (
          <button
            key={label}
            type="button"
            onClick={() => onAction(label)}
            className="group min-h-[86px] rounded-2xl border border-white/10 bg-white/[0.035] p-2 text-xs font-bold text-white transition hover:-translate-y-1 hover:border-cyan-300/35 hover:bg-cyan-300/10 sm:min-h-[98px] sm:p-3 sm:text-sm"
          >
            <Icon className="mx-auto mb-2 text-cyan-300 transition group-hover:scale-110 sm:mb-3" size={28} />
            <span className="block leading-tight">{label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

export default QuickActions;
