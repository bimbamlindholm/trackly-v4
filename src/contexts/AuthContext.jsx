/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { defaultPermissions } from "../utils/permissions";
import { localDb, supabaseConfigured } from "../lib/supabaseClient";

const AuthContext = createContext(null);

const roleRedirects = {
  admin: "/admin-dashboard",
  employee: "/employee-dashboard",
  personal: "/personal-dashboard",
};

export function getRedirectPathByRole(role) {
  return roleRedirects[role] || "/personal-dashboard";
}

function uid(prefix = "id") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function cleanEmail(email = "") {
  return email.trim().toLowerCase();
}

function getSessionUser(db) {
  const id = localStorage.getItem("trackly_local_session_user_id");
  return db.users.find((u) => u.id === id) || null;
}

function getProfile(db, userId) {
  return db.profiles.find((p) => p.id === userId) || null;
}

function getMemberships(db, userId) {
  return db.workspace_members.filter((m) => m.user_id === userId && m.status === "active");
}

function getWorkspacesForUser(db, userId) {
  const memberships = getMemberships(db, userId);
  return memberships.map((m) => db.workspaces.find((w) => w.id === m.workspace_id)).filter(Boolean);
}

function getActiveWorkspaceBundle(db, userId, preferredRole) {
  const memberships = getMemberships(db, userId);
  const savedId = localStorage.getItem("trackly_active_workspace_id");
  let membership = null;

  if (preferredRole === "admin") membership = memberships.find((m) => ["admin", "owner"].includes(m.role));
  if (preferredRole === "employee") membership = memberships.find((m) => m.role === "employee");
  if (!membership && savedId) membership = memberships.find((m) => m.workspace_id === savedId);
  if (!membership) membership = memberships[0] || null;

  const workspace = membership ? db.workspaces.find((w) => w.id === membership.workspace_id) : null;
  if (workspace) localStorage.setItem("trackly_active_workspace_id", workspace.id);

  const permissions = workspace ? db.employee_permissions.find((p) => p.workspace_id === workspace.id) || defaultPermissions : defaultPermissions;
  return { workspace, membership, permissions };
}

function publicUser(user) {
  if (!user) return null;
  const { password, ...safe } = user;
  return safe;
}

