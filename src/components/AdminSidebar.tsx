import { useNavigate } from "react-router-dom";
import AppLogo from "../components/AppLogo";
import {
  LayoutDashboard, UserCheck, Users, QrCode, Vote, BarChart2,
  Settings, Shield, ClipboardList, LogOut, Award
} from "lucide-react";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "blockreps", label: "Block Representatives", icon: UserCheck },
  { id: "candidates", label: "CSG Candidates", icon: Award },
  { id: "participants", label: "Voters / Students", icon: Users },
  { id: "qrcodes", label: "QR Codes", icon: QrCode },
  { id: "votes", label: "Vote Log", icon: Vote },
  { id: "results", label: "Live Results", icon: BarChart2 },
  { id: "settings", label: "Election & Schedules", icon: Settings },
  { id: "users", label: "Admin Users", icon: Shield },
  { id: "audit", label: "Audit Logs", icon: ClipboardList },
];

interface Props {
  active: string;
  onNavigate: (page: string) => void;
  collapsed?: boolean;
}

export default function AdminSidebar({ active, onNavigate, collapsed }: Props) {
  const navigate = useNavigate();

  const handleLogout = () => {
    sessionStorage.removeItem("cems_admin");
    navigate("/admin/login");
  };

  const adminUser = (() => {
    try {
      const raw = sessionStorage.getItem("cems_admin_user");
      return raw ? JSON.parse(raw) : { username: "admin", role: "super_admin" };
    } catch {
      return { username: "admin", role: "super_admin" };
    }
  })();

  return (
    <div className={`bg-white border-r border-slate-200 flex flex-col h-full transition-all duration-200 ${collapsed ? "w-16" : "w-60"}`}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-100 flex-shrink-0">
        <AppLogo size="sm" className="ring-1 ring-slate-200" />
        {!collapsed && (
          <div className="min-w-0">
            <p className="font-bold text-slate-800 text-sm leading-tight">CEMS</p>
            <p className="text-slate-400 text-xs truncate">Parliamentary System</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            className={`sidebar-link ${active === id ? "active" : ""} ${collapsed ? "justify-center px-0" : ""}`}
            title={collapsed ? label : undefined}
          >
            <Icon className="w-4.5 h-4.5 flex-shrink-0" />
            {!collapsed && <span>{label}</span>}
          </button>
        ))}
      </nav>

      {/* User info & Logout */}
      <div className="p-3 border-t border-slate-100 flex-shrink-0 space-y-2">
        {!collapsed && (
          <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800 truncate">@{adminUser.username}</p>
              <p className="text-[10px] text-slate-400 capitalize">{adminUser.role.replace("_", " ")}</p>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-500" title="Online" />
          </div>
        )}

        <button
          onClick={handleLogout}
          className={`sidebar-link text-red-500 hover:bg-red-50 hover:text-red-600 w-full ${collapsed ? "justify-center" : ""}`}
          title={collapsed ? "Logout" : undefined}
        >
          <LogOut className="w-4.5 h-4.5 flex-shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );
}
