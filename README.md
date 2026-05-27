# Trackly Absolute Final Local Build

This package is based on the latest Trackly V3 folder and revised into a **pure-local runnable version**.

It keeps the Trackly product direction:

- every user starts as a Personal Account
- admin creates a Workspace
- admin sends a workspace code
- personal account accepts the code
- the same account becomes Employee Mode for that workspace
- personal/private data stays user-owned
- workspace/work data is admin-controlled

## Run locally

```bash
npm install
npm run dev
```

Open the Vite local URL shown in the terminal.

## Demo accounts

Use these for local testing:

### Admin
Email: `admin@trackly.local`  
Password: `password123`

### Personal
Email: `personal@trackly.local`  
Password: `password123`

### Employee
Email: `employee@trackly.local`  
Password: `password123`

### Workspace code
`TRK-2026`

## Important local-mode notes

- Supabase connection is disabled intentionally.
- Vercel config was removed intentionally.
- Data is stored in browser `localStorage`.
- OAuth buttons are intentionally disabled in local mode.
- SQL files are kept only as reference inside `supabase-reference/`.
- Anti Gravity can use this as a local product foundation, then reconnect Supabase/Vercel later.

## What was changed for this local build

- Replaced Supabase-dependent auth with localStorage auth.
- Added seeded local database.
- Preserved existing Trackly UI/components as much as possible.
- Kept admin login/register free from workspace-code dependency.
- Added local workspace code flow.
- Added personal-to-employee transformation logic.
- Kept workspace/admin/employee route protection.
- Added production handoff notes in `docs/PRODUCTION_HANDOFF.md`.

## Suggested test flow

1. Login as personal.
2. Go to workspace connection/join flow.
3. Enter workspace code `TRK-2026`.
4. Confirm connection.
5. Account should now access Employee Mode.
6. Login as admin.
7. Check workspace, employees, attendance, payroll, schedule, reports, settings.
