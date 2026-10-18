import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, ArrowLeft, ShieldCheck } from "lucide-react";
import AppLogo from "../components/AppLogo";
import { authenticateAdmin } from "../data/store";

export default function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError("Please enter both username and password.");
      return;
    }
    const admin = authenticateAdmin(username.trim(), password);
    if (admin) {
      sessionStorage.setItem("cems_admin", "true");
      sessionStorage.setItem("cems_admin_user", JSON.stringify({ username: admin.username, role: admin.role }));
      navigate("/admin");
    } else {
      setError("Invalid username or password. Default: admin / admin123");
    }
  };

  return (
    <div className="min-h-screen bg-[#233C4B] flex items-center justify-center p-6 text-slate-800 relative overflow-hidden">
      {/* Subtle background minimalist accents */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#5F9B8C]/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-[#FF7D2D]/15 blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 mb-4 shadow-xl">
            <AppLogo size="lg" className="rounded-xl" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">CEMS Election Portal</h1>
          <p className="text-slate-300 text-xs mt-1 font-medium">Pagadian Capitol College · Admin Access</p>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 p-8">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#233C4B] mb-1.5">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={e => { setUsername(e.target.value); setError(""); }}
                placeholder="admin"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7D2D]/40 focus:border-[#FF7D2D] transition bg-slate-50/50"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#233C4B] mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(""); }}
                placeholder="••••••••"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7D2D]/40 focus:border-[#FF7D2D] transition bg-slate-50/50"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 text-[#FF7D2D] bg-[#FFF2EA] border border-[#FF7D2D]/30 rounded-xl px-3.5 py-2.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p className="text-xs font-medium">{error}</p>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-[#233C4B] hover:bg-[#192B36] text-white font-bold py-3 rounded-xl transition text-sm shadow-md flex items-center justify-center gap-2 mt-2 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-[#FAC846]" />
              Sign In to Management
            </button>
          </form>
        </div>

        <p className="text-center mt-6">
          <a
            href="/"
            className="inline-flex items-center gap-1.5 text-slate-300 hover:text-white transition text-xs font-semibold"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Election Display
          </a>
        </p>
      </div>
    </div>
  );
}

