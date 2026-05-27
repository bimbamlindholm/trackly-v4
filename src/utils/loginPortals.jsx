export const loginPortals = {
  personal: {
    badge: "Personal Portal",
    benefitTitle: "Your Personal Workspace",
    dividerText: "or log in with your personal email",
    fields: [
      {
        label: "Personal Email Address",
        name: "personalEmail",
        placeholder: "Enter your personal email",
        type: "email",
      },
      {
        label: "Password",
        name: "personalPassword",
        placeholder: "Enter your password",
        type: "password",
      },
    ],
    formTitle: "Personal Account Log In",
    googleLabel: "Connect Personal Google Account",
    facebookLabel: "Connect Personal Facebook Account",
    dashboardTo: "/personal-dashboard",
    headline: (
      <>
        Log in to your
        <br />
        personal <span className="gradient-text">time hub</span>.
      </>
    ),
    helperText: "New to personal tracking?",
    primaryWord: "time hub",
    signupLabel: "Create account",
    signupTo: "/register?type=personal",
    subtitle: "Access your personal dashboard, track your hours, and keep your productivity moving.",
    submitLabel: "Log In as Personal",
  },
  workspace: {
    badge: "Workspace Admin Portal",
    benefitTitle: "Admin Control Center",
    dividerText: "or log in with admin credentials",
    fields: [
      {
        label: "Admin Email Address",
        name: "adminEmail",
        placeholder: "Enter your admin email",
        type: "email",
      },
      {
        label: "Password",
        name: "adminPassword",
        placeholder: "Enter your admin password",
        type: "password",
      },
    ],
    formTitle: "Workspace Admin Log In",
    googleLabel: "Connect Workspace Google Account",
    facebookLabel: "Connect Workspace Facebook Account",
    dashboardTo: "/admin-dashboard",
    headline: (
      <>
        Manage your
        <br />
        team <span className="gradient-text">workspace</span>.
      </>
    ),
    helperText: "Need a workspace?",
    primaryWord: "workspace",
    signupLabel: "Create workspace",
    signupTo: "/admin-register",
    subtitle: "Log in as an owner or admin to manage attendance, schedules, reports, and team settings.",
    submitLabel: "Log In as Admin",
  },
  employee: {
    badge: "Employee Portal",
    benefitTitle: "Team Member Access",
    dividerText: "or log in with employee credentials",
    fields: [
      {
        label: "Workspace Code",
        name: "employeeWorkspaceCode",
        placeholder: "Enter workspace code",
        type: "workspace",
      },
      {
        label: "Employee Email Address",
        name: "employeeEmail",
        placeholder: "Enter your employee email",
        type: "email",
      },
      {
        label: "Password",
        name: "employeePassword",
        placeholder: "Enter your password",
        type: "password",
      },
    ],
    formTitle: "Employee Log In",
    googleLabel: "Connect Employee Google Account",
    facebookLabel: "Connect Employee Facebook Account",
    dashboardTo: "/employee-dashboard",
    headline: (
      <>
        Clock in and
        <br />
        stay <span className="gradient-text">connected</span>.
      </>
    ),
    helperText: "Have a workspace code?",
    primaryWord: "connected",
    signupLabel: "Join workspace",
    signupTo: "/join-workspace",
    subtitle: "Access your employee dashboard, time logs, schedules, and assigned workspace updates.",
    submitLabel: "Log In as Employee",
  },
};

export function getLoginPortal(type) {
  return loginPortals[type] || loginPortals.personal;
}