function generateWorkspaceCode(db) {
  for (let i = 0; i < 20; i += 1) {
    const code = `TRK-${Math.floor(1000 + Math.random() * 9000)}`;
    if (!db.workspaces.some((w) => w.workspace_code === code)) return code;
  }
  return `TRK-${Date.now().toString().slice(-5)}`;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [workspace, setWorkspace] = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
  const [membership, setMembership] = useState(null);
  const [permissions, setPermissionsState] = useState(defaultPermissions);
  const [loading, setLoading] = useState(true);
  const [preferredRole, setPreferredRole] = useState(null);

  const hydrate = (roleHint = preferredRole) => {
    const db = localDb.read();
    const sessionUser = getSessionUser(db);
    if (!sessionUser) {
      setUser(null); setProfile(null); setWorkspace(null); setWorkspaces([]); setMembership(null); setPermissionsState(defaultPermissions);
      return null;
    }
    const nextProfile = getProfile(db, sessionUser.id);
    const list = getWorkspacesForUser(db, sessionUser.id);
    const bundle = getActiveWorkspaceBundle(db, sessionUser.id, roleHint || nextProfile?.role);
    setUser(publicUser(sessionUser));
    setProfile(nextProfile);
    setWorkspaces(list);
    setWorkspace(bundle.workspace);
    setMembership(bundle.membership);
    setPermissionsState(bundle.permissions || defaultPermissions);
    return { user: publicUser(sessionUser), profile: nextProfile, workspaces: list, ...bundle };
  };

  useEffect(() => {
    hydrate();
    setLoading(false);
    const listener = () => hydrate();
    window.addEventListener("trackly-local-db-change", listener);
    return () => window.removeEventListener("trackly-local-db-change", listener);
  }, []);

  const upsertProfile = (db, userId, values) => {
    const current = db.profiles.find((p) => p.id === userId);
    const next = {
      id: userId,
      ...current,
      full_name: values.fullName || values.full_name || current?.full_name || "Trackly User",
      email: values.email || current?.email || "",
      role: values.role || current?.role || "personal",
      phone: values.phone || current?.phone || "",
      address: values.address || current?.address || "",
      department: values.department || current?.department || "",
      position: values.position || current?.position || "",
      employee_id: values.employeeId || values.employee_id || current?.employee_id || "",
      face_photo: values.face_photo || values.facePhoto || current?.face_photo || "",
      updated_at: new Date().toISOString(),
    };
    const idx = db.profiles.findIndex((p) => p.id === userId);
    if (idx >= 0) db.profiles[idx] = next; else db.profiles.push(next);
    return next;
  };

  const registerPersonal = async (values) => {
    setLoading(true);
    try {
      const db = localDb.read();
      const email = cleanEmail(values.email);
      if (db.users.some((u) => cleanEmail(u.email) === email)) throw new Error("Email is already registered. Please log in instead.");
      const nextUser = { id: uid("user"), email, password: values.password, user_metadata: { full_name: values.fullName } };
      db.users.push(nextUser);
      upsertProfile(db, nextUser.id, { ...values, email, role: "personal" });
      localDb.write(db);
      localStorage.setItem("trackly_local_session_user_id", nextUser.id);
      setPreferredRole("personal");
      hydrate("personal");
      return { redirectTo: "/personal-dashboard" };
    } finally { setLoading(false); }
  };

  const registerAdmin = async (adminValues, workspaceValues) => {
    setLoading(true);
    try {
      const db = localDb.read();
      const email = cleanEmail(adminValues.email);
      let nextUser = db.users.find((u) => cleanEmail(u.email) === email);
      if (!nextUser) {
        nextUser = { id: uid("user"), email, password: adminValues.password, user_metadata: { full_name: adminValues.fullName } };
        db.users.push(nextUser);
      } else if (nextUser.password !== adminValues.password) {
        throw new Error("This email exists. Enter the correct password to create/manage a workspace.");
      }
      const profileData = upsertProfile(db, nextUser.id, { ...adminValues, email, role: "admin" });
      const ws = {
        id: uid("workspace"), workspace_name: workspaceValues.workspaceName || `${adminValues.fullName}'s Workspace`, workspace_code: generateWorkspaceCode(db), owner_id: nextUser.id,
        industry: workspaceValues.industry || "General", team_size: workspaceValues.teamSize || "1-10", company_address: workspaceValues.companyAddress || "",
        contact_number: workspaceValues.contactNumber || adminValues.phone || "", salary_model: workspaceValues.salaryModel || "hourly",
        default_hourly_rate: Number(workspaceValues.hourlyRate || 75), default_daily_rate: Number(workspaceValues.dailyRate || 600), expected_work_hours: Number(workspaceValues.expectedWorkHours || 8),
        payroll_period: workspaceValues.payrollPeriod || "semi-monthly", late_grace_minutes: Number(workspaceValues.lateGraceMinutes || 10), overtime_rate: 1.25,
        break_hours: 1, break_is_paid: false, geofence_enabled: false, camera_attendance_enabled: true, face_matching_enabled: false,
        require_admin_payslip_release: true, subscription_status: "active", created_at: new Date().toISOString(),
      };
      db.workspaces.push(ws);
      db.workspace_members.push({ id: uid("mem"), workspace_id: ws.id, user_id: nextUser.id, role: "admin", status: "active", joined_at: new Date().toISOString() });
      db.employee_permissions.push({ id: uid("perm"), workspace_id: ws.id, ...defaultPermissions });
      localDb.write(db);
      localStorage.setItem("trackly_local_session_user_id", nextUser.id);
      localStorage.setItem("trackly_active_workspace_id", ws.id);
      setPreferredRole("admin");
      hydrate("admin");
      return { profile: profileData, workspace: ws, redirectTo: "/admin-dashboard" };
    } finally { setLoading(false); }
  };

  const validateWorkspaceCode = async (workspaceCode) => {
    const code = workspaceCode.trim().toUpperCase();
    const ws = localDb.read().workspaces.find((w) => w.workspace_code?.toUpperCase() === code);
    if (!ws) throw new Error("Workspace code not found. Demo code: TRK-2026");
    return ws;
  };

  const connectPersonalAccountToWorkspace = async (workspaceCode, values = {}) => {
    if (!user) throw new Error("You must log in first.");
    setLoading(true);
    try {
      const db = localDb.read();
      const ws = await validateWorkspaceCode(workspaceCode);
      upsertProfile(db, user.id, { ...values, role: "employee", email: profile?.email || user.email, fullName: values.fullName || profile?.full_name });
      const existing = db.workspace_members.find((m) => m.workspace_id === ws.id && m.user_id === user.id);
      if (existing) Object.assign(existing, { role: "employee", status: "active" });
      else db.workspace_members.push({ id: uid("mem"), workspace_id: ws.id, user_id: user.id, role: "employee", status: "active", joined_at: new Date().toISOString() });
      db.audit_logs.push({ id: uid("audit"), workspace_id: ws.id, user_id: user.id, action: "workspace_connected", details: { mode: "personal_to_employee" }, created_at: new Date().toISOString() });
      localDb.write(db);
      localStorage.setItem("trackly_active_workspace_id", ws.id);
      setPreferredRole("employee");
      hydrate("employee");
      return { workspace: ws, redirectTo: "/employee-dashboard" };
    } finally { setLoading(false); }
  };

  const registerEmployee = async (workspaceCode, employeeValues) => {
    setLoading(true);
    try {
      const db = localDb.read();
      const ws = await validateWorkspaceCode(workspaceCode);
      const email = cleanEmail(employeeValues.email);
      let nextUser = db.users.find((u) => cleanEmail(u.email) === email);
      if (!nextUser) {
        nextUser = { id: uid("user"), email, password: employeeValues.password, user_metadata: { full_name: employeeValues.fullName } };
        db.users.push(nextUser);
      }
      upsertProfile(db, nextUser.id, { ...employeeValues, email, role: "employee" });
      const existing = db.workspace_members.find((m) => m.workspace_id === ws.id && m.user_id === nextUser.id);
      if (existing) Object.assign(existing, { role: "employee", status: "active" });
      else db.workspace_members.push({ id: uid("mem"), workspace_id: ws.id, user_id: nextUser.id, role: "employee", status: "active", joined_at: new Date().toISOString() });
      localDb.write(db);
      localStorage.setItem("trackly_local_session_user_id", nextUser.id);
      localStorage.setItem("trackly_active_workspace_id", ws.id);
      setPreferredRole("employee");
      hydrate("employee");
      return { redirectTo: "/employee-dashboard" };
    } finally { setLoading(false); }
  };

  const login = async ({ email, password, expectedRole }) => {
    setLoading(true);
    try {
      const db = localDb.read();
      const found = db.users.find((u) => cleanEmail(u.email) === cleanEmail(email) && u.password === password);
      if (!found) throw new Error("Invalid login credentials. Use demo password: password123");
      const profileData = getProfile(db, found.id);
      const memberships = getMemberships(db, found.id);
      if (expectedRole === "admin" && !memberships.some((m) => ["admin", "owner"].includes(m.role))) throw new Error("This account has no admin workspace.");
      if (expectedRole === "employee" && !memberships.some((m) => m.role === "employee")) throw new Error("This personal account is not connected to a workspace yet.");
      localStorage.setItem("trackly_local_session_user_id", found.id);
      setPreferredRole(expectedRole || profileData?.role || "personal");
      hydrate(expectedRole || profileData?.role);
      return getRedirectPathByRole(expectedRole || profileData?.role || "personal");
    } finally { setLoading(false); }
  };

  const logout = async () => {
    localStorage.removeItem("trackly_local_session_user_id");
    localStorage.removeItem("trackly_active_workspace_id");
    setPreferredRole(null);
    hydrate(null);
  };

  const updateProfile = async (values) => {
    const db = localDb.read();
    const updated = upsertProfile(db, user.id, { ...values, role: profile?.role });
    localDb.write(db); hydrate(preferredRole); return updated;
  };

  const updateWorkspace = async (values) => {
    if (!workspace?.id) throw new Error("No workspace loaded.");
    const db = localDb.read();
    const idx = db.workspaces.findIndex((w) => w.id === workspace.id);
    const next = { ...db.workspaces[idx], ...values, workspace_name: values.workspaceName || values.workspace_name || db.workspaces[idx].workspace_name, updated_at: new Date().toISOString() };
    db.workspaces[idx] = next;
    localDb.write(db); hydrate(preferredRole); return next;
  };

  const updatePermissions = async (nextPermissions) => {
    if (!workspace?.id) throw new Error("No workspace loaded.");
    const db = localDb.read();
    const idx = db.employee_permissions.findIndex((p) => p.workspace_id === workspace.id);
    const next = { id: db.employee_permissions[idx]?.id || uid("perm"), workspace_id: workspace.id, ...nextPermissions };
    if (idx >= 0) db.employee_permissions[idx] = next; else db.employee_permissions.push(next);
    localDb.write(db); setPermissionsState(next); return next;
  };

  const switchWorkspace = async (workspaceId) => {
    localStorage.setItem("trackly_active_workspace_id", workspaceId);
    return hydrate(preferredRole);
  };

  const disconnectFromWorkspace = async () => {
    if (!user || !workspace?.id) return;
    const db = localDb.read();
    db.workspace_members = db.workspace_members.filter((m) => !(m.workspace_id === workspace.id && m.user_id === user.id && m.role === "employee"));
    upsertProfile(db, user.id, { role: "personal", fullName: profile?.full_name, email: profile?.email });
    db.audit_logs.push({ id: uid("audit"), workspace_id: workspace.id, user_id: user.id, action: "workspace_disconnected", created_at: new Date().toISOString() });
    localDb.write(db);
    localStorage.removeItem("trackly_active_workspace_id");
    setPreferredRole("personal"); hydrate("personal");
  };

  const disabledOAuth = async () => { throw new Error("OAuth is disabled in this pure-local build. Use email/password, then connect Supabase OAuth later."); };
  const updatePassword = async (newPassword) => {
    const db = localDb.read(); const idx = db.users.findIndex((u) => u.id === user.id); db.users[idx].password = newPassword; localDb.write(db); return true;
  };

  const role = preferredRole === "admin" && membership?.role === "admin" ? "admin" : preferredRole === "employee" && membership?.role === "employee" ? "employee" : profile?.role === "admin" && membership?.role === "admin" ? "admin" : profile?.role === "employee" && membership?.role === "employee" ? "employee" : "personal";

  const value = useMemo(() => ({
    currentUser: user, getRedirectPathByRole, loading, login, logout, membership, permissions, profile, refreshSessionData: async () => hydrate(preferredRole), registerAdmin, registerEmployee, registerPersonal,
    role, supabaseConfigured, updatePermissions, updateProfile, updateWorkspace, user, validateWorkspaceCode, workspace, workspaces, switchWorkspace,
    loginWithGoogle: disabledOAuth, linkGoogleIdentity: disabledOAuth, unlinkGoogleIdentity: disabledOAuth, loginWithFacebook: disabledOAuth, linkFacebookIdentity: disabledOAuth, unlinkFacebookIdentity: disabledOAuth,
    completeGoogleRegistration: disabledOAuth, connectPersonalAccountToWorkspace, disconnectFromWorkspace, updatePassword,
  }), [user, profile, workspace, workspaces, membership, permissions, loading, role, preferredRole]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
