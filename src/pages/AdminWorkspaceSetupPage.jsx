import { useState } from "react";
import { ArrowLeft, ArrowRight, Building2, Sparkles, UsersRound } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import PageTransition from "../components/PageTransition";
import SetupHeader from "../components/SetupHeader";
import { useAuth } from "../contexts/AuthContext";

const industries = [
  "Retail Store",
  "Restaurant",
  "Agency",
  "Office Team",
  "Freelance Team",
  "Construction",
  "Other",
];

const teamSizes = ["1-5", "6-20", "21-50", "50+"];

function AdminWorkspaceSetupPage() {
  const navigate = useNavigate();
  const { registerAdmin } = useAuth();
  const [form, setForm] = useState({
    workspaceName: "",
    industry: "",
    teamSize: "",
    companyAddress: "",
    contactNumber: "",
    shiftStartTime: "08:00",
    expectedWorkHours: "8",
    payrollPeriod: "semi-monthly",
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = {};
    const adminDraft = JSON.parse(sessionStorage.getItem("tracklyAdminDraft") || "null");
    if (!adminDraft?.email || !adminDraft?.password) nextErrors.form = "Admin account step is missing. Please start again.";
    if (!form.workspaceName.trim()) nextErrors.workspaceName = "Workspace name is required";
    if (!form.industry) nextErrors.industry = "Select a workspace type";
    if (!form.teamSize) nextErrors.teamSize = "Select a team size";

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      const result = await registerAdmin(adminDraft, form);
      sessionStorage.removeItem("tracklyAdminDraft");
      navigate(result.redirectTo);
    } catch (error) {
      setErrors({ form: error.message || "Unable to create workspace." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageTransition>
      <main className="relative min-h-screen overflow-x-hidden bg-[#07111F] text-slate-50">
        <div className="galaxy-bg" />
        <div className="register-planet-glow" />
        <div className="noise-overlay" />

        <div className="relative z-10 flex min-h-screen flex-col">
          <SetupHeader />
          <section className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
            <Link
              to="/admin-register"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-5 py-3 text-sm font-bold text-slate-100 transition hover:border-cyan-300/50 hover:bg-cyan-300/10 hover:text-cyan-200"
            >
              <ArrowLeft size={17} />
              Back
            </Link>

            <div className="mx-auto mt-4 max-w-2xl text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/5 px-5 py-2 text-sm font-bold text-cyan-200 shadow-[0_0_24px_rgba(6,182,212,0.12)]">
                <Sparkles size={15} className="text-violet-300" />
                Step 2 of 2
              </div>
              <h1 className="mt-5 text-[clamp(2.35rem,5vw,4.4rem)] font-black leading-[1.05] tracking-tight text-white">
                Create your <span className="gradient-text">workspace</span>
              </h1>
              <p className="mx-auto mt-5 max-w-xl text-base leading-8 text-slate-300 sm:text-lg">
                Add your team details so members can join later.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="glass-panel mx-auto mt-8 grid w-full max-w-xl gap-5 rounded-[1.75rem] border-cyan-300/30 p-5 shadow-[0_0_80px_rgba(124,58,237,0.18)] sm:p-8">
              <label className="grid gap-2 text-sm font-medium text-slate-300">
                Company / Workspace Name
                <span className="relative">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    value={form.workspaceName}
                    onChange={(event) => updateField("workspaceName", event.target.value)}
                    placeholder="Enter your workspace name"
                    className={`h-[54px] w-full rounded-xl border bg-white/[0.025] px-12 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/60 focus:bg-cyan-300/[0.035] focus:shadow-[0_0_0_4px_rgba(6,182,212,0.08)] ${errors.workspaceName ? "border-rose-400/70" : "border-white/10"}`}
                  />
                </span>
                {errors.workspaceName && <span className="text-xs font-semibold text-rose-300">{errors.workspaceName}</span>}
              </label>

              <SelectField
                error={errors.industry}
                icon={Building2}
                label="Workspace Type / Industry"
                onChange={(value) => updateField("industry", value)}
                options={industries}
                placeholder="Select industry"
                value={form.industry}
              />
              <SelectField
                error={errors.teamSize}
                icon={UsersRound}
                label="Team Size"
                onChange={(value) => updateField("teamSize", value)}
                options={teamSizes}
                placeholder="Select team size"
                value={form.teamSize}
              />

              <div className="grid gap-5 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium text-slate-300">
                  Company Address <span className="text-xs text-slate-500">(optional)</span>
                  <span className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      value={form.companyAddress}
                      onChange={(event) => updateField("companyAddress", event.target.value)}
                      placeholder="Enter company address"
                      className="h-[54px] w-full rounded-xl border border-white/10 bg-white/[0.025] px-12 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/60 focus:bg-cyan-300/[0.035]"
                    />
                  </span>
                </label>

                <label className="grid gap-2 text-sm font-medium text-slate-300">
                  Contact Number <span className="text-xs text-slate-500">(optional)</span>
                  <span className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      value={form.contactNumber}
                      onChange={(event) => updateField("contactNumber", event.target.value)}
                      placeholder="e.g. +639123456789"
                      className="h-[54px] w-full rounded-xl border border-white/10 bg-white/[0.025] px-12 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/60 focus:bg-cyan-300/[0.035]"
                    />
                  </span>
                </label>
              </div>

              {errors.form && (
                <div className="rounded-xl border border-rose-300/30 bg-rose-400/10 p-3 text-sm font-semibold text-rose-100">
                  {errors.form}
                </div>
              )}

              <div className="grid gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="glow-button group relative mt-1 flex h-[60px] w-full items-center justify-center rounded-xl px-6 text-base font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "Creating workspace..." : "Create Workspace"}
                  <span className="absolute right-4 grid h-10 w-10 place-items-center rounded-full bg-white text-cyan-500 transition group-hover:translate-x-1">
                    <ArrowRight size={19} />
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/admin-register")}
                  className="flex h-[52px] w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] text-sm font-bold text-slate-400 transition hover:border-white/20 hover:bg-white/[0.05] hover:text-white active:scale-[0.98]"
                >
                  <ArrowLeft size={16} />
                  Go Back
                </button>
              </div>
            </form>
          </section>
        </div>
      </main>
    </PageTransition>
  );
}

function SelectField({ error, icon: Icon, label, onChange, options, placeholder, value }) {
  return (
    <label className="grid gap-2 text-sm font-medium text-slate-300">
      {label}
      <span className="relative">
        <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`h-[54px] w-full appearance-none rounded-xl border bg-[#0B1424] px-12 text-sm text-white outline-none transition focus:border-cyan-300/60 focus:bg-cyan-300/[0.035] focus:shadow-[0_0_0_4px_rgba(6,182,212,0.08)] ${error ? "border-rose-400/70" : "border-white/10"}`}
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </span>
      {error && <span className="text-xs font-semibold text-rose-300">{error}</span>}
    </label>
  );
}

export default AdminWorkspaceSetupPage;
