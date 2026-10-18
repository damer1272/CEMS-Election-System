import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  getLeaderboard,
  getSettings,
  getVotesCast,
  getTotalVoters,
  getVotingUrl,
  getScheduleStatus,
  getNominatedFinalists,
  getElectionWinners,
  refreshFromServer,
  candidateQualificationLabel,
} from "../data/store";
import type { ElectionSettings, ScheduleStatusInfo, PositionFinalistsSummary, PositionWinner } from "../data/store";
import AppLogo from "../components/AppLogo";
import Avatar from "../components/Avatar";
import { Sparkles, Trophy, UserCheck, ArrowUpRight, Clock, CheckCircle2, Flame, Sun, Moon, Award, Check } from "lucide-react";

type LeaderboardEntry = {
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
    blockOffice?: string;
    block?: string;
    year?: string;
  }[];
};

function getTimeUnits(ms: number) {
  if (ms <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  return { days, hours, minutes, seconds };
}

export default function UserDisplay() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(() => getLeaderboard());
  const [settings, setSettings] = useState<ElectionSettings | null>(() => getSettings());
  const [votesCast, setVotesCast] = useState<number>(() => getVotesCast());
  const [totalVoters, setTotalVoters] = useState<number>(() => getTotalVoters());
  const [nowDate, setNowDate] = useState<Date>(new Date());
  const [scheduleStatus, setScheduleStatus] = useState<ScheduleStatusInfo>(() => getScheduleStatus(new Date()));
  const [nominatedFinalists, setNominatedFinalists] = useState<PositionFinalistsSummary[]>(() => getNominatedFinalists());
  const [winners, setWinners] = useState<PositionWinner[]>(() => getElectionWinners());
  const [viewMode, setViewMode] = useState<"winners" | "tally">("winners");
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("cems_display_theme") as "light" | "dark") || "light";
    }
    return "light";
  });

  const votingUrl = getVotingUrl();

  const toggleTheme = () => {
    setTheme(t => {
      const next = t === "light" ? "dark" : "light";
      localStorage.setItem("cems_display_theme", next);
      return next;
    });
  };

  const isDark = theme === "dark";

  const reloadData = async () => {
    await refreshFromServer();
    const currentNow = new Date();
    setNowDate(currentNow);
    setLeaderboard(getLeaderboard());
    setSettings(getSettings());
    setVotesCast(getVotesCast());
    setTotalVoters(getTotalVoters());
    setScheduleStatus(getScheduleStatus(currentNow));
    setNominatedFinalists(getNominatedFinalists());
    setWinners(getElectionWinners());
  };

  useEffect(() => {
    reloadData();
    const clockInterval = setInterval(() => {
      const currentNow = new Date();
      setNowDate(currentNow);
      setScheduleStatus(getScheduleStatus(currentNow));
    }, 1000);

    const dataInterval = setInterval(reloadData, 2000);

    const handleStorage = (e: StorageEvent) => {
      if (!e.key || e.key.includes("cems_election")) {
        reloadData();
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      clearInterval(clockInterval);
      clearInterval(dataInterval);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const turnout = totalVoters > 0 ? Math.round((votesCast / totalVoters) * 100) : 0;
  const currentStage = settings?.currentStage;
  const isCompleted = currentStage === "COMPLETED";
  const isFinalStage = currentStage === "STAGE_2_FINAL" || isCompleted;

  // Crucial distinction: Stage 1 is ONLY concluded if we are currently in STAGE_1_NOMINATION or STAGE_1_ENDED
  const isStage1Concluded =
    (currentStage === "STAGE_1_NOMINATION" && (scheduleStatus.code === "TIMED_OUT" || scheduleStatus.code === "STAGE_1_ENDED")) ||
    scheduleStatus.code === "STAGE_1_ENDED";

  // Stage 2 / Election is concluded if explicitly marked COMPLETED or if Stage 2 ended
  const isFinalConcluded =
    isCompleted ||
    (currentStage === "STAGE_2_FINAL" && (scheduleStatus.code === "TIMED_OUT" || scheduleStatus.code === "STAGE_2_ENDED"));

  const getStageTag = () => {
    if (isFinalConcluded) return "Election Concluded — Official Winners Proclaimed";
    switch (currentStage) {
      case "STAGE_1_NOMINATION":
        if (isStage1Concluded) return "Stage 1 Nomination Concluded · Finalists Ready";
        return "Stage 1: Primary Nominee Election";
      case "STAGE_2_FINAL":
        return "Stage 2: Final Executive Election";
      case "COMPLETED":
        return "Election Completed — Winners Declared";
      default:
        return "Stage 0: Block Representatives Roster";
    }
  };

  const activeLeaderboard = leaderboard && leaderboard.some(l => l.candidates.length > 0)
    ? leaderboard
    : getLeaderboard();

  const hasAnyCandidates = activeLeaderboard.some(l => l.candidates.length > 0);
  const timeUntilStart = getTimeUnits(scheduleStatus.msUntilStart);
  const timeUntilEnd = getTimeUnits(scheduleStatus.msUntilEnd);

  return (
    <div
      className={`min-h-screen flex flex-col font-sans selection:bg-[#FF7D2D] selection:text-white transition-colors duration-200 ${
        isDark ? "bg-[#223845] text-slate-100" : "bg-[#F4F6F9] text-slate-800"
      }`}
    >
      {/* Header */}
      <header
        className={`px-6 lg:px-10 py-4 flex flex-wrap items-center justify-between border-b backdrop-blur sticky top-0 z-20 gap-4 transition-colors ${
          isDark ? "bg-[#2A4555]/95 border-[#3D6177]" : "bg-white/95 border-slate-200 shadow-xs"
        }`}
      >
        <div className="flex items-center gap-3.5">
          <AppLogo size="md" className="ring-2 ring-[#FAC846]/30 shadow-md" />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-[#FAC846]" : "text-[#FF7D2D]"}`}>
                {settings?.organization ?? "Pagadian Capitol College"}
              </p>
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 border ${
                  isFinalConcluded
                    ? isDark
                      ? "bg-[#FAC846]/20 text-[#FAC846] border-[#FAC846]/40"
                      : "bg-amber-100 text-amber-900 border-amber-300"
                    : isDark
                    ? "bg-[#233C4B] text-[#A0C382] border-[#5F9B8C]/40"
                    : "bg-[#233C4B]/5 text-[#233C4B] border-[#233C4B]/15"
                }`}
              >
                {isFinalConcluded ? <Trophy className="w-3 h-3 text-[#FAC846]" /> : <Sparkles className="w-3 h-3 text-[#FAC846]" />}
                {getStageTag()}
              </span>
            </div>
            <h1 className={`font-bold text-xl lg:text-2xl leading-tight mt-0.5 ${isDark ? "text-white" : "text-[#233C4B]"}`}>
              {isFinalConcluded
                ? `${settings?.title ?? "CSG Parliamentary Election"} — Official Winners Proclaimed`
                : settings?.title ?? "CSG Parliamentary Election"}
            </h1>
          </div>
        </div>

        {/* Live Metrics, Schedule Badge & Theme Switcher */}
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="text-right hidden sm:block">
            <p className={`text-xs font-medium uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              {isFinalConcluded ? "Final Ballots" : "Votes Cast"}
            </p>
            <p className={`font-bold text-2xl tracking-tight ${isDark ? "text-white" : "text-[#233C4B]"}`}>
              {votesCast}
              <span className="text-slate-400 text-sm font-normal"> / {totalVoters}</span>
            </p>
          </div>
          <div className="text-right hidden sm:block">
            <p className={`text-xs font-medium uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              Final Turnout
            </p>
            <p className={`font-bold text-2xl tracking-tight ${isDark ? "text-[#FAC846]" : "text-[#FF7D2D]"}`}>{turnout}%</p>
          </div>

          {/* Schedule Status Live Indicator */}
          {isFinalConcluded ? (
            <div
              className={`flex items-center gap-2 rounded-full px-4 py-1.5 border shadow-sm ${
                isDark ? "bg-[#FAC846]/20 border-[#FAC846]/50 text-[#FAC846]" : "bg-amber-50 border-amber-300 text-amber-900"
              }`}
            >
              <Trophy className="w-4 h-4 text-[#FAC846]" />
              <span className="text-xs font-extrabold uppercase tracking-wider">Winners Proclaimed</span>
            </div>
          ) : scheduleStatus.code === "NOT_YET_OPEN" ? (
            <div
              className={`flex items-center gap-2 rounded-full px-4 py-1.5 border ${
                isDark ? "bg-[#FAC846]/15 border-[#FAC846]/40 text-[#FAC846]" : "bg-amber-50 border-amber-300 text-amber-800"
              }`}
            >
              <Clock className="w-4 h-4 animate-spin" />
              <div className="text-left">
                <span className="text-[10px] font-bold uppercase tracking-wider block leading-none">Opens In</span>
                <span className="text-xs font-mono font-bold">
                  {timeUntilStart.hours}h {timeUntilStart.minutes}m {timeUntilStart.seconds}s
                </span>
              </div>
            </div>
          ) : isStage1Concluded ? (
            <div
              className={`flex items-center gap-2 rounded-full px-4 py-1.5 border ${
                isDark ? "bg-[#A0C382]/20 border-[#A0C382]/40 text-[#A0C382]" : "bg-emerald-50 border-emerald-300 text-emerald-800"
              }`}
            >
              <Trophy className="w-4 h-4 text-[#FAC846]" />
              <span className="text-xs font-bold uppercase tracking-wider">Stage 1 Finalists Ready</span>
            </div>
          ) : scheduleStatus.code === "ACTIVE" ? (
            <div
              className={`flex items-center gap-2 rounded-full px-3.5 py-1.5 border ${
                isDark ? "bg-[#A0C382]/15 border-[#A0C382]/40 text-[#A0C382]" : "bg-emerald-50 border-emerald-300 text-emerald-800"
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider">Real-Time Counting</span>
            </div>
          ) : (
            <div
              className={`flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs border ${
                isDark ? "bg-slate-700 border-slate-600 text-slate-300" : "bg-slate-100 border-slate-300 text-slate-700"
              }`}
            >
              <span>{scheduleStatus.stageName}</span>
            </div>
          )}

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
              isDark
                ? "bg-[#2A4555] hover:bg-[#345366] text-[#FAC846] border-[#3D6177]"
                : "bg-slate-100 hover:bg-slate-200 text-[#233C4B] border-slate-300 shadow-2xs"
            }`}
            title={`Switch to ${isDark ? "Light" : "Dark"} mode`}
          >
            {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            <span>{isDark ? "Light" : "Dark"}</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row gap-0 overflow-hidden">
        {/* Left — QR Code & Turnout Panel */}
        <div
          className={`lg:w-84 xl:w-96 flex-shrink-0 flex flex-col items-center justify-between p-6 lg:p-8 lg:border-r overflow-y-auto transition-colors ${
            isDark ? "bg-[#1B2D38] border-[#344E5E]" : "bg-white border-slate-200"
          }`}
        >
          <div className="flex flex-col items-center w-full">
            {/* QR Card */}
            <div
              className={`rounded-3xl p-6 flex flex-col items-center transition-all ${
                isDark ? "bg-white shadow-2xl ring-4 ring-[#344E5E]" : "bg-white shadow-lg border border-slate-200 ring-4 ring-slate-100"
              }`}
            >
              <QRCodeSVG value={votingUrl} size={190} bgColor="#ffffff" fgColor="#233C4B" level="H" includeMargin={false} />
            </div>

            <div className="mt-5 text-center">
              <p className={`text-sm font-semibold leading-relaxed ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                Scan QR code with your phone to<br />
                <span className={`font-bold text-base ${isDark ? "text-[#FAC846]" : "text-[#FF7D2D]"}`}>
                  {isFinalConcluded
                    ? "Verify Official Certified Results"
                    : scheduleStatus.code === "NOT_YET_OPEN"
                    ? "Access Voting Portal"
                    : isStage1Concluded
                    ? "View Finalist Standings"
                    : "Cast Your Official Vote"}
                </span>
              </p>
              <p
                className={`text-[11px] mt-2 font-mono px-3 py-1 rounded-lg break-all max-w-xs mx-auto border ${
                  isDark ? "bg-[#253D4B] text-slate-300 border-[#344E5E]" : "bg-slate-100 text-slate-600 border-slate-200"
                }`}
              >
                {votingUrl}
              </p>

              <a
                href={votingUrl}
                className="inline-flex items-center gap-1.5 mt-3 text-white text-xs font-bold bg-[#FF7D2D] hover:bg-[#EA6C1E] px-4 py-2 rounded-xl transition shadow-md shadow-[#FF7D2D]/20 cursor-pointer"
              >
                {isFinalConcluded ? "Open Verification Portal" : "Open Portal"} <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Schedule & Turnout Info Box */}
          <div className="w-full mt-6 space-y-3">
            {/* Live Schedule Info Widget */}
            <div
              className={`border rounded-2xl p-4 text-xs transition-colors ${
                isDark ? "bg-[#253D4B] border-[#344E5E] text-slate-200" : "bg-slate-50 border-slate-200 text-slate-700"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold flex items-center gap-1.5">
                  {isFinalConcluded ? (
                    <Trophy className={`w-3.5 h-3.5 ${isDark ? "text-[#FAC846]" : "text-[#FF7D2D]"}`} />
                  ) : (
                    <Clock className={`w-3.5 h-3.5 ${isDark ? "text-[#FAC846]" : "text-[#FF7D2D]"}`} />
                  )}
                  {isFinalConcluded ? "Official Status" : "Schedule Status"}
                </span>
                <span
                  className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                    isFinalConcluded
                      ? isDark
                        ? "bg-[#FAC846]/20 text-[#FAC846]"
                        : "bg-amber-100 text-amber-900"
                      : scheduleStatus.code === "ACTIVE"
                      ? isDark
                        ? "bg-[#A0C382]/20 text-[#A0C382]"
                        : "bg-emerald-100 text-emerald-800"
                      : scheduleStatus.code === "NOT_YET_OPEN"
                      ? isDark
                        ? "bg-[#FAC846]/20 text-[#FAC846]"
                        : "bg-amber-100 text-amber-800"
                      : isDark
                      ? "bg-slate-700 text-slate-300"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {isFinalConcluded ? "CONCLUDED" : scheduleStatus.code.replace(/_/g, " ")}
                </span>
              </div>
              <p className={`text-[11px] mt-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                {isFinalConcluded
                  ? "All voting completed & results certified."
                  : scheduleStatus.code === "NOT_YET_OPEN"
                  ? `Opens: ${scheduleStatus.formattedStartTime}`
                  : `Deadline: ${scheduleStatus.formattedEndTime}`}
              </p>
            </div>

            {/* Turnout bar */}
            <div
              className={`border rounded-2xl p-4 transition-colors ${
                isDark ? "bg-[#253D4B] border-[#344E5E]" : "bg-slate-50 border-slate-200"
              }`}
            >
              <div className={`flex justify-between text-xs mb-2 font-medium ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                <span>{isFinalConcluded ? "Certified Turnout" : "Voter Turnout"}</span>
                <span className={`font-bold ${isDark ? "text-[#FAC846]" : "text-[#FF7D2D]"}`}>{turnout}%</span>
              </div>
              <div className={`w-full rounded-full h-2 overflow-hidden ${isDark ? "bg-[#1B2D38]" : "bg-slate-200"}`}>
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-[#FF7D2D] to-[#FAC846] transition-all duration-500"
                  style={{ width: `${turnout}%` }}
                />
              </div>
              <div className={`flex justify-between text-[11px] mt-2 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                <span className={`font-semibold ${isDark ? "text-[#A0C382]" : "text-[#5F9B8C]"}`}>
                  {votesCast} {isFinalConcluded ? "certified ballots" : "votes cast"}
                </span>
                <span>{isFinalConcluded ? "100% Audited" : `${Math.max(0, totalVoters - votesCast)} pending`}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right — Real-Time Results / Nominated Finalists / Winners Display */}
        <div className={`flex-1 overflow-y-auto p-6 lg:p-8 transition-colors ${isDark ? "bg-[#223845]" : "bg-[#F8FAFC]"}`}>
          {/* Top Title Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div>
              <h2 className={`font-extrabold text-2xl tracking-tight flex items-center gap-2.5 ${isDark ? "text-white" : "text-[#233C4B]"}`}>
                {isFinalConcluded
                  ? "Official Proclamation of Winners"
                  : isStage1Concluded
                  ? "Stage 1 Nominated Students Ready for Final Stage"
                  : isFinalStage
                  ? "Final Executive Election Standings"
                  : "Stage 1 Primary Nominee Live Standings"}
              </h2>
              <p className={`text-xs mt-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                {isFinalConcluded
                  ? "Official results of the Central Student Government Parliamentary Officers 2026–2027 as certified by the Commission on Elections."
                  : isStage1Concluded
                  ? "Voting for Stage 1 has closed. Top 2 nominated Block Representatives per position have qualified for the Final Stage."
                  : "Live vote counts update automatically across all positions."}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {isFinalConcluded ? (
                <span
                  className={`text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 border ${
                    isDark ? "text-[#FAC846] bg-[#FAC846]/10 border-[#FAC846]/30" : "text-amber-800 bg-amber-50 border-amber-300"
                  }`}
                >
                  <Trophy className="w-3.5 h-3.5 text-[#FAC846]" /> Certified Final Results
                </span>
              ) : (
                <span
                  className={`text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 border ${
                    isDark ? "text-[#FAC846] bg-[#FAC846]/10 border-[#FAC846]/30" : "text-[#FF7D2D] bg-[#FF7D2D]/10 border-[#FF7D2D]/30"
                  }`}
                >
                  <Flame className="w-3.5 h-3.5 text-[#FF7D2D]" /> Live Tally
                </span>
              )}
            </div>
          </div>

          {/* IF ELECTION IS COMPLETED / STAGE 2 CONCLUDED: SHOW OFFICIAL WINNERS PROCLAMATION BANNER */}
          {isFinalConcluded ? (
            <div
              className={`rounded-2xl p-5 mb-6 flex flex-wrap items-center justify-between gap-4 border shadow-md transition-colors ${
                isDark
                  ? "bg-gradient-to-r from-[#2A4555] via-[#2F4D5F] to-[#253D4B] border-[#FAC846]/40"
                  : "bg-gradient-to-r from-amber-50 via-white to-amber-50/50 border-amber-300"
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-[#FAC846]/20 border border-[#FAC846]/40 flex items-center justify-center text-[#FAC846] flex-shrink-0 shadow">
                  <Trophy className="w-6 h-6 text-[#FAC846]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-[#FAC846]">Official Certified Results</span>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Election Concluded
                    </span>
                  </div>
                  <p className={`text-sm mt-0.5 font-bold ${isDark ? "text-white" : "text-[#233C4B]"}`}>
                    All parliamentary voting stages have concluded. Newly elected officers are officially proclaimed.
                  </p>
                </div>
              </div>

              {/* Toggle between Winners Cards and Full Tally Breakdown */}
              <div
                className={`flex items-center gap-1 p-1 rounded-xl border ${
                  isDark ? "bg-[#1F333F] border-[#344E5E]" : "bg-white border-slate-300 shadow-2xs"
                }`}
              >
                <button
                  onClick={() => setViewMode("winners")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    viewMode === "winners"
                      ? "bg-[#FAC846] text-[#233C4B] shadow-xs"
                      : isDark
                      ? "text-slate-300 hover:text-white"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Trophy className="w-3.5 h-3.5" /> Proclaimed Officers
                </button>
                <button
                  onClick={() => setViewMode("tally")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    viewMode === "tally"
                      ? "bg-[#FAC846] text-[#233C4B] shadow-xs"
                      : isDark
                      ? "text-slate-300 hover:text-white"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Flame className="w-3.5 h-3.5 text-[#FF7D2D]" /> Vote Breakdown
                </button>
              </div>
            </div>
          ) : (
            /* Big Live Countdown Banner for Active Stages */
            <div
              className={`rounded-2xl p-4 mb-6 flex flex-wrap items-center justify-between gap-4 border shadow-sm transition-colors ${
                isDark ? "bg-[#2A4555] border-[#3D6177]" : "bg-white border-slate-200"
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 border ${
                    isDark ? "bg-[#FAC846]/15 border-[#FAC846]/30 text-[#FAC846]" : "bg-amber-50 border-amber-200 text-[#FF7D2D]"
                  }`}
                >
                  <Clock className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-[#FAC846]" : "text-[#FF7D2D]"}`}>
                      {scheduleStatus.stageName}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        scheduleStatus.code === "ACTIVE"
                          ? isDark
                            ? "bg-[#A0C382]/20 text-[#A0C382] border-[#A0C382]/40"
                            : "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : scheduleStatus.code === "NOT_YET_OPEN"
                          ? isDark
                            ? "bg-[#FAC846]/20 text-[#FAC846] border-[#FAC846]/40"
                            : "bg-amber-50 text-amber-800 border-amber-200"
                          : isDark
                          ? "bg-slate-700 text-slate-300 border-slate-600"
                          : "bg-slate-100 text-slate-700 border-slate-200"
                      }`}
                    >
                      {scheduleStatus.code === "ACTIVE" ? "● Voting Open" : scheduleStatus.code === "NOT_YET_OPEN" ? "⏳ Scheduled" : "🏁 Closed"}
                    </span>
                  </div>
                  <p className={`text-xs mt-0.5 font-medium ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                    {scheduleStatus.code === "NOT_YET_OPEN"
                      ? `Opens officially on ${scheduleStatus.formattedStartTime}`
                      : `Official Deadline: ${scheduleStatus.formattedEndTime}`}
                  </p>
                </div>
              </div>

              {/* Big Digits Clock */}
              <div
                className={`flex items-center gap-2 border rounded-xl px-4 py-2 ${
                  isDark ? "bg-[#1F333F] border-[#344E5E]" : "bg-slate-50 border-slate-200"
                }`}
              >
                <span className={`text-xs font-semibold mr-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  {scheduleStatus.code === "NOT_YET_OPEN" ? "Opens in:" : "Time Remaining:"}
                </span>
                <div className={`flex items-center gap-1 font-mono text-sm sm:text-base font-bold ${isDark ? "text-[#FAC846]" : "text-[#FF7D2D]"}`}>
                  <span
                    className={`px-2.5 py-1 rounded shadow-xs ${
                      isDark ? "bg-[#2A4555] text-white" : "bg-white text-[#233C4B] border border-slate-200"
                    }`}
                  >
                    {String(scheduleStatus.code === "NOT_YET_OPEN" ? timeUntilStart.hours : timeUntilEnd.hours).padStart(2, "0")}h
                  </span>
                  <span>:</span>
                  <span
                    className={`px-2.5 py-1 rounded shadow-xs ${
                      isDark ? "bg-[#2A4555] text-white" : "bg-white text-[#233C4B] border border-slate-200"
                    }`}
                  >
                    {String(scheduleStatus.code === "NOT_YET_OPEN" ? timeUntilStart.minutes : timeUntilEnd.minutes).padStart(2, "0")}m
                  </span>
                  <span>:</span>
                  <span
                    className={`px-2.5 py-1 rounded shadow-xs animate-pulse ${
                      isDark ? "bg-[#2A4555] text-[#FAC846]" : "bg-white text-[#FF7D2D] border border-slate-200"
                    }`}
                  >
                    {String(scheduleStatus.code === "NOT_YET_OPEN" ? timeUntilStart.seconds : timeUntilEnd.seconds).padStart(2, "0")}s
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* VIEW: ELECTION COMPLETED -> OFFICIAL PROCLAMATION OF WINNERS */}
          {isFinalConcluded && viewMode === "winners" ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {winners.map(({ position, winner, runnerUp, totalVotes, winnerPercentage, isUncontested }) => (
                  <div
                    key={position}
                    className={`rounded-3xl p-6 border transition-all duration-300 flex flex-col justify-between shadow-lg relative overflow-hidden ${
                      isDark
                        ? "bg-[#2A4555] border-[#FAC846]/40 shadow-black/20"
                        : "bg-white border-amber-300 shadow-amber-500/5 ring-1 ring-amber-200"
                    }`}
                  >
                    {/* Top position header */}
                    <div>
                      <div
                        className={`flex items-center justify-between pb-3 mb-4 border-b ${
                          isDark ? "border-[#3D6177]" : "border-slate-100"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-black uppercase tracking-wider ${isDark ? "text-[#FAC846]" : "text-[#233C4B]"}`}>
                            {position}
                          </span>
                        </div>
                        <span
                          className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                            isDark
                              ? "bg-[#FAC846]/15 text-[#FAC846] border-[#FAC846]/30"
                              : "bg-amber-100 text-amber-900 border-amber-200"
                          }`}
                        >
                          {isUncontested ? "Uncontested" : "Declared Winner"}
                        </span>
                      </div>

                      {winner ? (
                        <div className="space-y-4">
                          {/* Winner Card */}
                          <div
                            className={`rounded-2xl p-4 border transition ${
                              isDark
                                ? "bg-gradient-to-br from-[#1F333F] to-[#1A2C37] border-[#FAC846]/50 shadow-inner"
                                : "bg-gradient-to-br from-amber-50/70 to-orange-50/40 border-amber-300"
                            }`}
                          >
                            <div className="flex items-start gap-3.5">
                              <div className="relative flex-shrink-0">
                                <Avatar
                                  src={winner.photo}
                                  name={winner.name}
                                  className="w-14 h-14 rounded-full ring-3 ring-[#FAC846] shadow-md"
                                  fallbackClassName="bg-[#233C4B] text-[#FAC846] font-bold text-base"
                                />
                                <span className="absolute -top-2 -right-1 text-base drop-shadow" title="Elected Officer">
                                  👑
                                </span>
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="bg-[#FAC846] text-[#233C4B] font-black text-[10px] px-2 py-0.5 rounded uppercase tracking-wider">
                                    ELECTED
                                  </span>
                                </div>
                                <h3 className={`font-black text-base mt-1 truncate ${isDark ? "text-white" : "text-[#233C4B]"}`}>
                                  {winner.name}
                                </h3>
                                <p className={`text-xs truncate ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                                  {candidateQualificationLabel(winner)}
                                </p>
                              </div>
                            </div>

                            {/* Vote metrics bar */}
                            <div className="mt-3 pt-3 border-t border-slate-200/20">
                              <div className="flex justify-between items-center text-xs mb-1.5 font-bold">
                                <span className={isDark ? "text-slate-300" : "text-slate-700"}>Winning Tally</span>
                                <span className={isDark ? "text-[#FAC846]" : "text-[#FF7D2D]"}>
                                  {winner.stage2Votes ?? winner.votes} votes ({winnerPercentage}%)
                                </span>
                              </div>
                              <div className={`w-full rounded-full h-2 overflow-hidden ${isDark ? "bg-[#14232C]" : "bg-slate-200"}`}>
                                <div
                                  className="h-2 rounded-full bg-gradient-to-r from-[#FF7D2D] to-[#FAC846]"
                                  style={{ width: `${Math.max(8, winnerPercentage)}%` }}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Runner up (if any) */}
                          {runnerUp && (
                            <div
                              className={`rounded-xl p-3 border flex items-center justify-between text-xs ${
                                isDark
                                  ? "bg-[#1B2B34]/60 border-[#324B5A] text-slate-300"
                                  : "bg-slate-50 border-slate-200 text-slate-700"
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <Avatar
                                  src={runnerUp.photo}
                                  name={runnerUp.name}
                                  className="w-8 h-8 rounded-full border border-slate-300"
                                  fallbackClassName="bg-slate-200 text-slate-700 text-xs"
                                />
                                <div className="min-w-0">
                                  <p className="font-semibold truncate">{runnerUp.name}</p>
                                  <p className="text-[10px] text-slate-400">Runner-up Finalist</p>
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0 font-mono font-bold">
                                <p className={isDark ? "text-slate-300" : "text-slate-700"}>
                                  {runnerUp.stage2Votes ?? runnerUp.votes}v
                                </p>
                                <p className="text-[10px] text-slate-400">
                                  {totalVotes > 0
                                    ? Math.round(((runnerUp.stage2Votes ?? runnerUp.votes) / totalVotes) * 100)
                                    : 0}
                                  %
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="py-8 text-center text-slate-400 text-xs italic">
                          No candidates registered for this position.
                        </div>
                      )}
                    </div>

                    {/* Footer certification badge */}
                    <div
                      className={`mt-4 pt-3 border-t flex items-center justify-between text-[11px] font-semibold ${
                        isDark ? "border-[#3D6177] text-[#A0C382]" : "border-slate-100 text-[#5F9B8C]"
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Officially Proclaimed
                      </span>
                      <span className="text-[10px] opacity-75">{totalVotes} Total Ballots</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : isStage1Concluded ? (
            /* IF STAGE 1 TIMED OUT: SHOW NOMINATED FINALISTS SHOWCASE */
            <div className="space-y-6">
              <div
                className={`border rounded-2xl p-4 flex items-center justify-between shadow-xs ${
                  isDark ? "bg-[#2A4555]/90 border-[#FAC846]/40 text-white" : "bg-emerald-50 border-emerald-200 text-[#233C4B]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#FAC846]/20 flex items-center justify-center text-[#FAC846] flex-shrink-0">
                    <Trophy className="w-5 h-5 text-[#FAC846]" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Stage 1 Primary Nomination Voting Completed</p>
                    <p className={`text-xs ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                      Official qualifying finalists are determined and ready to advance into Stage 2.
                    </p>
                  </div>
                </div>
                <span
                  className={`font-bold text-xs px-3 py-1.5 rounded-xl border ${
                    isDark
                      ? "bg-[#A0C382]/20 border-[#A0C382]/40 text-[#A0C382]"
                      : "bg-[#A0C382]/30 border-[#A0C382]/60 text-[#233C4B]"
                  }`}
                >
                  Nominees Qualified
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {nominatedFinalists.map(({ position, finalists, totalVotes }) => (
                  <div
                    key={position}
                    className={`rounded-2xl p-5 border shadow-sm flex flex-col justify-between transition-all ${
                      isDark ? "bg-[#2A4555] border-[#3D6177]" : "bg-white border-slate-200 shadow-xs"
                    }`}
                  >
                    <div>
                      <div
                        className={`flex items-center justify-between border-b pb-2.5 mb-3.5 ${
                          isDark ? "border-[#3D6177]" : "border-slate-100"
                        }`}
                      >
                        <span className={`text-xs font-extrabold uppercase tracking-wider ${isDark ? "text-[#FAC846]" : "text-[#233C4B]"}`}>
                          {position}
                        </span>
                        <span
                          className={`text-xs font-semibold px-2.5 py-0.5 rounded border ${
                            isDark ? "text-slate-300 bg-[#1F333F] border-[#344E5E]" : "text-slate-600 bg-slate-100 border-slate-200"
                          }`}
                        >
                          {totalVotes} total votes
                        </span>
                      </div>

                      {finalists.length === 0 ? (
                        <p className="text-slate-400 text-xs italic py-6 text-center">No nominees registered.</p>
                      ) : (
                        <div className="space-y-3">
                          {finalists.map((f, i) => (
                            <div
                              key={f.id}
                              className={`border rounded-xl p-3 flex items-center gap-3 transition ${
                                isDark ? "bg-[#1F333F] border-[#344E5E]" : "bg-slate-50/80 hover:bg-slate-50 border-slate-200"
                              }`}
                            >
                              <div className="relative flex-shrink-0">
                                <Avatar
                                  src={f.photo}
                                  name={f.name}
                                  className="w-11 h-11 rounded-full ring-2 ring-[#FAC846]"
                                  fallbackClassName="bg-[#233C4B]/20 text-[#233C4B]"
                                />
                                <span className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-[#FAC846] rounded-full flex items-center justify-center text-[10px] font-bold text-[#233C4B]">
                                  {i + 1}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className={`text-sm font-bold truncate ${isDark ? "text-white" : "text-[#233C4B]"}`}>{f.name}</p>
                                  {i === 0 && <span className="text-xs">👑</span>}
                                </div>
                                <p className={`text-xs truncate ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                  {candidateQualificationLabel(f)}
                                </p>
                                <span
                                  className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded mt-1 border ${
                                    isDark
                                      ? "bg-[#A0C382]/20 text-[#A0C382] border-[#A0C382]/40"
                                      : "bg-[#A0C382]/20 text-[#233C4B] border-[#A0C382]/50"
                                  }`}
                                >
                                  ⭐ Nominated for Final Stage
                                </span>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className={`font-bold text-base font-mono ${isDark ? "text-[#FAC846]" : "text-[#FF7D2D]"}`}>
                                  {f.stage1Votes}
                                </p>
                                <p className="text-slate-400 text-[10px] uppercase font-medium">Votes</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div
                      className={`mt-4 pt-2.5 border-t flex items-center justify-between text-[11px] font-semibold ${
                        isDark ? "border-[#3D6177] text-[#A0C382]" : "border-slate-100 text-[#5F9B8C]"
                      }`}
                    >
                      <span>Status: Ready for Stage 2</span>
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* ACTIVE / LIVE VOTING LEADERBOARD */
            !hasAnyCandidates ? (
              <div
                className={`rounded-3xl border p-12 text-center max-w-xl mx-auto my-12 ${
                  isDark ? "bg-[#2A4555]/60 border-[#3D6177]" : "bg-white border-slate-200 shadow-sm"
                }`}
              >
                <div
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
                    isDark ? "bg-[#1F333F] text-[#FAC846]" : "bg-slate-100 text-[#233C4B]"
                  }`}
                >
                  <UserCheck className="w-8 h-8" />
                </div>
                <h3 className={`font-bold text-lg ${isDark ? "text-white" : "text-[#233C4B]"}`}>No Active Candidates Yet</h3>
                <p className={`text-sm mt-1.5 leading-relaxed ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  The Election Commission is preparing the official roster of Block Representatives. Once input by the Admin and the
                  schedule opens, live vote standings will appear here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {activeLeaderboard.map(({ position, candidates }) => {
                  const getVotes = (c: (typeof candidates)[number]) =>
                    isFinalStage ? c.stage2Votes ?? c.votes : c.stage1Votes ?? c.votes;

                  const candidatesWithVotes = candidates.filter(c => getVotes(c) > 0);
                  const maxVotes = Math.max(...candidates.map(getVotes), 1);
                  const totalForPos = candidates.reduce((sum, c) => sum + getVotes(c), 0);

                  return (
                    <div
                      key={position}
                      className={`rounded-2xl p-5 border shadow-sm flex flex-col justify-between transition-all ${
                        isDark ? "bg-[#2A4555] border-[#3D6177]" : "bg-white border-slate-200 shadow-xs"
                      }`}
                    >
                      <div>
                        <div
                          className={`flex items-center justify-between gap-2 mb-4 border-b pb-2.5 ${
                            isDark ? "border-[#3D6177]" : "border-slate-100"
                          }`}
                        >
                          <span className={`text-xs font-extrabold uppercase tracking-wider ${isDark ? "text-[#FAC846]" : "text-[#233C4B]"}`}>
                            {position}
                          </span>
                          {candidatesWithVotes[0] && (
                            <span
                              className={`text-xs font-bold flex items-center gap-1 ${
                                isDark ? "text-[#A0C382]" : "text-[#5F9B8C]"
                              }`}
                            >
                              <Trophy className="w-3.5 h-3.5 text-[#FAC846]" /> Lead: {candidatesWithVotes[0].name.split(" ")[0]}
                            </span>
                          )}
                        </div>

                        {candidatesWithVotes.length === 0 ? (
                          <div className="py-8 text-center text-slate-400">
                            <p className="text-xs italic">No votes cast yet for {position}</p>
                            <p className="text-[10px] text-slate-500 mt-1">Waiting for incoming student ballots…</p>
                          </div>
                        ) : (
                          <div className="space-y-3.5">
                            {candidatesWithVotes.map((c, i) => {
                              const votes = getVotes(c);
                              const pct = totalForPos > 0 ? Math.round((votes / totalForPos) * 100) : 0;
                              const isLeading = i === 0 && votes > 0;

                              return (
                                <div key={c.id} className="transition animate-slide-in">
                                  <div className="flex items-center gap-3 mb-1.5">
                                    <div className="relative flex-shrink-0">
                                      <Avatar
                                        src={c.photo}
                                        name={c.name}
                                        className={`w-10 h-10 rounded-full border ${isDark ? "border-[#3D6177]" : "border-slate-200"}`}
                                        fallbackClassName={isDark ? "bg-[#1F333F] text-slate-200" : "bg-slate-100 text-[#233C4B]"}
                                      />
                                      {isLeading && (
                                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#FAC846] rounded-full flex items-center justify-center text-[10px] shadow">
                                          👑
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className={`text-sm font-bold truncate ${isDark ? "text-white" : "text-[#233C4B]"}`}>
                                        {c.name}
                                      </p>
                                      <p className={`text-xs truncate ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                        {candidateQualificationLabel(c)}
                                      </p>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                      <p className={`font-bold text-sm ${isDark ? "text-white" : "text-[#233C4B]"}`}>{votes}</p>
                                      <p className={`text-xs font-semibold ${isDark ? "text-[#FAC846]" : "text-[#FF7D2D]"}`}>
                                        {pct}%
                                      </p>
                                    </div>
                                  </div>
                                  <div className={`w-full rounded-full h-1.5 overflow-hidden ${isDark ? "bg-[#1F333F]" : "bg-slate-100"}`}>
                                    <div
                                      className={`h-1.5 rounded-full transition-all duration-500 ${
                                        isLeading ? "bg-gradient-to-r from-[#FF7D2D] to-[#FAC846]" : "bg-[#5F9B8C]"
                                      }`}
                                      style={{ width: `${maxVotes > 0 ? (votes / maxVotes) * 100 : 0}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      </div>

      {/* Footer */}
      <footer
        className={`px-8 py-3 border-t flex items-center justify-between text-xs transition-colors ${
          isDark ? "border-[#344E5E] bg-[#1B2D38] text-slate-400" : "border-slate-200 bg-white text-slate-500 shadow-2xs"
        }`}
      >
        <p>CEMS Parliamentary Election System • Central Student Government</p>
        <a href="/admin/login" className="text-[#FF7D2D] hover:text-[#EA6C1E] transition-colors font-semibold">
          Admin Portal →
        </a>
      </footer>
    </div>
  );
}
