import { motion } from "framer-motion";
import { Camera, Save, X } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardShell from "../components/dashboard/DashboardShell";
import PageTransition from "../components/PageTransition";
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
import { useToast } from "../contexts/ToastContext";
import { workspaceToView } from "../utils/supabaseMappers";

function AdminProfilePage() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const {
    profile,
    updateProfile,
    updateWorkspace,
    workspace: authWorkspace,
    user,
    linkGoogleIdentity,
    unlinkGoogleIdentity,
    linkFacebookIdentity,
    unlinkFacebookIdentity,
    updatePassword,
  } = useAuth();
  const workspace = workspaceToView(authWorkspace, profile);
  
  const googleIdentity = user?.identities?.find((id) => id.provider === "google");
  const isGoogleConnected = !!googleIdentity;
  const facebookIdentity = user?.identities?.find((id) => id.provider === "facebook");
  const isFacebookConnected = !!facebookIdentity;
  const [linking, setLinking] = useState(false);
  const [manualPassword, setManualPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);

  const handleSetPassword = async (e) => {
    e.preventDefault();
    if (manualPassword.length < 6) {
      addToast("Password must be at least 6 characters.", "warning");
      return;
    }
    setUpdatingPassword(true);
    try {
      await updatePassword(manualPassword);
      addToast("Password successfully set for manual login!", "success");
      setManualPassword("");
    } catch (err) {
      addToast(err.message || "Failed to update password.", "error");
    } finally {
      setUpdatingPassword(false);
    }
  };

  const [form, setForm] = useState({
    ownerName: profile?.full_name || workspace.adminName,
    ownerEmail: profile?.email || workspace.adminEmail,
    ownerPhone: profile?.phone || workspace.adminPhone,
    ownerPosition: profile?.position || workspace.adminPosition,
    workspaceName: workspace.name,
    industry: workspace.industry,
    teamSize: workspace.teamSize,
    companyAddress: workspace.companyAddress,
    contactNumber: workspace.contactNumber,
    workspaceCode: workspace.code,
    facePhoto: profile?.face_photo || "",
  });

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const handleGoogleLink = async () => {
    setLinking(true);
    try {
      if (isGoogleConnected) {
        if (window.confirm("Are you sure you want to disconnect your Google Account? You will need to log in using email & password next time.")) {
          await unlinkGoogleIdentity(googleIdentity.id);
        }
      } else {
        await linkGoogleIdentity();
      }
    } catch (err) {
      console.error("[AdminProfile] Failed to change Google linking:", err);
    } finally {
      setLinking(false);
    }
  };

  const handleFacebookLink = async () => {
    setLinking(true);
    try {
      if (isFacebookConnected) {
        if (window.confirm("Are you sure you want to disconnect your Facebook Account? You will need to log in using email & password next time.")) {
          await unlinkFacebookIdentity(facebookIdentity.id);
        }
      } else {
        await linkFacebookIdentity();
      }
    } catch (err) {
      console.error("[AdminProfile] Failed to change Facebook linking:", err);
    } finally {
      setLinking(false);
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      addToast("Please upload a valid image file.", "warning");
      return;
    }

    if (file.size > 1.5 * 1024 * 1024) {
      addToast("Image must be smaller than 1.5MB to save space.", "warning");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = event.target.result;
      update("facePhoto", base64String);
      addToast("Profile photo loaded! Click 'Save Changes' to update.", "success");
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    update("facePhoto", "");
    addToast("Profile photo removed! Click 'Save Changes' to apply.", "info");
  };

  const submit = (event) => {
    event.preventDefault();
    Promise.all([
      updateProfile({
        fullName: form.ownerName,
        email: form.ownerEmail,
        phone: form.ownerPhone,
        position: form.ownerPosition,
        face_photo: form.facePhoto,
      }),
      updateWorkspace({
        workspaceName: form.workspaceName,
        industry: form.industry,
        teamSize: form.teamSize,
        companyAddress: form.companyAddress,
        contactNumber: form.contactNumber,
      }),
    ])
      .then(() => {
        addToast("Profile and workspace details updated successfully!", "success");
        navigate("/admin-dashboard");
      })
      .catch((err) => {
        addToast(err.message || "Failed to update profile details.", "error");
      });
  };

  return (
    <PageTransition>
      <DashboardShell workspace={{ ...workspace, adminName: form.ownerName }}>
        <motion.main
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="px-4 py-6 sm:px-6 lg:px-8"
        >
          <form onSubmit={submit} className="mx-auto max-w-6xl">
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-cyan-300">Admin Profile</p>
            <h1 className="mt-3 text-[clamp(2rem,4vw,3.2rem)] font-black tracking-tight text-white">
              Manage your <span className="gradient-text">profile</span>
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-300">
              Update owner details and company workspace information saved to Supabase.
            </p>

            <div className="mt-8 grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
              <div className="grid gap-6 self-start">
                <section className="glass-panel rounded-2xl p-6">
                  <h2 className="text-lg font-black text-white">Profile Photo</h2>
                  <div className="relative group mx-auto mt-8 h-36 w-36 rounded-full border border-cyan-300/25 bg-cyan-300/10 text-cyan-200 shadow-[0_0_45px_rgba(6,182,212,0.16)] overflow-hidden cursor-pointer">
                    {form.facePhoto ? (
                      <img
                        src={form.facePhoto}
                        alt="Admin Profile Preview"
                        className="h-full w-full rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Camera size={42} />
                      </div>
                    )}
                    
                    {/* Hover Overlay */}
                    <div
                      onClick={() => document.getElementById("admin-avatar-input").click()}
                      className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-fade-in"
                    >
                      <Camera size={24} className="text-white animate-pulse" />
                      <span className="mt-1 text-[11px] font-bold uppercase tracking-wider text-white">
                        {form.facePhoto ? "Change" : "Upload"}
                      </span>
                    </div>

                    {/* Hidden File Input */}
                    <input
                      type="file"
                      id="admin-avatar-input"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                  </div>
                  
                  {form.facePhoto ? (
                    <div className="mt-4 flex justify-center">
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-rose-400 hover:text-rose-300 transition"
                      >
                        <X size={14} />
                        Remove Photo
                      </button>
                    </div>
                  ) : (
                    <p className="mt-5 text-center text-xs leading-5 text-slate-400">
                      Click the camera icon to upload an avatar image (max 1.5MB).
                    </p>
                  )}
                </section>

                 <section className="glass-panel rounded-2xl p-6">
                  <h2 className="text-lg font-black text-white">Connected Accounts</h2>
                  <p className="mt-2 text-xs text-slate-400">
                    Connect your Google or Facebook account to sign in with single sign-on (SSO).
                  </p>

                  <div className="mt-6 flex flex-col gap-6">
                    {/* Google SSO card */}
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between gap-4 rounded-xl border border-white/5 bg-white/[0.02] p-4">
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-black text-[#4285F4]">G</span>
                          <div>
                            <p className="text-sm font-bold text-white">Google Account</p>
                            <p className="text-[11px] text-slate-400 truncate max-w-[130px]">
                              {isGoogleConnected ? user?.email : "Not linked"}
                            </p>
                          </div>
                        </div>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${isGoogleConnected ? "bg-emerald-400/10 text-emerald-400 animate-pulse" : "bg-slate-400/10 text-slate-400"}`}>
                          ● {isGoogleConnected ? "Connected" : "Inactive"}
                        </span>
                      </div>

                      <button
                        type="button"
                        disabled={linking}
                        onClick={handleGoogleLink}
                        className={`flex h-11 w-full items-center justify-center gap-2 rounded-xl text-xs font-black transition ${
                          isGoogleConnected
                            ? "border border-rose-300/25 bg-rose-400/10 text-rose-200 hover:bg-rose-400/25"
                            : "border border-white/10 bg-[#4285F4]/10 text-white hover:border-[#4285F4]/40 hover:bg-[#4285F4]/20 shadow-[0_0_15px_rgba(66,133,244,0.1)]"
                        }`}
                      >
                        {linking ? "Processing..." : isGoogleConnected ? "Disconnect Google" : "Connect Google Account"}
                      </button>
                    </div>

                    {/* Facebook SSO card */}
                    <div className="flex flex-col gap-3 border-t border-white/5 pt-4">
                      <div className="flex items-center justify-between gap-4 rounded-xl border border-white/5 bg-white/[0.02] p-4">
                        <div className="flex items-center gap-3">
                          <Facebook size={18} className="text-[#1877F2]" />
                          <div>
                            <p className="text-sm font-bold text-white">Facebook Account</p>
                            <p className="text-[11px] text-slate-400 truncate max-w-[130px]">
                              {isFacebookConnected ? user?.email : "Not linked"}
                            </p>
                          </div>
                        </div>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${isFacebookConnected ? "bg-emerald-400/10 text-emerald-400 animate-pulse" : "bg-slate-400/10 text-slate-400"}`}>
                          ● {isFacebookConnected ? "Connected" : "Inactive"}
                        </span>
                      </div>

                      <button
                        type="button"
                        disabled={linking}
                        onClick={handleFacebookLink}
                        className={`flex h-11 w-full items-center justify-center gap-2 rounded-xl text-xs font-black transition ${
                          isFacebookConnected
                            ? "border border-rose-300/25 bg-rose-400/10 text-rose-200 hover:bg-rose-400/25"
                            : "border border-white/10 bg-[#1877F2]/10 text-white hover:border-[#1877F2]/40 hover:bg-[#1877F2]/20 shadow-[0_0_15px_rgba(24,119,242,0.1)]"
                        }`}
                      >
                        {linking ? "Processing..." : isFacebookConnected ? "Disconnect Facebook" : "Connect Facebook Account"}
                      </button>
                    </div>
                  </div>
                </section>

                <section className="glass-panel rounded-2xl p-6 mt-6">
                  <h2 className="text-lg font-black text-white">Manual Login Password</h2>
                  <p className="mt-2 text-xs text-slate-400">
                    Set a password for your account so you can log in manually by typing your email and password, in addition to using Google or Facebook SSO.
                  </p>

                  <div className="mt-6 flex flex-col gap-4">
                    <label className="grid gap-2 text-xs font-semibold text-slate-300">
                      New Password
                      <input
                        type="password"
                        placeholder="Enter password (min 6 characters)"
                        value={manualPassword}
                        onChange={(e) => setManualPassword(e.target.value)}
                        className="h-11 rounded-xl border border-white/10 bg-white/[0.035] px-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/60 focus:bg-cyan-300/[0.055]"
                      />
                    </label>

                    <button
                      type="button"
                      disabled={updatingPassword || manualPassword.length < 6}
                      onClick={handleSetPassword}
                      className="glow-button flex h-11 w-full items-center justify-center gap-2 rounded-xl text-xs font-black text-white transition disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {updatingPassword ? "Saving Password..." : "Set / Update Password"}
                    </button>
                  </div>
                </section>
              </div>

              <div className="grid gap-6">
                <ProfileSection title="Admin Details">
                  <Field label="Full Name" value={form.ownerName} onChange={(value) => update("ownerName", value)} />
                  <Field label="Email Address" type="email" value={form.ownerEmail} onChange={(value) => update("ownerEmail", value)} />
                  <Field label="Phone Number" value={form.ownerPhone} onChange={(value) => update("ownerPhone", value)} />
                  <Field label="Position / Role" value={form.ownerPosition} onChange={(value) => update("ownerPosition", value)} />
                </ProfileSection>

                <ProfileSection title="Company / Workspace Details">
                  <Field label="Company / Workspace Name" value={form.workspaceName} onChange={(value) => update("workspaceName", value)} />
                  <Field label="Industry" value={form.industry} onChange={(value) => update("industry", value)} />
                  <Field label="Team Size" value={form.teamSize} onChange={(value) => update("teamSize", value)} />
                  <Field label="Company Address" value={form.companyAddress} onChange={(value) => update("companyAddress", value)} />
                  <Field label="Contact Number" value={form.contactNumber} onChange={(value) => update("contactNumber", value)} />
                  <Field label="Workspace Code" value={form.workspaceCode} onChange={(value) => update("workspaceCode", value)} />
                </ProfileSection>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => navigate("/admin-dashboard")}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/10 px-5 text-sm font-black text-slate-200 transition hover:bg-white/5"
              >
                <X size={17} />
                Cancel
              </button>
              <button type="submit" className="glow-button inline-flex h-12 items-center justify-center gap-2 rounded-xl px-6 text-sm font-black text-white">
                <Save size={17} />
                Save Changes
              </button>
            </div>
          </form>
        </motion.main>
      </DashboardShell>
    </PageTransition>
  );
}

function ProfileSection({ children, title }) {
  return (
    <section className="glass-panel rounded-2xl p-6">
      <h2 className="text-lg font-black text-white">{title}</h2>
      <div className="mt-5 grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({ label, onChange, type = "text", value }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-slate-300">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 rounded-xl border border-white/10 bg-white/[0.035] px-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/60 focus:bg-cyan-300/[0.055]"
      />
    </label>
  );
}

export default AdminProfilePage;
