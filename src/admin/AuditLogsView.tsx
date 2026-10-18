import { useEffect, useState } from "react";
import { getAuditLogs, refreshFromServer, subscribeToStore } from "../data/store";
import type { AuditLog } from "../data/store";
import { ClipboardList, Download, Search } from "lucide-react";

const ACTION_COLORS: Record<string, string> = {
  "Vote Cast": "bg-[#A0C382]/20 text-[#233C4B] border-[#A0C382]/50",
  "Election Opened": "bg-[#5F9B8C]/20 text-[#233C4B] border-[#5F9B8C]/50",
  "Election Closed": "bg-red-50 text-red-700 border-red-200",
  "Candidate Added": "bg-[#FF7D2D]/15 text-[#233C4B] border-[#FF7D2D]/30",
  "Participants Imported": "bg-[#FAC846]/20 text-[#233C4B] border-[#FAC846]/40",
  "Settings Updated": "bg-slate-100 text-slate-700 border-slate-200",
  "Parliamentary Stage Changed": "bg-[#233C4B] text-[#FAC846] border-[#FAC846]/30",
  "Advanced Top Candidates to Stage 2": "bg-[#A0C382]/25 text-[#233C4B] border-[#A0C382]/60",
  "Stage 1 Winners Advanced to CSG Candidates": "bg-[#A0C382]/25 text-[#233C4B] border-[#A0C382]/60",
  "Block Representative Registered": "bg-[#233C4B]/10 text-[#233C4B] border-[#233C4B]/20",
  "Nominated to CSG Ballot": "bg-[#FF7D2D]/15 text-[#233C4B] border-[#FF7D2D]/30",
  "Student Registered via Portal": "bg-[#5F9B8C]/20 text-[#233C4B] border-[#5F9B8C]/50",
  "Automatic Stage 2 Advancement": "bg-[#FF7D2D]/20 text-[#233C4B] border-[#FF7D2D]/50",
  "Automatic Election Concluded": "bg-[#A0C382]/25 text-[#233C4B] border-[#A0C382]/60",
};

export default function AuditLogsView() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const refresh = () => setLogs(getAuditLogs());
    refresh();
    const unsubscribe = subscribeToStore(refresh);
    const iv = setInterval(() => {
      refreshFromServer().then(refresh).catch(() => {});
    }, 1500);
    return () => {
      unsubscribe();
      clearInterval(iv);
    };
  }, []);

  const filtered = logs.filter(l =>
    l.action.toLowerCase().includes(search.toLowerCase()) ||
    l.performedBy.toLowerCase().includes(search.toLowerCase()) ||
    l.details.toLowerCase().includes(search.toLowerCase())
  );

  const handleExportCSV = () => {
    const header = "Event ID,Action,Performed By,Details,Timestamp";
    const rows = logs.map(l => `"${l.id}","${l.action}","${l.performedBy}","${l.details.replace(/"/g, '""')}","${l.timestamp}"`);
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit_logs_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#233C4B]">Security & Parliamentary Audit Logs</h1>
          <p className="text-slate-500 text-sm mt-0.5">{logs.length} immutable events recorded · live real-time sync</p>
        </div>
        <button
          onClick={handleExportCSV}
          disabled={logs.length === 0}
          className="flex items-center gap-2 border border-slate-300 text-slate-700 text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-slate-50 transition shadow-xs disabled:opacity-40"
        >
          <Download className="w-4 h-4 text-slate-500" /> Export Logs CSV
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 flex items-center gap-3">
          <div className="flex-1 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search audit logs by action, performer, details..."
              className="w-full text-sm bg-transparent text-slate-800 focus:outline-none placeholder:text-slate-400"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <ClipboardList className="w-12 h-12 text-slate-300 mb-3" />
            <p className="text-slate-500 text-sm">
              {logs.length === 0 ? "No audit events recorded yet." : "No logs match the search query."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Time</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Action</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Performed By</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(log => {
                  const badgeColor = Object.entries(ACTION_COLORS).find(([k]) => log.action.includes(k))?.[1] || "bg-slate-100 text-slate-700 border-slate-200";
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3.5 text-xs font-mono text-slate-400 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`text-xs font-bold border rounded-full px-2.5 py-0.5 ${badgeColor}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-[#233C4B] font-bold">{log.performedBy}</td>
                      <td className="px-4 py-3.5 text-sm text-slate-600">{log.details}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
