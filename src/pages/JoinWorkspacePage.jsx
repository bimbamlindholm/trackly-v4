import { useState } from "react";
import { ArrowLeft, ArrowRight, Building2, Eye, EyeOff, LockKeyhole, Mail, Sparkles, UserRound } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import PageTransition from "../components/PageTransition";
import SetupHeader from "../components/SetupHeader";
import { useAuth } from "../contexts/AuthContext";

const Facebook = ({ size = 18, className = "" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function JoinWorkspacePage() {
  const navigate = useNavigate();
  const { registerEmployee, validateWorkspaceCode, loginWithGoogle, loginWithFacebook } = useAuth();
  const [step, setStep] = useState("code");
  const [workspaceCode, setWorkspaceCode] = useState("");
  const [workspace, setWorkspace] = useState(null);
  const [showStatutory, setShowStatutory] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    department: "",
    position: "",
    employeeId: "",
    sss: "",
    philhealth: "",
    pagibig: "",
    tin: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
  };

  const handleGoogleLogin = async () => {
    setErrors({});
    try {
      await loginWithGoogle("employee", workspaceCode);
    } catch (err) {
      setErrors({ form: err.message || "Failed to initiate Google sign-in." });
    }
  };

  const handleFacebookLogin = async () => {
    setErrors({});
    try {
      await loginWithFacebook("employee", workspaceCode);
    } catch (err) {
      setErrors({ form: err.message || "Failed to initiate Facebook sign-in." });
    }
  };

  const handleCodeSubmit = async (event) => {
    event.preventDefault();
    setErrors({});

    if (!workspaceCode.trim()) {
      setErrors({ workspaceCode: "Workspace code is required" });
      return;
    }

    setSubmitting(true);
    try {
      const foundWorkspace = await validateWorkspaceCode(workspaceCode);
      setWorkspace(foundWorkspace);
      setStep("register");
    } catch (error) {
      setErrors({ workspaceCode: error.message || "Workspace code not found." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = {};

    if (!form.fullName.trim()) nextErrors.fullName = "Full name is required";
    if (!form.email.trim()) nextErrors.email = "Email address is required";
    else if (!emailPattern.test(form.email)) nextErrors.email = "Enter a valid email address";
    if (!form.password.trim()) nextErrors.password = "Password is required";
    if (form.password && form.password.length < 6) nextErrors.password = "Password must be at least 6 characters";
    if (form.password !== form.confirmPassword) nextErrors.confirmPassword = "Passwords do not match";

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      const result = await registerEmployee(workspaceCode, form);
      navigate(result.redirectTo);
    } catch (error) {
      setErrors({ form: error.message || "Unable to create employee account." });
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
          <SetupHeader helperText="Need to create a workspace?" actionLabel="Go back" actionTo="/team-role" />
          <section className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
            <Link
              to="/team-role"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-5 py-3 text-sm font-bold text-slate-100 transition hover:border-cyan-300/50 hover:bg-cyan-300/10 hover:text-cyan-200"
            >
              <ArrowLeft size={17} />
              Back
            </Link>

            <div className="mx-auto mt-4 max-w-2xl text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/5 px-5 py-2 text-sm font-bold text-cyan-200 shadow-[0_0_24px_rgba(6,182,212,0.12)]">
                <Sparkles size={15} className="text-violet-300" />
                Team Member Access
              </div>
              <h1 className="mt-5 text-[clamp(2.35rem,5vw,4.4rem)] font-black leading-[1.05] tracking-tight text-white">
                Join your <span className="gradient-text">workspace</span>
              </h1>
              <p className="mx-auto mt-5 max-w-xl text-base leading-8 text-slate-300 sm:text-lg">
                Enter the workspace code from your admin, then create your employee account.
              </p>
            </div>

            {step === "code" ? (
              <form onSubmit={handleCodeSubmit} className="glass-panel mx-auto mt-8 grid w-full max-w-xl gap-5 rounded-[1.75rem] border-cyan-300/30 p-5 shadow-[0_0_80px_rgba(124,58,237,0.18)] sm:p-8">
                <label className="grid gap-2 text-sm font-medium text-slate-300">
                  Workspace Code
                  <span className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      value={workspaceCode}
                      onChange={(event) => {
                        setWorkspaceCode(event.target.value.toUpperCase());
                        setErrors({});
                      }}
                      placeholder="Example: TRK-48291"
                      className={`h-[54px] w-full rounded-xl border bg-white/[0.025] px-12 text-sm uppercase tracking-[0.12em] text-white outline-none transition placeholder:normal-case placeholder:tracking-normal placeholder:text-slate-500 focus:border-cyan-300/60 focus:bg-cyan-300/[0.035] focus:shadow-[0_0_0_4px_rgba(6,182,212,0.08)] ${errors.workspaceCode ? "border-rose-400/70" : "border-white/10"}`}
                    />
                  </span>
                  {errors.workspaceCode && <span className="text-xs font-semibold text-rose-300">{errors.workspaceCode}</span>}
                </label>

                <div className="grid gap-3">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="glow-button group relative mt-1 flex h-[60px] w-full items-center justify-center rounded-xl px-6 text-base font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? "Checking workspace..." : "Continue"}
                    <span className="absolute right-4 grid h-10 w-10 place-items-center rounded-full bg-white text-cyan-500 transition group-hover:translate-x-1">
                      <ArrowRight size={19} />
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate("/team-role")}
                    className="flex h-[52px] w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] text-sm font-bold text-slate-400 transition hover:border-white/20 hover:bg-white/[0.05] hover:text-white active:scale-[0.98]"
                  >
                    <ArrowLeft size={16} />
                    Go Back
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleRegisterSubmit} className="glass-panel mx-auto mt-8 grid w-full max-w-2xl gap-5 rounded-[1.75rem] border-cyan-300/30 p-5 shadow-[0_0_80px_rgba(124,58,237,0.18)] sm:p-8">
                <div className="rounded-2xl border border-cyan-300/25 bg-cyan-300/10 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-200">Joining workspace</p>
                  <p className="mt-2 text-xl font-black text-white">{workspace?.workspace_name}</p>
                  <p className="mt-1 text-sm text-slate-300">{workspace?.workspace_code}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    className="flex h-14 w-full items-center justify-center gap-2.5 rounded-xl border border-white/10 bg-[#4285F4]/10 text-xs font-black text-white transition hover:border-[#4285F4]/40 hover:bg-[#4285F4]/20 shadow-[0_0_20px_rgba(66,133,244,0.1)]"
                  >
                    <svg className="h-4 w-4 fill-current text-[#4285F4]" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                    </svg>
                    Google
                  </button>

                  <button
                    type="button"
                    onClick={handleFacebookLogin}
                    className="flex h-14 w-full items-center justify-center gap-2.5 rounded-xl border border-white/10 bg-[#1877F2]/10 text-xs font-black text-white transition hover:border-[#1877F2]/40 hover:bg-[#1877F2]/20 shadow-[0_0_20px_rgba(24,119,242,0.1)]"
                  >
                    <Facebook size={16} className="text-[#1877F2]" />
                    Facebook
                  </button>
                </div>

                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 text-sm text-slate-400">
                  <span className="h-px bg-white/10" />
                  <span>or sign up with email</span>
                  <span className="h-px bg-white/10" />
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <Field error={errors.fullName} icon={UserRound} label="Full Name" onChange={(value) => updateField("fullName", value)} placeholder="Enter your full name" value={form.fullName} />
                  <Field error={errors.email} icon={Mail} label="Email Address" onChange={(value) => updateField("email", value)} placeholder="Enter your email address" type="email" value={form.email} />
                  <PasswordField error={errors.password} label="Password" onChange={(value) => updateField("password", value)} onToggle={() => setShowPassword((value) => !value)} placeholder="Create password" value={form.password} visible={showPassword} />
                  <PasswordField error={errors.confirmPassword} label="Confirm Password" onChange={(value) => updateField("confirmPassword", value)} onToggle={() => setShowConfirmPassword((value) => !value)} placeholder="Confirm password" value={form.confirmPassword} visible={showConfirmPassword} />
                  <Field icon={UserRound} label="Phone Number" onChange={(value) => updateField("phone", value)} placeholder="Optional" value={form.phone} />
                  <Field icon={Building2} label="Department" onChange={(value) => updateField("department", value)} placeholder="Optional" value={form.department} />
                  <Field icon={UserRound} label="Position" onChange={(value) => updateField("position", value)} placeholder="Optional" value={form.position} />
                  <Field icon={UserRound} label="Employee ID / Staff ID" onChange={(value) => updateField("employeeId", value)} placeholder="Optional" value={form.employeeId} />
                </div>

                {/* Government Statutory Accordion for Employees */}
                <div className="rounded-2xl border border-white/5 bg-white/[0.01] p-4 transition-all">
                  <button
                    type="button"
                    onClick={() => setShowStatutory(!showStatutory)}
                    className="flex w-full items-center justify-between text-left focus:outline-none"
                  >
                    <div>
                      <span className="block text-sm font-bold text-slate-200">Statutory & Compliance IDs (Optional)</span>
                      <span className="text-xs text-slate-500 block">Add SSS, PhilHealth, Pag-IBIG, & TIN for payroll</span>
                    </div>
                    <span className="text-xs font-bold text-cyan-400 hover:text-cyan-300 transition">
                      {showStatutory ? "Hide [−]" : "Show [+]"}
                    </span>
                  </button>

                  {showStatutory && (
                    <div className="mt-4 grid gap-4 border-t border-white/5 pt-4 sm:grid-cols-2">
                      <label className="grid gap-1.5 text-xs font-medium text-slate-400">
                        SSS Number
                        <input
                          type="text"
                          placeholder="00-0000000-0"
                          value={form.sss}
                          onChange={(e) => updateField("sss", e.target.value)}
                          className="h-[46px] w-full rounded-lg border border-white/10 bg-[#0E1726] px-3 text-xs text-white outline-none transition focus:border-cyan-300/40"
                        />
                      </label>

                      <label className="grid gap-1.5 text-xs font-medium text-slate-400">
                        PhilHealth Number
                        <input
                          type="text"
                          placeholder="00-000000000-0"
                          value={form.philhealth}
                          onChange={(e) => updateField("philhealth", e.target.value)}
                          className="h-[46px] w-full rounded-lg border border-white/10 bg-[#0E1726] px-3 text-xs text-white outline-none transition focus:border-cyan-300/40"
                        />
                      </label>

                      <label className="grid gap-1.5 text-xs font-medium text-slate-400">
                        Pag-IBIG Number
                        <input
                          type="text"
                          placeholder="0000-0000-0000"
                          value={form.pagibig}
                          onChange={(e) => updateField("pagibig", e.target.value)}
                          className="h-[46px] w-full rounded-lg border border-white/10 bg-[#0E1726] px-3 text-xs text-white outline-none transition focus:border-cyan-300/40"
                        />
                      </label>

                      <label className="grid gap-1.5 text-xs font-medium text-slate-400">
                        TIN Number
                        <input
                          type="text"
                          placeholder="000-000-000-000"
                          value={form.tin}
                          onChange={(e) => updateField("tin", e.target.value)}
                          className="h-[46px] w-full rounded-lg border border-white/10 bg-[#0E1726] px-3 text-xs text-white outline-none transition focus:border-cyan-300/40"
                        />
                      </label>
                    </div>
                  )}
                </div>

                <label className="flex items-start gap-3 text-sm leading-6 text-slate-300">
                  <input
                    type="checkbox"
                    required
                    className="mt-1 h-5 w-5 shrink-0 rounded border border-white/20 bg-transparent accent-cyan-400"
                  />
                  <span>
                    I agree to the{" "}
                    <Link to="/terms" className="font-semibold text-cyan-300 hover:text-cyan-200">
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link to="/privacy" className="font-semibold text-violet-300 hover:text-violet-200">
                      Privacy Policy
                    </Link>
                  </span>
                </label>

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
                    {submitting ? "Creating employee account..." : "Create Employee Account"}
                    <span className="absolute right-4 grid h-10 w-10 place-items-center rounded-full bg-white text-cyan-500 transition group-hover:translate-x-1">
                      <ArrowRight size={19} />
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStep("code")}
                    disabled={submitting}
                    className="flex h-[52px] w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] text-sm font-bold text-slate-400 transition hover:border-white/20 hover:bg-white/[0.05] hover:text-white active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ArrowLeft size={16} />
                    Go Back
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      </main>
    </PageTransition>
  );
}

function Field({ error, icon: Icon, label, onChange, placeholder, type = "text", value }) {
  return (
    <label className="grid gap-2 text-sm font-medium text-slate-300">
      {label}
      <span className="relative">
        <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={`h-[54px] w-full rounded-xl border bg-white/[0.025] px-12 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/60 focus:bg-cyan-300/[0.035] focus:shadow-[0_0_0_4px_rgba(6,182,212,0.08)] ${error ? "border-rose-400/70" : "border-white/10"}`}
        />
      </span>
      {error && <span className="text-xs font-semibold text-rose-300">{error}</span>}
    </label>
  );
}

function PasswordField({ error, label, onChange, onToggle, placeholder, value, visible }) {
  return (
    <label className="grid gap-2 text-sm font-medium text-slate-300">
      {label}
      <span className="relative">
        <LockKeyhole className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={`h-[54px] w-full rounded-xl border bg-white/[0.025] px-12 pr-14 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/60 focus:bg-cyan-300/[0.035] focus:shadow-[0_0_0_4px_rgba(6,182,212,0.08)] ${error ? "border-rose-400/70" : "border-white/10"}`}
        />
        <button
          type="button"
          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-cyan-300"
          onClick={onToggle}
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </span>
      {error && <span className="text-xs font-semibold text-rose-300">{error}</span>}
    </label>
  );
}

export default JoinWorkspacePage;
