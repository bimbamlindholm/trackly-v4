# Trackly Production Handoff for Anti Gravity

This build is intentionally pure local. The next production phase should connect it back to Supabase and Vercel.

## Final product rule

Trackly is not three separate account systems.

The correct model is:

1. User registers and becomes a Personal Account by default.
2. Admin creates a Workspace.
3. Admin sends Workspace Code.
4. Personal user accepts Workspace Code.
5. The same personal account becomes connected as Employee Mode under that workspace.
6. Personal/private data remains private.
7. Workspace/work data becomes admin-controlled.

## Database model to implement later

Minimum tables:

- profiles
- workspaces
- workspace_members
- employee_permissions
- schedules
- attendance_records
- payroll_settings
- payroll_batches
- payslips
- deductions
- holidays
- leave_requests
- correction_requests
- announcements
- notifications
- audit_logs
- subscriptions

## Critical policies

- Admin can only manage workspaces they own or administer.
- Employee can only view their own workspace records.
- Personal data must not be exposed to admin unless it is work-related.
- Payslips must be printable/downloadable only after admin release.
- Attendance and payroll changes must create audit logs.

## Local files to replace during Supabase integration

- `src/lib/supabaseClient.js`
- `src/contexts/AuthContext.jsx`
- Supabase utility files in `src/utils/supabase*.js`

## Keep these product decisions

- No workspace-code field on admin login/register.
- Workspace code belongs only to personal-to-employee connection flow.
- Employee Mode is a connected state, not a separate duplicate account.
- Payroll calculation must be protected and tested before any refactor.
- Schedule must support multiple employees and multiple shifts per day.

## Production TODO

1. Create final SQL migrations.
2. Add RLS policies.
3. Replace localStorage DB with Supabase tables.
4. Restore real Supabase Auth.
5. Add Google/Facebook OAuth.
6. Add real file/storage handling for camera/face verification.
7. Add Vercel deployment config.
8. Run build and end-to-end tests.
