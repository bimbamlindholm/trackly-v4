import { AnimatePresence } from "framer-motion";
import { Route, Routes, useLocation } from "react-router-dom";
import AdminDashboardPage from "../pages/AdminDashboardPage";
import AdminCorrectionsPage from "../pages/AdminCorrectionsPage";
import AdminModulePage from "../pages/AdminModulePage";
import AdminNotificationsPage from "../pages/AdminNotificationsPage";
import AdminProfilePage from "../pages/AdminProfilePage";
import AdminRegisterPage from "../pages/AdminRegisterPage";
import AdminSettingsPage from "../pages/AdminSettingsPage";
import AdminWorkspacePage from "../pages/AdminWorkspacePage";
import AdminWorkspaceSetupPage from "../pages/AdminWorkspaceSetupPage";
import ChooseAccountTypePage from "../pages/ChooseAccountTypePage";
import ChooseTeamRolePage from "../pages/ChooseTeamRolePage";
import JoinWorkspacePage from "../pages/JoinWorkspacePage";
import LandingPage from "../pages/LandingPage";
import LoginPage from "../pages/LoginPage";
import PersonalDashboardPage from "../pages/PersonalDashboardPage";
import RegisterPage from "../pages/RegisterPage";
import EmployeeDashboardPage from "../pages/EmployeeDashboardPage";
import ForgotPasswordPage from "../pages/ForgotPasswordPage";
import ResetPasswordPage from "../pages/ResetPasswordPage";
import CompleteRegistrationPage from "../pages/CompleteRegistrationPage";
import TermsPage from "../pages/TermsPage";
import PrivacyPage from "../pages/PrivacyPage";
import ProtectedRoute from "./ProtectedRoute";

function AppRoutes() {
  const location = useLocation();

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#07111F]">
      <AnimatePresence mode="wait" initial={false}>
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/choose-account-type" element={<ChooseAccountTypePage />} />
          <Route path="/team-role" element={<ChooseTeamRolePage />} />
          <Route path="/admin-register" element={<AdminRegisterPage />} />
          <Route path="/admin-workspace-setup" element={<AdminWorkspaceSetupPage />} />
          <Route path="/admin-dashboard" element={<ProtectedRoute allowedRoles={["admin"]}><AdminDashboardPage /></ProtectedRoute>} />
          <Route path="/admin-dashboard/employees" element={<ProtectedRoute allowedRoles={["admin"]}><AdminModulePage module="employees" /></ProtectedRoute>} />
          <Route path="/admin-dashboard/attendance" element={<ProtectedRoute allowedRoles={["admin"]}><AdminModulePage module="attendance" /></ProtectedRoute>} />
          <Route path="/admin-dashboard/reports" element={<ProtectedRoute allowedRoles={["admin"]}><AdminModulePage module="reports" /></ProtectedRoute>} />
          <Route path="/admin-dashboard/payroll" element={<ProtectedRoute allowedRoles={["admin"]}><AdminModulePage module="payroll" /></ProtectedRoute>} />
          <Route path="/admin-dashboard/schedule" element={<ProtectedRoute allowedRoles={["admin"]}><AdminModulePage module="schedule" /></ProtectedRoute>} />
          <Route path="/admin-dashboard/leaves" element={<ProtectedRoute allowedRoles={["admin"]}><AdminModulePage module="leaves" /></ProtectedRoute>} />
          <Route path="/admin-dashboard/settings" element={<ProtectedRoute allowedRoles={["admin"]}><AdminSettingsPage /></ProtectedRoute>} />
          <Route path="/admin-dashboard/profile" element={<ProtectedRoute allowedRoles={["admin"]}><AdminProfilePage /></ProtectedRoute>} />
          <Route path="/admin-dashboard/corrections" element={<ProtectedRoute allowedRoles={["admin"]}><AdminCorrectionsPage /></ProtectedRoute>} />
          <Route path="/admin-dashboard/notifications" element={<ProtectedRoute allowedRoles={["admin"]}><AdminNotificationsPage /></ProtectedRoute>} />
          <Route path="/admin-dashboard/workspace" element={<ProtectedRoute allowedRoles={["admin"]}><AdminWorkspacePage /></ProtectedRoute>} />
          <Route path="/employee-dashboard" element={<ProtectedRoute allowedRoles={["employee"]}><EmployeeDashboardPage /></ProtectedRoute>} />
          <Route path="/personal-dashboard" element={<ProtectedRoute allowedRoles={["personal", "employee"]}><PersonalDashboardPage /></ProtectedRoute>} />
          <Route path="/join-workspace" element={<JoinWorkspacePage />} />
          <Route path="/personal-login" element={<LoginPage portalType="personal" />} />
          <Route path="/workspace-login" element={<LoginPage portalType="workspace" />} />
          <Route path="/employee-login" element={<LoginPage portalType="employee" />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/complete-registration" element={<CompleteRegistrationPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
        </Routes>
      </AnimatePresence>
    </div>
  );
}

export default AppRoutes;
