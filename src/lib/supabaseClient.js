import { defaultPermissions } from "../utils/permissions";

const DB_KEY = "trackly_local_db_v4";

function uid(prefix = "id") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function seedDb() {
  const adminId = "user_admin_demo";
  const personalId = "user_personal_demo";
  const employeeId = "user_employee_demo";
  const workspaceId = "workspace_inspira_prime";
  return {
    users: [
      { id: adminId, email: "admin@trackly.local", password: "password123", user_metadata: { full_name: "Admin Demo" } },
      { id: personalId, email: "personal@trackly.local", password: "password123", user_metadata: { full_name: "Personal Demo" } },
      { id: employeeId, email: "employee@trackly.local", password: "password123", user_metadata: { full_name: "Employee Demo" } },
    ],
    profiles: [
      { id: adminId, full_name: "Admin Demo", email: "admin@trackly.local", role: "admin", position: "Owner", department: "Operations" },
      { id: personalId, full_name: "Personal Demo", email: "personal@trackly.local", role: "personal", position: "Freelancer", department: "Personal" },
      { id: employeeId, full_name: "Employee Demo", email: "employee@trackly.local", role: "employee", position: "Sales Staff", department: "Retail" },
    ],
    workspaces: [
      {
        id: workspaceId,
        workspace_name: "Inspira Prime International",
        workspace_code: "TRK-2026",
        owner_id: adminId,
        industry: "Retail",
        team_size: "1-10",
        company_address: "Olongapo City",
        contact_number: "",
        salary_model: "hourly",
        default_hourly_rate: 75,
        default_daily_rate: 600,
        expected_work_hours: 8,
        payroll_period: "semi-monthly",
        late_grace_minutes: 10,
        overtime_rate: 1.25,
        break_hours: 1,
        break_is_paid: false,
        geofence_enabled: false,
        camera_attendance_enabled: true,
        face_matching_enabled: false,
        require_admin_payslip_release: true,
        subscription_status: "active",
      },
    ],
    workspace_members: [
      { id: "mem_admin", workspace_id: workspaceId, user_id: adminId, role: "admin", status: "active", joined_at: new Date().toISOString() },
      { id: "mem_employee", workspace_id: workspaceId, user_id: employeeId, role: "employee", status: "active", joined_at: new Date().toISOString() },
    ],
    employee_permissions: [{ id: "perm_default", workspace_id: workspaceId, ...defaultPermissions }],
    schedules: [
      { id: "sched_today", workspace_id: workspaceId, employee_id: employeeId, title: "Regular Shift", start_at: `${todayKey()}T09:00:00`, end_at: `${todayKey()}T18:00:00`, break_minutes: 60, break_is_paid: false, status: "scheduled" },
    ],
    attendance_records: [],
    announcements: [
      { id: "ann_welcome", workspace_id: workspaceId, title: "Welcome to Trackly Local", body: "This is a local-first complete prototype. Supabase/Vercel wiring can be added later.", admin_id: adminId, created_at: new Date().toISOString() },
    ],
    leave_requests: [],
    correction_requests: [],
    holidays: [],
    errands: [],
    audit_logs: [],
    payslips: [],
    payroll_batches: [],
  };
}

function readDb() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const seeded = seedDb();
  localStorage.setItem(DB_KEY, JSON.stringify(seeded));
  return seeded;
}

function writeDb(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
  window.dispatchEvent(new CustomEvent("trackly-local-db-change"));
}

export const localDb = {
  read: readDb,
  write: writeDb,
  uid,
  reset() {
    const seeded = seedDb();
    writeDb(seeded);
    return seeded;
  },
};

function match(row, filters) {
  return filters.every((f) => {
    if (f.op === "eq") return row[f.column] === f.value;
    if (f.op === "neq") return row[f.column] !== f.value;
    if (f.op === "in") return Array.isArray(f.value) && f.value.includes(row[f.column]);
    if (f.op === "gte") return row[f.column] >= f.value;
    if (f.op === "lte") return row[f.column] <= f.value;
    return true;
  });
}

