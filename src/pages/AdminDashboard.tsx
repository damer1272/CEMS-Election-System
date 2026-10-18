import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import AppLogo from "../components/AppLogo";
import AdminSidebar from "../components/AdminSidebar";
import DashboardView from "../admin/DashboardView";
import BlockRepsView from "../admin/BlockRepsView";
import CandidatesView from "../admin/CandidatesView";
import ParticipantsView from "../admin/ParticipantsView";
import QRCodesView from "../admin/QRCodesView";
import VotesView from "../admin/VotesView";
import ResultsView from "../admin/ResultsView";
import SettingsView from "../admin/SettingsView";
import UsersView from "../admin/UsersView";
import AuditLogsView from "../admin/AuditLogsView";

const PAGE_COMPONENTS: Record<string, React.ComponentType> = {
  dashboard: DashboardView,
  blockreps: BlockRepsView,
  candidates: CandidatesView,
  participants: ParticipantsView,
  qrcodes: QRCodesView,
  votes: VotesView,
  results: ResultsView,
  settings: SettingsView,
  users: UsersView,
  audit: AuditLogsView,
};

import { refreshFromServer } from "../data/store";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activePage, setActivePage] = useState(() => sessionStorage.getItem("cems_admin_page") || "dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!sessionStorage.getItem("cems_admin")) {
      navigate("/admin/login");
    }
    const iv = setInterval(() => {
      refreshFromServer().catch(() => {});
    }, 1500);
    return () => clearInterval(iv);
  }, [navigate]);

  const navigateTo = (page: string) => {
    setActivePage(page);
    sessionStorage.setItem("cems_admin_page", page);
    setSidebarOpen(false);
  };

  const ActiveView = PAGE_COMPONENTS[activePage] ?? DashboardView;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar — desktop always visible, mobile drawer */}
      <div className={`
        fixed inset-y-0 left-0 z-50 lg:relative lg:z-auto
        transition-transform duration-200
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        flex-shrink-0
      `}>
        <AdminSidebar
          active={activePage}
          onNavigate={navigateTo}
        />
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-200">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition">
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <AppLogo size="sm" className="ring-1 ring-slate-200" />
          <p className="font-bold text-slate-800 text-sm">CEMS Admin</p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <ActiveView />
        </div>
      </div>
    </div>
  );
}
