import { useEffect, useState } from "react";
import {
  getLeaderboard,
  getVotesCast,
  getTotalVoters,
  getSettings,
  getScheduleStatus,
  getNominatedFinalists,
  advanceStage1Winners,
  refreshFromServer,
  saveAndReload,
  candidateQualificationLabel,
  formatDateTimeNice
} from "../data/store";
import type { ScheduleStatusInfo, PositionFinalistsSummary } from "../data/store";
import Avatar from "../components/Avatar";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Trophy, Award, UserCheck, Sparkles, ArrowRight, CheckCircle2, Clock } from "lucide-react";

type LeaderEntry = {
  position: string;
  candidates: {
    id: string;
    name: string;
    votes: number;
    stage1Votes?: number;
    stage2Votes?: number;
    isFinalist?: boolean;
    photo: string;
    partyList: string;
    course?: string;
    year?: string;
    block?: string;
    blockOffice?: string;
  }[];
};

const CHART_COLORS = ["#233C4B", "#FF7D2D", "#FAC846", "#5F9B8C", "#A0C382"];

function getTimeUnits(ms: number) {
  if (ms <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  return { days, hours, minutes, seconds };
}

export default function ResultsView() {
  const [leaderboard, setLeaderboard] = useState<LeaderEntry[]>([]);
  const [votesCast, setVotesCast] = useState(0);
  const [totalVoters, setTotalVoters] = useState(0);
  const [settings, setSettings] = useState(() => getSettings());
  const [scheduleStatus, setScheduleStatus] = useState<ScheduleStatusInfo>(() => getScheduleStatus());
  const [nominatedFinalists, setNominatedFinalists] = useState<PositionFinalistsSummary[]>(() => getNominatedFinalists());
  const [advancing, setAdvancing] = useState(false);
  const [notice, setNotice] = useState("");

  const reload = async () => {
    await refreshFromServer();
    setLeaderboard(getLeaderboard());
    setVotesCast(getVotesCast());
    setTotalVoters(getTotalVoters());
    setSettings(getSettings());
    setScheduleStatus(getScheduleStatus());
    setNominatedFinalists(getNominatedFinalists());
  };

  useEffect(() => {
    reload();
    const iv = setInterval(reload, 1500);
    return () => clearInterval(iv);
  }, []);

  const handleAdvanceFinalists = async () => {
    if (!confirm("Advance top nominated Block Representatives to official Stage 2 Final Candidates?")) return;
    setAdvancing(true);
    try {
      advanceStage1Winners(settings.topFinalistsCount || 2);
      await saveAndReload();
      await reload();
      setNotice("Top nominated finalists have officially advanced to Stage 2 Final Election!");
      setTimeout(() => setNotice(""), 4000);
    } finally {
      setAdvancing(false);
    }
  };

  const isFinalStage = settings.currentStage === "STAGE_2_FINAL" || settings.currentStage === "COMPLETED";
  const isStage1Concluded = scheduleStatus.code === "TIMED_OUT" || scheduleStatus.code === "STAGE_1_ENDED";
  const hasCandidates = leaderboard.some(l => l.candidates.length > 0);
  const timeUntilStart = getTimeUnits(scheduleStatus.msUntilStart);
  const timeUntilEnd = getTimeUnits(scheduleStatus.msUntilEnd);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#233C4B]">Parliamentary Real-Time Results</h1>
            <span className="bg-[#233C4B] text-[#FAC846] text-xs font-bold px-2.5 py-0.5 rounded-full border border-[#FAC846]/30">
              Live Standings
            </span>
          </div>
          <p className="text-slate-500 text-sm mt-0.5">
            {isFinalStage ? "Stage 2 Final Election Tallies & Official Winners" : "Stage 1 Primary Nominee Vote Tallies"}
            {" • "}{votesCast}/{totalVoters} votes recorded in active stage
          </p>
          {notice && (
            <p className="text-[#5F9B8C] font-semibold text-xs mt-1 animate-pulse">{notice}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {settings.currentStage === "STAGE_1_NOMINATION" && (
            <button
              onClick={handleAdvanceFinalists}
              disabled={advancing}
              className="flex items-center gap-1.5 bg-[#FF7D2D] hover:bg-[#EA6C1E] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-xs cursor-pointer"
            >
              <Trophy className="w-3.5 h-3.5" /> Advance Nominees to Stage 2 <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          <div className="flex items-center gap-2 bg-[#A0C382]/20 border border-[#A0C382]/50 rounded-full px-3.5 py-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#5F9B8C] animate-pulse" />
            <span className="text-[#233C4B] text-xs font-bold uppercase tracking-wider">
              {settings.currentStage === "COMPLETED" ? "Election Completed" : "Real-Time Counting"}
            </span>
          </div>
        </div>
      </div>

      {/* Live Stage Schedule Countdown Bar */}
      <div className="bg-[#233C4B] text-white rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-[#FAC846] flex-shrink-0">
            <Clock className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#FAC846] uppercase">{scheduleStatus.stageName}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                scheduleStatus.code === "ACTIVE" ? "bg-[#A0C382]/20 text-[#A0C382]" : "bg-slate-700 text-slate-300"
              }`}>
                {scheduleStatus.code.replace(/_/g, " ")}
              </span>
            </div>
            <p className="text-slate-300 text-xs mt-0.5">
              {scheduleStatus.code === "NOT_YET_OPEN"
                ? `Opens on ${scheduleStatus.formattedStartTime}`
                : `Deadline: ${scheduleStatus.formattedEndTime}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-[#16252F] rounded-xl px-4 py-2 text-xs font-mono font-bold text-[#FAC846] border border-[#233C4B]">
          <span className="text-slate-400 font-sans font-medium text-xs">
            {scheduleStatus.code === "NOT_YET_OPEN" ? "Opens in:" : "Time Remaining:"}
          </span>
          <span className="text-sm sm:text-base text-white">
            {String(scheduleStatus.code === "NOT_YET_OPEN" ? timeUntilStart.hours : timeUntilEnd.hours).padStart(2, "0")}h :{" "}
            {String(scheduleStatus.code === "NOT_YET_OPEN" ? timeUntilStart.minutes : timeUntilEnd.minutes).padStart(2, "0")}m :{" "}
            <span className="text-[#FAC846]">{String(scheduleStatus.code === "NOT_YET_OPEN" ? timeUntilStart.seconds : timeUntilEnd.seconds).padStart(2, "0")}s</span>
          </span>
        </div>
      </div>

      {/* IF STAGE 1 HAS CONCLUDED / TIMED OUT: SHOWCASE ADVANCING FINALISTS */}
      {isStage1Concluded && (
        <div className="bg-gradient-to-r from-[#233C4B] to-[#1E3442] text-white rounded-2xl p-6 border border-[#FAC846]/40 shadow-xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FAC846]/20 border border-[#FAC846]/40 flex items-center justify-center text-[#FAC846]">
                <Trophy className="w-5 h-5 text-[#FAC846]" />
              </div>
              <div>
                <h2 className="font-bold text-base text-white">Stage 1 Nominated Finalists Ready for Final Stage</h2>
                <p className="text-slate-300 text-xs">Voting deadline has passed. Below are the top qualifying students per position.</p>
              </div>
            </div>

            <button
              onClick={handleAdvanceFinalists}
              disabled={advancing}
              className="bg-[#FAC846] hover:bg-[#F0BE3C] text-[#233C4B] text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <span>Promote to Stage 2 Final Ballot</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
            {nominatedFinalists.map(({ position, finalists, totalVotes }) => (
              <div key={position} className="bg-[#16252F] border border-[#233C4B] rounded-xl p-3.5">
                <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-[#233C4B]">
                  <span className="text-[#FAC846] font-bold text-xs uppercase">{position}</span>
                  <span className="text-[10px] text-slate-400">{totalVotes} votes</span>
                </div>
                <div className="space-y-2">
                  {finalists.slice(0, 2).map((f, i) => (
                    <div key={f.id} className="flex items-center gap-2.5">
                      <Avatar src={f.photo} name={f.name} className="w-8 h-8 rounded-full ring-1 ring-[#FAC846]" fallbackClassName="bg-[#233C4B]/30 text-white" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white truncate">{f.name}</p>
                        <p className="text-[10px] text-slate-400 truncate">{f.course} • {f.block}</p>
                      </div>
                      <span className="text-[#FAC846] text-xs font-mono font-bold">{f.stage1Votes}v</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!hasCandidates ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
          <UserCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-[#233C4B] text-base">No Candidates Registered Yet</h3>
          <p className="text-slate-400 text-sm mt-1 max-w-md mx-auto">
            Once Block Representatives are input in Step 1, their real-time vote bars and live tallies will appear here.
          </p>
        </div>
      ) : (
        leaderboard.map(({ position, candidates }) => {
          const getCandidateVotes = (c: typeof candidates[number]) => {
            if (isFinalStage) return c.stage2Votes ?? c.votes;
            return c.stage1Votes ?? c.votes;
          };

          // ONLY SHOW CANDIDATES THAT HAVE RECEIVED VOTES
          const candidatesWithVotes = candidates.filter(c => getCandidateVotes(c) > 0);
          const maxVotes = Math.max(...candidates.map(getCandidateVotes), 1);
          const totalForPos = candidates.reduce((s, c) => s + getCandidateVotes(c), 0);
          const chartData = candidatesWithVotes.map(c => ({ name: c.name.split(" ")[0], votes: getCandidateVotes(c), fullName: c.name }));

          return (
            <div key={position} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-[#233C4B] text-base uppercase tracking-wider">{position}</h2>
                  {candidatesWithVotes[0] && (
                    <span className="bg-[#FAC846]/20 text-[#233C4B] text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-[#FAC846]/40">
                      <Trophy className="w-3.5 h-3.5 text-[#FF7D2D]" /> Leading: {candidatesWithVotes[0].name}
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-400 font-semibold">{totalForPos} total votes</span>
              </div>

              {candidatesWithVotes.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  <p className="text-xs italic">No votes cast yet for {position}</p>
                  <p className="text-[10px] text-slate-500 mt-1">Waiting for incoming student ballots…</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Bar Chart */}
                  <div>
                    <ResponsiveContainer width="100%" height={Math.max(120, chartData.length * 36)}>
                      <BarChart data={chartData} barSize={28} layout="vertical">
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#475569" }} axisLine={false} tickLine={false} width={80} />
                        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12, border: "1px solid #e2e8f0" }} formatter={(v, _, p) => [v, p.payload.fullName]} />
                        <Bar dataKey="votes" radius={[0, 6, 6, 0]}>
                          {chartData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Candidate List */}
                  <div className="space-y-3">
                    {candidatesWithVotes.map((c, i) => {
                      const votes = getCandidateVotes(c);
                      const pct = totalForPos > 0 ? Math.round((votes / totalForPos) * 100) : 0;
                      const isLeader = i === 0 && votes > 0;
                      return (
                        <div key={c.id}>
                          <div className="flex items-center gap-3 mb-1.5">
                            <Avatar src={c.photo} name={c.name} className="w-8 h-8 rounded-full border border-slate-200" fallbackClassName="bg-slate-100 text-slate-700" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-bold text-slate-800 truncate">{c.name}</p>
                                {isLeader && <span className="text-[#FF7D2D] text-xs">👑</span>}
                                {c.isFinalist && !isFinalStage && (
                                  <span className="bg-[#A0C382]/20 text-[#233C4B] text-[10px] font-bold px-1.5 py-0.5 rounded border border-[#A0C382]/40">
                                    Top 2 Finalist
                                  </span>
                                )}
                              </div>
                              <p className="text-slate-400 text-xs">{candidateQualificationLabel(c)}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="font-bold text-slate-800 text-sm">{votes}</p>
                              <p className="text-slate-400 text-xs font-semibold">{pct}%</p>
                            </div>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                              className="h-2 rounded-full transition-all duration-500"
                              style={{ width: `${maxVotes > 0 ? (votes / maxVotes) * 100 : 0}%`, background: CHART_COLORS[i % CHART_COLORS.length] }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