class LocalQuery {
  constructor(table) {
    this.table = table;
    this.filters = [];
    this._limit = null;
    this._single = false;
    this._maybeSingle = false;
    this._order = null;
    this._operation = "select";
    this._payload = null;
  }
  select() { return this; }
  eq(column, value) { this.filters.push({ op: "eq", column, value }); return this; }
  neq(column, value) { this.filters.push({ op: "neq", column, value }); return this; }
  in(column, value) { this.filters.push({ op: "in", column, value }); return this; }
  gte(column, value) { this.filters.push({ op: "gte", column, value }); return this; }
  lte(column, value) { this.filters.push({ op: "lte", column, value }); return this; }
  order(column, options = {}) { this._order = { column, ascending: options.ascending !== false }; return this; }
  limit(value) { this._limit = value; return this; }
  single() { this._single = true; return this; }
  maybeSingle() { this._maybeSingle = true; return this; }
  insert(payload) { this._operation = "insert"; this._payload = payload; return this; }
  update(payload) { this._operation = "update"; this._payload = payload; return this; }
  upsert(payload) { this._operation = "upsert"; this._payload = payload; return this; }
  delete() { this._operation = "delete"; return this; }
  async execute() {
    const db = readDb();
    db[this.table] ||= [];
    let rows = db[this.table];
    let data = null;
    try {
      if (this._operation === "insert") {
        const list = Array.isArray(this._payload) ? this._payload : [this._payload];
        const inserted = list.map((item) => ({ id: item.id || uid(this.table), created_at: item.created_at || new Date().toISOString(), ...item }));
        db[this.table].push(...inserted);
        writeDb(db);
        data = Array.isArray(this._payload) ? inserted : inserted[0];
      } else if (this._operation === "update") {
        const updated = [];
        db[this.table] = rows.map((row) => {
          if (match(row, this.filters)) {
            const next = { ...row, ...this._payload, updated_at: new Date().toISOString() };
            updated.push(next);
            return next;
          }
          return row;
        });
        writeDb(db);
        data = updated;
      } else if (this._operation === "upsert") {
        const list = Array.isArray(this._payload) ? this._payload : [this._payload];
        const upserted = list.map((item) => {
          const idx = db[this.table].findIndex((row) => (item.id && row.id === item.id) || (item.workspace_id && item.user_id && row.workspace_id === item.workspace_id && row.user_id === item.user_id) || (item.workspace_id && row.workspace_id === item.workspace_id && this.table === "employee_permissions"));
          const next = { id: item.id || db[this.table][idx]?.id || uid(this.table), ...db[this.table][idx], ...item, updated_at: new Date().toISOString() };
          if (idx >= 0) db[this.table][idx] = next; else db[this.table].push(next);
          return next;
        });
        writeDb(db);
        data = Array.isArray(this._payload) ? upserted : upserted[0];
      } else if (this._operation === "delete") {
        const removed = rows.filter((row) => match(row, this.filters));
        db[this.table] = rows.filter((row) => !match(row, this.filters));
        writeDb(db);
        data = removed;
      } else {
        data = rows.filter((row) => match(row, this.filters));
      }
      if (Array.isArray(data) && this._order) {
        const { column, ascending } = this._order;
        data = [...data].sort((a, b) => ascending ? String(a[column] ?? "").localeCompare(String(b[column] ?? "")) : String(b[column] ?? "").localeCompare(String(a[column] ?? "")));
      }
      if (Array.isArray(data) && this._limit != null) data = data.slice(0, this._limit);
      if (this._single || this._maybeSingle) data = Array.isArray(data) ? (data[0] || null) : data;
      return { data, error: null, count: Array.isArray(data) ? data.length : data ? 1 : 0 };
    } catch (error) {
      return { data: null, error };
    }
  }
  then(resolve, reject) { return this.execute().then(resolve, reject); }
}

function getCurrentUser() {
  const id = localStorage.getItem("trackly_local_session_user_id");
  if (!id) return null;
  return readDb().users.find((u) => u.id === id) || null;
}

export const supabaseConfigured = false;
export const supabase = {
  from(table) { return new LocalQuery(table); },
  auth: {
    async getSession() {
      const user = getCurrentUser();
      return { data: { session: user ? { user } : null }, error: null };
    },
    onAuthStateChange() {
      return { data: { subscription: { unsubscribe() {} } } };
    },
    async signInWithPassword({ email, password }) {
      const db = readDb();
      const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
      if (!user) return { data: null, error: new Error("Invalid login credentials") };
      localStorage.setItem("trackly_local_session_user_id", user.id);
      return { data: { user, session: { user } }, error: null };
    },
    async signUp({ email, password, options }) {
      const db = readDb();
      const existing = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (existing) return { data: null, error: new Error("User already registered") };
      const user = { id: uid("user"), email, password, user_metadata: options?.data || {} };
      db.users.push(user);
      writeDb(db);
      localStorage.setItem("trackly_local_session_user_id", user.id);
      return { data: { user, session: { user } }, error: null };
    },
    async signOut() {
      localStorage.removeItem("trackly_local_session_user_id");
      return { error: null };
    },
    async updateUser(payload) {
      const user = getCurrentUser();
      if (!user) return { data: null, error: new Error("No active session") };
      const db = readDb();
      const idx = db.users.findIndex((u) => u.id === user.id);
      db.users[idx] = { ...db.users[idx], ...payload };
      writeDb(db);
      return { data: { user: db.users[idx] }, error: null };
    },
    async signInWithOAuth() { return { error: new Error("OAuth is disabled in pure-local mode. Use email/password demo accounts.") }; },
    async linkIdentity() { return { error: new Error("OAuth linking is disabled in pure-local mode.") }; },
    async unlinkIdentity() { return { error: null }; },
  },
};

export function requireSupabase() {
  return supabase;
}
