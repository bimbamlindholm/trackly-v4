import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import AdminMobileNav from "./AdminMobileNav";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import HelpSystem from "../HelpSystem";

function DashboardShell({ children, workspace }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#050B16] text-slate-50">
      <div className="galaxy-bg" />
      <div className="noise-overlay" />
      <div className="relative z-10 flex min-h-screen">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onLogout={handleLogout}
        />
        <div className="min-w-0 flex-1 lg:pl-[280px]">
          <Topbar onMenuClick={() => setSidebarOpen(true)} workspace={workspace} />
          <div className="pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-0">{children}</div>
        </div>
        <AdminMobileNav />
      </div>
      <HelpSystem role="admin" />
    </div>
  );
}

export default DashboardShell;
