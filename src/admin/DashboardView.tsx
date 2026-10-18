import { useEffect, useState } from "react";
import { Users, UserCheck, Clock, Award, TrendingUp, Sparkles, AlertCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import {
  getCandidates, getVotesCast, getTotalVoters,
  getRemainingVoters, getAuditLogs, getLeaderboard, getSettings, refreshFromServer, getBlockReps
} from "../data/store";

const CHART_COLORS = ["#233C4B", "#FF7D2D", "#FAC846", "#5F9B8C", "#A0C382", "#325368"];

export default function DashboardView() {
  const [stats, setStats] = useState({ total: 0, cast: 0, remaining: 0, candidates: 0, blockReps: 0 });
  const [chartData, setChartData] = useState<{ position: string; leader: string; votes: number }[]>([]);
  const [activity, setActivity] = useState<{ id: string; action: string; details: string; timestamp: string; performedBy: string }[]>([]);
  const [settings, setSettings] = useState(() => getSettings());

  useEffect(() => {
    const refresh = async () => {
      await refreshFromServer();
      setStats({
        total: getTotalVoters(),
        cast: getVotesCast(),
        remaining: getRemainingVoters(),
        candidates: getCandidates().length,
        blockReps: getBlockReps().length,
      });
      setSettings(getSettings());
      const lb = getLeaderboard();
      setChartData(lb.map(({ position, candidates }) => {
        const topCandidate = candidates[0];
        const votes = (settings.currentStage === "STAGE_2_FINAL" || settings.currentStage === "COMPLETED")
          ? (topCandidate?.stage2Votes ?? topCandidate?.votes ?? 0)
          : (topCandidate?.stage1Votes ?? topCandidate?.votes ?? 0);
        return {
          position: position.replace(" ", "\n"),
          leader: votes > 0 ? (topCandidate?.name ?? "No votes yet") : "No votes yet",
          votes: votes > 0 ? votes : 0,
        };
      }));
      setActivity(getAuditLogs().slice(0, 8));
    };
    refresh();
    const iv = setInterval(refresh, 3000);
    return () => clearInterval(iv);
  }, [settings.currentStage]);

  const turnout = stats.total > 0 ? Math.round((stats.cast / stats.total) * 100) : 0;

  const statCards = [
    { label: "Block Representatives", value: stats.blockReps, icon: UserCheck, color: "#233C4B", bg: "bg-[#233C4B]/5", border: "border-[#233C4B]/15", text: "text-[#233C4B]" },
    { label: "CSG Candidates", value: stats.candidates, icon: Award, color: "#FF7D2D", bg: "bg-[#FF7D2D]/5", border: "border-[#FF7D2D]/20", text: "text-[#FF7D2D]" },
    { label: "Votes Cast", value: stats.cast, icon: Users, color: "#5F9B8C", bg: "bg-[#5F9B8C]/5", border: "border-[#5F9B8C]/20", text: "text-[#5F9B8C]" },
    { label: "Voters Pending", value: stats.remaining, icon: Clock, color: "#FAC846", bg: "bg-[#FAC846]/10", border: "border-[#FAC846]/30", text: "text-[#B38600]" },
  ];

  const getStageBadge = () => {
    switch (settings.currentStage) {
      case "STAGE_1_NOMINATION": return { text: "Stage 1: Primary Nominee Election", bg: "bg-[#5F9B8C]/10 text-[#5F9B8C] border-[#5F9B8C]/30" };
      case "STAGE_2_FINAL": return { text: "Stage 2: Final Executive Election (Top 2)", bg: "bg-[#FF7D2D]/10 text-[#FF7D2D] border-[#FF7D2D]/30" };
      case "COMPLETED": return { text: "Parliamentary Election Completed", bg: "bg-[#A0C382]/20 text-[#385B28] border-[#A0C382]/40" };
      default: return { text: "Stage 0: Block Representatives Roster", bg: "bg-[#233C4B]/10 text-[#233C4B] border-[#233C4B]/20" };
    }
  };

  const badge = getStageBadge();

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header & Stage Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#233C4B] tracking-tight">Parliamentary Dashboard</h1>
          <p className="text-slate-500 text-xs mt-0.5">Real-time election monitor · Fresh database initialized</p>
        </div>

        <div className={`px-4 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 ${badge.bg}`}>
          <Sparkles className="w-4 h-4" />
          <span>{badge.text}</span>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, bg, border, text }) => (
          <div key={label} className={`${bg} ${border} rounded-2xl p-5 border shadow-sm transition hover:shadow`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500">{label}</span>
              <div className="w-8 h-8 rounded-lg bg-white/80 flex items-center justify-center shadow-xs">
                <Icon className={`w-4 h-4 ${text}`} />
              </div>
            </div>
            <p className="text-3xl font-bold text-[#233C4B]">{value}</p>
          </div>
        ))}
      </div>

      {/* Turnout + Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-[#FF7D2D]" />
              <h2 className="font-bold text-[#233C4B] text-sm">Voter Turnout</h2>
            </div>
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-5xl font-bold text-[#233C4B]">{turnout}</span>
              <span className="text-[#FF7D2D] font-bold text-xl">%</span>
            </div>
          </div>
          <div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="h-2.5 rounded-full bg-[#FF7D2D] progress-fill"
                style={{ width: `${turnout}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-500 mt-3 font-medium">
              <span>{stats.cast} voted</span>
              <span>{stats.remaining} pending</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 col-span-2 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-[#233C4B] text-sm">
              Position Vote Leaders
            </h2>
            <span className="text-xs text-slate-400 font-medium">
              {settings.currentStage === "STAGE_2_FINAL" ? "Stage 2 Final Votes" : "Stage 1 Primary Votes"}
            </span>
          </div>
          {stats.candidates === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center text-center text-slate-400">
              <AlertCircle className="w-8 h-8 mb-2 text-slate-300" />
              <p className="text-xs font-medium">No candidates registered yet.</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Input Block Representatives to begin nomination.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chartData} barSize={26}>
                <XAxis dataKey="position" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid #e2e8f0", backgroundColor: "#ffffff" }}
                  formatter={(value, _, props) => [value, props.payload.leader]}
                />
                <Bar dataKey="votes" radius={[6, 6, 0, 0]}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Audit Activity */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
        <h2 className="font-bold text-[#233C4B] text-sm mb-4">Recent Audit Activity</h2>
        <div className="space-y-3">
          {activity.map(log => (
            <div key={log.id} className="flex items-start gap-3 py-1">
              <div className="w-2 h-2 rounded-full bg-[#FF7D2D] mt-1.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[#233C4B] text-xs font-bold">{log.action}</p>
                <p className="text-slate-400 text-xs truncate">{log.details}</p>
              </div>
              <p className="text-slate-400 text-xs flex-shrink-0 font-mono">{new Date(log.timestamp).toLocaleTimeString()}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

