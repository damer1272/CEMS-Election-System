import { useState, useEffect } from "react";
import { Plus, Shield, ShieldCheck, Trash2, X, Check, AlertCircle, CheckCircle2 } from "lucide-react";
import { getAdminUsers, addAdminUser, deleteAdminUser, saveAndReload, refreshFromServer } from "../data/store";
import type { AdminUser } from "../data/store";

const ROLE_LABELS = { super_admin: "Super Admin", admin: "Admin", viewer: "Viewer" };
const ROLE_COLORS = {
  super_admin: "bg-[#233C4B] text-[#FAC846] border-[#FAC846]/40",
  admin: "bg-[#5F9B8C]/20 text-[#233C4B] border-[#5F9B8C]/40",
  viewer: "bg-slate-100 text-slate-700 border-slate-200",
};

export default function UsersView() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ username: "", password: "", role: "admin" as AdminUser["role"] });
  const [error, setError] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const reload = () => {
    setUsers(getAdminUsers());
  };

  useEffect(() => {
    refreshFromServer().then(() => reload());
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleAdd = async () => {
    setError("");
    const username = form.username.trim().toLowerCase();
    const password = form.password.trim();

    if (!username) {
      setError("Username is required.");
      return;
    }
    if (!password) {
      setError("Password is required.");
      return;
    }
    if (users.some(u => u.username.toLowerCase() === username)) {
      setError(`Username "${username}" already exists.`);
      return;
    }

    addAdminUser({
      username,
      password,
      role: form.role,
    });

    await saveAndReload();
    reload();
    setShowModal(false);
    setForm({ username: "", password: "", role: "admin" });
    showToast(`Created user @${username}`);
  };

  const handleDelete = async (id: string, username: string) => {
    if (username === "admin") {
      alert("The primary super admin account cannot be deleted.");
      return;
    }
    if (!confirm(`Remove admin account "${username}"?`)) return;
    deleteAdminUser(id);
    await saveAndReload();
    reload();
    showToast(`Deleted user @${username}`);
  };

  return (
    <div className="p-6 space-y-6">
      {toast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold bg-[#A0C382]/20 text-[#233C4B] border-[#A0C382]/50 animate-slide-in">
          <CheckCircle2 className="w-4 h-4 text-[#5F9B8C]" />
          <span>{toast}</span>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#233C4B]">Admin Users & Access Roles</h1>
          <p className="text-slate-500 text-sm mt-0.5">{users.length} accounts with access to the election management portal</p>
        </div>
        <button
          onClick={() => {
            setError("");
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-[#FF7D2D] hover:bg-[#EA6C1E] text-white text-sm font-bold px-4 py-2.5 rounded-xl transition shadow-xs"
        >
          <Plus className="w-4 h-4" /> Add Admin User
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="divide-y divide-slate-100">
          {users.map(u => (
            <div key={u.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50/60 transition">
              <div className="w-10 h-10 rounded-xl bg-[#233C4B]/5 flex items-center justify-center flex-shrink-0">
                {u.role === "super_admin" ? <ShieldCheck className="w-5 h-5 text-[#FF7D2D]" /> : <Shield className="w-5 h-5 text-slate-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 text-sm">@{u.username}</p>
                <p className="text-slate-400 text-xs">Created {u.createdAt}</p>
              </div>
              <span className={`text-xs font-bold border rounded-full px-2.5 py-0.5 ${ROLE_COLORS[u.role]}`}>
                {ROLE_LABELS[u.role]}
              </span>
              {u.username !== "admin" ? (
                <button
                  onClick={() => handleDelete(u.id, u.username)}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                  title="Delete user"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              ) : (
                <span className="text-slate-300 text-xs px-2 font-medium">Protected</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-[#233C4B] text-lg">Add Admin Account</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Username *</label>
                <input
                  value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7D2D] focus:border-transparent"
                  placeholder="e.g. comelec_officer"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Password *</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7D2D] focus:border-transparent"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Access Role *</label>
                <select
                  value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value as AdminUser["role"] }))}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7D2D] focus:border-transparent font-medium"
                >
                  <option value="admin">Admin — Full election management access</option>
                  <option value="super_admin">Super Admin — Complete system access</option>
                  <option value="viewer">Viewer — Read-only monitoring</option>
                </select>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-xs font-medium">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAdd}
                className="flex-1 py-2.5 rounded-xl bg-[#FF7D2D] hover:bg-[#EA6C1E] text-white text-sm font-bold transition flex items-center justify-center gap-2 shadow-xs"
              >
                <Check className="w-4 h-4" /> Create User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
