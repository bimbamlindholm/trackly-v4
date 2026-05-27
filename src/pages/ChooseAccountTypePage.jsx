import { ArrowLeft, BarChart3, Cloud, LockKeyhole, ShieldCheck, Sparkles, UserRound, UsersRound, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import AccountTypeCard from "../components/AccountTypeCard";
import PageTransition from "../components/PageTransition";

const accountTypes = [
  {
    accent: "cyan",
    buttonLabel: "Continue as Personal",
    description: "Perfect for individuals who want to track their own time, stay productive, and achieve more.",
    features: [
      "Track your work hours & breaks",
      "View personal reports & insights",
      "Stay organized and productive",
    ],
    icon: UserRound,
    title: "Personal Account",
    to: "/register?type=personal",
  },
  {
    accent: "purple",
    buttonLabel: "Create Team Workspace",
    description: "Ideal for businesses and teams who want to manage attendance, track productivity, and streamline workflows.",
    features: [
      "Manage team attendance & schedules",
      "Advanced reports & analytics",
      "Payroll-ready & team management",
    ],
    icon: UsersRound,
    title: "Team Workspace",
    to: "/team-role",
  },
];

const trustItems = [
  { icon: ShieldCheck, title: "Secure & Private", text: "Your data is always safe with us." },
  { icon: Zap, title: "Real-time Tracking", text: "Accurate and instant updates." },
  { icon: BarChart3, title: "Powerful Insights", text: "Make smarter productivity decisions." },
  { icon: Cloud, title: "Cloud Sync", text: "Access your data anywhere." },
];

function ChooseAccountTypePage() {
  return (
    <PageTransition>
      <main className="relative min-h-screen overflow-x-hidden bg-[#07111F] text-slate-50">
        <div className="galaxy-bg" />
        <div className="register-planet-glow" />
        <div className="noise-overlay" />

        <div className="relative z-10 flex min-h-screen flex-col">
          <header className="border-b border-white/10 bg-[#07111F]/55 backdrop-blur-2xl">
            <nav className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:h-24 sm:px-6 lg:px-8">
              <Link to="/" className="flex min-w-0 items-center gap-3" aria-label="Trackly home">
                <img
                  src="/trackly-logo.png"
                  alt="Trackly"
                  className="h-12 w-12 shrink-0 object-contain drop-shadow-[0_0_22px_rgba(45,212,191,0.38)] sm:h-14 sm:w-14"
                />
                <div className="leading-none">
                  <span className="block text-xl font-black tracking-wide text-white sm:text-2xl">TRACKLY</span>
                  <span className="hidden text-[0.58rem] font-bold uppercase tracking-[0.34em] text-cyan-300 sm:block">
                    Track Time. Grow Better.
                  </span>
                </div>
              </Link>

              <div className="flex shrink-0 items-center gap-3 sm:gap-5">
                <span className="hidden text-sm text-slate-300 md:inline">Already have an account?</span>
                <Link
                  to="/login"
                  className="rounded-xl border border-cyan-300/30 bg-white/[0.03] px-5 py-3 text-sm font-bold text-white transition hover:border-cyan-300/60 hover:bg-cyan-300/10 sm:px-7"
                >
                  Log in
                </Link>
              </div>
            </nav>
          </header>

          <section className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-5 py-3 text-sm font-bold text-slate-100 transition hover:border-cyan-300/50 hover:bg-cyan-300/10 hover:text-cyan-200"
            >
              <ArrowLeft size={17} />
              Back to Home
            </Link>

            <div className="mx-auto mt-2 max-w-3xl text-center sm:mt-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/5 px-5 py-2 text-sm font-bold text-cyan-200 shadow-[0_0_24px_rgba(6,182,212,0.12)]">
                <Sparkles size={15} className="text-violet-300" />
                Step 1 of 3
              </div>
              <h1 className="mt-5 text-[clamp(2.45rem,6vw,4.7rem)] font-black leading-[1.05] tracking-tight text-white">
                Choose how you'll
                <br />
                use <span className="gradient-text">Trackly</span>
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
                Select the setup that best fits your time tracking needs.
              </p>
            </div>

            <div className="mx-auto mt-8 grid max-w-4xl gap-6 md:grid-cols-2">
              {accountTypes.map((type) => (
                <AccountTypeCard key={type.title} {...type} />
              ))}
            </div>

            <p className="mx-auto mt-7 flex max-w-2xl items-center justify-center gap-3 text-center text-sm text-slate-300 sm:text-base">
              <LockKeyhole size={18} className="text-cyan-300" />
              You can always change this later from settings.
            </p>
          </section>

          <section className="mx-auto w-full max-w-7xl px-4 pb-5 sm:px-6 lg:px-8">
            <div className="glass-panel grid gap-5 rounded-2xl p-5 sm:grid-cols-2 lg:grid-cols-4 lg:p-6">
              {trustItems.map(({ icon: Icon, title, text }) => (
                <div key={title} className="flex items-center gap-4">
                  <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-violet-300/15 bg-violet-400/10 text-violet-300">
                    <Icon size={27} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white sm:text-base">{title}</h3>
                    <p className="mt-1 text-sm text-slate-400">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </PageTransition>
  );
}

export default ChooseAccountTypePage;
