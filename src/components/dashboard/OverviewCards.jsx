import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const toneMap = {
  cyan: "border-cyan-300/35 text-cyan-300 shadow-cyan-500/10",
  green: "border-emerald-300/35 text-emerald-300 shadow-emerald-500/10",
  orange: "border-amber-300/35 text-amber-300 shadow-amber-500/10",
  purple: "border-violet-300/35 text-violet-300 shadow-violet-500/10",
  blue: "border-sky-300/35 text-sky-300 shadow-sky-500/10",
};

function OverviewCards({ cards }) {
  return (
    <section className="grid grid-cols-1 gap-3 min-[390px]:grid-cols-2 sm:gap-4 lg:grid-cols-4 2xl:grid-cols-7">
      {cards.map(({ icon: Icon, label, status, tone, to, value }) => {
        const Card = to ? motion(Link) : motion.article;

        return (
        <Card
          key={label}
          to={to}
          whileHover={{ y: -5 }}
          className={`glass-panel min-w-0 rounded-2xl p-3.5 transition focus:outline-none focus:ring-2 focus:ring-cyan-300/40 sm:p-5 ${to ? "block hover:border-cyan-300/35" : ""} ${toneMap[tone]}`}
        >
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-4">
            <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl border bg-white/[0.04] sm:h-12 sm:w-12 ${toneMap[tone]}`}>
              <Icon size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-400">{label}</p>
              <h3 className="mt-1 truncate text-xl font-black text-white sm:text-3xl">{value}</h3>
            </div>
          </div>
          <p className="mt-3 line-clamp-2 text-xs leading-5 text-slate-400 sm:mt-4">{status}</p>
        </Card>
      )})}
    </section>
  );
}

export default OverviewCards;
