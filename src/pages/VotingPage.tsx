import { useState, useEffect, useRef } from "react";
import {
  CheckCircle,
  AlertCircle,
  ChevronRight,
  User,
  ArrowLeft,
  Calendar,
  Award,
  Sparkles,
  Camera,
  Upload,
  ShieldCheck,
  RefreshCw,
  Check,
  IdCard,
  Clock,
  Lock,
  Trophy,
  CheckCircle2,
  ArrowUpRight
} from "lucide-react";
import AppLogo from "../components/AppLogo";
import Avatar from "../components/Avatar";
import {
  registerOrVerifyStudent,
  castVote,
  getBlockReps,
  getCandidates,
  getPositions,
  getSettings,
  getScheduleStatus,
  getNominatedFinalists,
  getElectionWinners,
  refreshFromServer,
  candidateQualificationLabel,
  subscribeToStore,
  COURSES,
  YEAR_LEVELS
} from "../data/store";
import type { Participant, Course, BlockRepresentative, Candidate, ScheduleStatusInfo, PositionFinalistsSummary, PositionWinner } from "../data/store";
import { scanAndVerifySchoolID, type SchoolIDScanResult } from "../utils/idVerifier";

type Step = "credentials" | "id_verify" | "vote" | "confirm" | "success";

function getTimeUnits(ms: number) {
  if (ms <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  return { days, hours, minutes, seconds };
}

export default function VotingPage() {
  const [step, setStep] = useState<Step>("credentials");

  // Step 1: Student Credentials
  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [selectedCourse, setSelectedCourse] = useState<Course>(COURSES[0]);
  const [yearLevel, setYearLevel] = useState<string>(YEAR_LEVELS[0]);
  const [error, setError] = useState("");

  // Step 2: ID Scanner State
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<SchoolIDScanResult | null>(null);
  const [idPhotoUrl, setIdPhotoUrl] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Voting State
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [settings, setSettings] = useState(() => getSettings());
  const [positions, setPositions] = useState(() => getPositions());
  const [blockReps, setBlockReps] = useState<BlockRepresentative[]>(() => getBlockReps());
  const [candidates, setCandidates] = useState<Candidate[]>(() => getCandidates());

  // Real-time schedule & clock state
  const [nowDate, setNowDate] = useState<Date>(new Date());
  const [scheduleStatus, setScheduleStatus] = useState<ScheduleStatusInfo>(() => getScheduleStatus(new Date()));
  const [nominatedFinalists, setNominatedFinalists] = useState<PositionFinalistsSummary[]>(() => getNominatedFinalists());
  const [winners, setWinners] = useState<PositionWinner[]>(() => getElectionWinners());

  const reloadData = async () => {
    await refreshFromServer();
    const currentNow = new Date();
    setNowDate(currentNow);
    setSettings(getSettings());
    setPositions(getPositions());
    setBlockReps(getBlockReps());
    setCandidates(getCandidates());
    setScheduleStatus(getScheduleStatus(currentNow));
    setNominatedFinalists(getNominatedFinalists());
    setWinners(getElectionWinners());
  };

  useEffect(() => {
    reloadData();
    const iv = setInterval(() => {
      const currentNow = new Date();
      setNowDate(currentNow);
      setScheduleStatus(getScheduleStatus(currentNow));
    }, 1000);

    const pollServer = setInterval(() => {
      reloadData();
    }, 1500);

    const unsubscribe = subscribeToStore(reloadData);

    const handleStorage = (e: StorageEvent) => {
      if (!e.key || e.key.includes("cems_election")) {
        reloadData();
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      clearInterval(iv);
      clearInterval(pollServer);
      unsubscribe();
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const getBallotCandidatesForPosition = (position: string): Candidate[] => {
    const stage = settings.currentStage;
    if (stage === "STAGE_2_FINAL") {
      const finalists = candidates.filter(c => c.position === position && c.isFinalist);
      if (finalists.length > 0) return finalists;
      const posCandidates = candidates.filter(c => c.position === position);
      if (posCandidates.length > 0) return posCandidates;
    }

    // In Stage 1 / Stage 0 / Primary Nomination:
    // ALL registered Block Representatives are selectable nominees!
    if (blockReps.length > 0) {
      return blockReps.map(rep => {
        const existing = candidates.find(
          c => (c.blockRepId === rep.id || c.name.toLowerCase() === rep.name.toLowerCase() || c.id === `c_${rep.id}_${position.replace(/[^a-zA-Z0-9]/g, "_")}`) && c.position === position
        );
        if (existing) {
          return {
            ...existing,
            photo: (rep.photo && !rep.photo.includes("pravatar.cc") ? rep.photo : "") || (existing.photo && !existing.photo.includes("pravatar.cc") ? existing.photo : ""),
            course: rep.course || existing.course,
            year: rep.year || existing.year,
            block: rep.block || existing.block,
            blockOffice: rep.blockOffice || existing.blockOffice || "Block Representative",
          };
        }
        return {
          id: `rep_${rep.id}`,
          name: rep.name,
          position: position,
          partyList: rep.blockOffice || "Block Representative",
          photo: rep.photo && !rep.photo.includes("pravatar.cc") ? rep.photo : "",
          course: rep.course,
          year: rep.year,
          block: rep.block,
          blockOffice: rep.blockOffice || "Block Representative",
          blockRepId: rep.id,
          votes: 0,
          stage1Votes: 0,
          stage2Votes: 0,
          isFinalist: true,
        };
      });
    }

    return candidates.filter(c => c.position === position);
  };

  // Cleanup camera stream
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const currentStage = settings.currentStage;

  const startCamera = async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsCameraActive(true);
      }
    } catch {
      setError("Unable to access camera. Please allow camera permissions or upload an ID photo directly.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const capturePhotoAndScan = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setIdPhotoUrl(dataUrl);
    stopCamera();

    await processImageOCR(dataUrl);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      if (!dataUrl) return;
      setIdPhotoUrl(dataUrl);
      await processImageOCR(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const processImageOCR = async (imageSrc: string) => {
    setIsScanning(true);
    setError("");
    try {
      const result = await scanAndVerifySchoolID(imageSrc);
      setScanResult(result);
    } catch {
      // allow fallback
    } finally {
      setIsScanning(false);
    }
  };

  // STEP 1 -> STEP 2: Validate Credentials & directly open official ballot (ID scan bypassed for now)
  const handleValidateCredentials = () => {
    setError("");
    const trimmedId = studentId.trim();
    const trimmedName = studentName.trim();

    if (!trimmedId) {
      setError("Please enter your official Student ID number (e.g. 021-0137).");
      return;
    }
    if (!trimmedName) {
      setError("Please enter your complete Full Name as registered with the school.");
      return;
    }
    if (!selectedCourse) {
      setError("Please select your enrolled course program (BSIT, BSBA, BEEd, BSCrim).");
      return;
    }

    if (!scheduleStatus.canVote) {
      setError(scheduleStatus.message);
      return;
    }

    // Register or verify student voter directly
    const { participant: voter } = registerOrVerifyStudent({
      studentId: trimmedId,
      name: trimmedName,
      course: selectedCourse,
      year: yearLevel,
    });

    // Check duplicate voting
    if (currentStage === "STAGE_1_NOMINATION" && (voter.hasVotedStage1 || voter.hasVoted)) {
      setError(`Student ID ${trimmedId} has already cast a vote for Stage 1 Primary.`);
      return;
    }
    if (currentStage === "STAGE_2_FINAL" && voter.hasVotedStage2) {
      setError(`Student ID ${trimmedId} has already cast a vote for Stage 2 Final Executive.`);
      return;
    }

    setSettings(getSettings());
    setPositions(getPositions());
    setBlockReps(getBlockReps());
    setCandidates(getCandidates());
    setParticipant(voter);
    setStep("vote");
  };

  // Keep handleCompleteVerification for compatibility if ID verify is re-enabled later
  const handleCompleteVerification = () => {
    handleValidateCredentials();
  };

  const handleSelect = (position: string, candidateId: string) => {
    setSelections(prev => ({ ...prev, [position]: candidateId }));
  };

  const allSelected = positions.every(pos => selections[pos]);

  const handleConfirm = () => {
    if (!allSelected) { setError("Please select one candidate for each executive position."); return; }
    setError("");
    setStep("confirm");
  };

  const handleSubmit = () => {
    if (!participant) return;
    setIsSubmitting(true);
    setTimeout(() => {
      const ok = castVote(participant.id, selections);
      setIsSubmitting(false);
      if (!ok) {
        setError("Your vote could not be recorded. You may have already cast a vote for this stage, or the voting window has closed.");
        setStep("confirm");
        return;
      }
      setStep("success");
    }, 600);
  };

  const timeUntilStart = getTimeUnits(scheduleStatus.msUntilStart);
  const timeUntilEnd = getTimeUnits(scheduleStatus.msUntilEnd);

  // =========================================================================
  // VIEW: IF NOT YET OPEN / PREPARATION PHASE (COUNTDOWN SCREEN)
  // =========================================================================
  if (step !== "success" && (scheduleStatus.code === "NOT_YET_OPEN" || scheduleStatus.code === "STAGE_0_PREPARATION")) {
    return (
      <div className="min-h-screen bg-[#192B36] flex flex-col font-sans text-slate-100 selection:bg-[#FF7D2D] selection:text-white">
        {/* Top Header */}
        <header className="px-6 lg:px-10 py-4 flex items-center justify-between border-b border-[#233C4B] bg-[#1E3442]/80 backdrop-blur sticky top-0 z-20">
          <div className="flex items-center gap-3.5">
            <AppLogo size="md" className="ring-2 ring-[#FAC846]/30 shadow-md" />
            <div>
              <p className="text-[#FAC846] text-xs font-semibold uppercase tracking-wider">
                {settings.organization} · Student Portal
              </p>
              <h1 className="text-white font-bold text-lg sm:text-xl leading-tight mt-0.5">
                {settings.title}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-[#FAC846]/15 border border-[#FAC846]/30 rounded-full px-3.5 py-1.5 text-xs font-bold text-[#FAC846]">
            <Clock className="w-3.5 h-3.5 animate-spin" />
            <span>Scheduled Portal</span>
          </div>
        </header>

        {/* Main Countdown View */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-xl text-center">
            {/* Animated Lock / Clock Emblem */}
            <div className="relative inline-block mb-6">
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[#233C4B] to-[#16252F] border-2 border-[#FAC846]/40 flex items-center justify-center shadow-2xl mx-auto ring-8 ring-[#FAC846]/10">
                <Lock className="w-10 h-10 text-[#FAC846]" />
              </div>
              <span className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-[#FF7D2D] flex items-center justify-center text-white shadow-lg">
                <Clock className="w-4 h-4" />
              </span>
            </div>

            {/* Notification Badge */}
            <div className="inline-flex items-center gap-2 bg-[#FF7D2D]/20 border border-[#FF7D2D]/40 text-[#FF7D2D] text-xs font-bold px-4 py-1.5 rounded-full mb-3 shadow-xs">
              <AlertCircle className="w-4 h-4" />
              <span>Portal Not Yet Available</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-2 tracking-tight">
              Voting Portal Opens Soon
            </h2>
            <p className="text-slate-300 text-sm max-w-md mx-auto leading-relaxed mb-8">
              {scheduleStatus.subMessage || "Please wait for the scheduled opening time. The system will automatically unlock when the portal opens."}
            </p>

            {/* Real-time Digital Countdown Display */}
            <div className="bg-[#1E3442] border border-[#233C4B] rounded-3xl p-6 sm:p-8 shadow-2xl mb-8">
              <p className="text-xs font-bold uppercase tracking-widest text-[#FAC846] mb-4">
                Time Remaining Until Opening
              </p>
              <div className="grid grid-cols-4 gap-2.5 sm:gap-4 max-w-md mx-auto">
                <div className="bg-[#16252F] border border-[#233C4B] rounded-2xl p-3 sm:p-4 text-center">
                  <span className="block text-2xl sm:text-4xl font-extrabold text-white font-mono">{String(timeUntilStart.days).padStart(2, "0")}</span>
                  <span className="text-[10px] sm:text-xs text-slate-400 font-semibold uppercase">Days</span>
                </div>
                <div className="bg-[#16252F] border border-[#233C4B] rounded-2xl p-3 sm:p-4 text-center">
                  <span className="block text-2xl sm:text-4xl font-extrabold text-white font-mono">{String(timeUntilStart.hours).padStart(2, "0")}</span>
                  <span className="text-[10px] sm:text-xs text-slate-400 font-semibold uppercase">Hours</span>
                </div>
                <div className="bg-[#16252F] border border-[#233C4B] rounded-2xl p-3 sm:p-4 text-center">
                  <span className="block text-2xl sm:text-4xl font-extrabold text-white font-mono">{String(timeUntilStart.minutes).padStart(2, "0")}</span>
                  <span className="text-[10px] sm:text-xs text-slate-400 font-semibold uppercase">Minutes</span>
                </div>
                <div className="bg-[#16252F] border border-[#233C4B] rounded-2xl p-3 sm:p-4 text-center">
                  <span className="block text-2xl sm:text-4xl font-extrabold text-[#FAC846] font-mono animate-pulse">{String(timeUntilStart.seconds).padStart(2, "0")}</span>
                  <span className="text-[10px] sm:text-xs text-slate-400 font-semibold uppercase">Seconds</span>
                </div>
              </div>

              {/* Schedule Meta Details */}
              <div className="mt-6 pt-5 border-t border-[#233C4B] grid grid-cols-1 sm:grid-cols-2 gap-3 text-left text-xs">
                <div className="bg-[#16252F]/70 p-3 rounded-xl border border-[#233C4B]/60">
                  <span className="text-slate-400 block mb-0.5">Scheduled Opening:</span>
                  <strong className="text-white font-semibold flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#FAC846]" />
                    {scheduleStatus.formattedStartTime}
                  </strong>
                </div>
                <div className="bg-[#16252F]/70 p-3 rounded-xl border border-[#233C4B]/60">
                  <span className="text-slate-400 block mb-0.5">Current System Time:</span>
                  <strong className="text-white font-semibold flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#A0C382]" />
                    {nowDate.toLocaleTimeString()} ({nowDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })})
                  </strong>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={reloadData}
                className="inline-flex items-center gap-2 bg-[#FF7D2D] hover:bg-[#EA6C1E] text-white text-xs font-bold px-5 py-3 rounded-xl transition shadow-lg shadow-[#FF7D2D]/20 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" /> Check Portal Status Now
              </button>
              <a
                href="/"
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-5 py-3 rounded-xl transition border border-white/10"
              >
                View Live Screen <ArrowUpRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="px-6 py-3 border-t border-[#233C4B] bg-[#16252F] text-center text-xs text-slate-400">
          Pagadian Capitol College, Inc. · Central Student Government Election Management System
        </footer>
      </div>
    );
  }

  // =========================================================================
  // VIEW: IF ELECTION COMPLETED / STAGE 2 ENDED (OFFICIAL WINNERS PROCLAIMED)
  // =========================================================================
  if (
    step !== "success" &&
    (currentStage === "COMPLETED" ||
      scheduleStatus.code === "COMPLETED" ||
      scheduleStatus.code === "STAGE_2_ENDED" ||
      (currentStage === "STAGE_2_FINAL" && scheduleStatus.code === "TIMED_OUT"))
  ) {
    return (
      <div className="min-h-screen bg-[#192B36] flex flex-col font-sans text-slate-100 selection:bg-[#FF7D2D] selection:text-white">
        <header className="px-6 lg:px-10 py-4 flex flex-wrap items-center justify-between border-b border-[#233C4B] bg-[#1E3442]/90 backdrop-blur sticky top-0 z-20 gap-4">
          <div className="flex items-center gap-3.5">
            <AppLogo size="md" className="ring-2 ring-[#FAC846]/30 shadow-md" />
            <div>
              <p className="text-[#FAC846] text-xs font-semibold uppercase tracking-wider">
                {settings.organization} · Official Election Results
              </p>
              <h1 className="text-white font-bold text-lg sm:text-xl leading-tight mt-0.5">
                {settings.title}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-[#FAC846]/20 border border-[#FAC846]/40 rounded-full px-4 py-1.5 text-xs font-bold text-[#FAC846]">
            <Trophy className="w-4 h-4 text-[#FAC846]" />
            <span>Election Concluded · Winners Proclaimed</span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 lg:p-10 max-w-6xl mx-auto w-full space-y-8">
          <div className="bg-gradient-to-r from-[#233C4B] via-[#1E3442] to-[#16252F] border border-[#FAC846]/40 rounded-3xl p-6 sm:p-8 text-center relative overflow-hidden shadow-2xl">
            <div className="inline-flex items-center gap-2 bg-[#FAC846]/20 border border-[#FAC846]/50 text-[#FAC846] text-xs font-extrabold px-4 py-1.5 rounded-full mb-3 uppercase tracking-wider">
              <Trophy className="w-4 h-4 text-[#FAC846]" /> Parliamentary Election Concluded
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-2 tracking-tight">
              Official Proclamation of Elected CSG Officers
            </h2>
            <p className="text-slate-300 text-sm max-w-2xl mx-auto leading-relaxed">
              Voting has officially closed. All student ballots have been verified and tallied. Congratulations to the newly elected Officers of the Central Student Government!
            </p>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <a
                href="/"
                className="inline-flex items-center gap-2 bg-[#FF7D2D] hover:bg-[#EA6C1E] text-white font-bold text-xs sm:text-sm px-6 py-3 rounded-xl transition shadow-lg shadow-[#FF7D2D]/20 cursor-pointer"
              >
                <Trophy className="w-4 h-4" /> View Live Results Display
              </a>
              <button
                onClick={reloadData}
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm px-5 py-3 rounded-xl transition border border-white/10 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" /> Refresh Status
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {winners.map(({ position, winner, runnerUp, totalVotes, winnerPercentage, isUncontested }) => (
              <div key={position} className="bg-[#1E3442] border border-[#FAC846]/30 rounded-3xl p-5 shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-[#233C4B] pb-3 mb-4">
                    <span className="text-[#FAC846] font-extrabold text-xs uppercase tracking-wider">{position}</span>
                    <span className="text-xs font-bold text-slate-300 bg-[#16252F] px-2.5 py-1 rounded-lg border border-[#233C4B]">
                      {isUncontested ? "Uncontested" : "Declared Winner"}
                    </span>
                  </div>

                  {winner ? (
                    <div className="space-y-3">
                      <div className="bg-[#16252F] border border-[#FAC846]/40 rounded-2xl p-4 flex items-center gap-3.5 relative overflow-hidden">
                        <div className="relative flex-shrink-0">
                          <Avatar src={winner.photo} name={winner.name} className="w-13 h-13 rounded-full ring-2 ring-[#FAC846]" fallbackClassName="bg-[#233C4B]/40 text-[#FAC846] font-bold" />
                          <span className="absolute -top-1.5 -right-1.5 text-sm drop-shadow">👑</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="bg-[#FAC846] text-[#233C4B] font-black text-[9px] px-1.5 py-0.5 rounded uppercase">ELECTED</span>
                          <p className="font-bold text-sm text-white truncate mt-0.5">{winner.name}</p>
                          <p className="text-xs text-slate-400 truncate">{candidateQualificationLabel(winner)}</p>
                        </div>
                        <div className="text-right flex-shrink-0 font-mono">
                          <p className="font-bold text-base text-[#FAC846]">{typeof winner.stage2Votes === "number" ? winner.stage2Votes : winner.votes}</p>
                          <p className="text-[10px] text-slate-400 uppercase font-semibold">{winnerPercentage}%</p>
                        </div>
                      </div>

                      {runnerUp && (
                        <div className="bg-[#16252F]/60 border border-[#233C4B]/60 rounded-xl p-2.5 flex items-center justify-between text-xs text-slate-400">
                          <div className="flex items-center gap-2 truncate">
                            <Avatar src={runnerUp.photo} name={runnerUp.name} className="w-7 h-7 rounded-full" fallbackClassName="bg-slate-700 text-white text-[10px]" />
                            <span className="truncate">{runnerUp.name}</span>
                          </div>
                          <span className="font-mono text-slate-300 font-semibold flex-shrink-0">{typeof runnerUp.stage2Votes === "number" ? runnerUp.stage2Votes : runnerUp.votes} votes</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="py-6 text-center text-slate-400 text-xs italic">No candidates registered.</p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-[#233C4B]/60 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="text-[#A0C382] font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Officially Certified
                  </span>
                  <span>{totalVotes} total votes</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <footer className="px-6 py-3 border-t border-[#233C4B] bg-[#16252F] text-center text-xs text-slate-400">
          Pagadian Capitol College, Inc. · Central Student Government Election Management System
        </footer>
      </div>
    );
  }

  // =========================================================================
  // VIEW: IF STAGE 1 TIMED OUT / STAGE 1 ENDED (NOMINATED FINALISTS DISPLAY)
  // =========================================================================
  if (
    step !== "success" &&
    ((currentStage === "STAGE_1_NOMINATION" && (scheduleStatus.code === "TIMED_OUT" || scheduleStatus.code === "STAGE_1_ENDED")) ||
      scheduleStatus.code === "STAGE_1_ENDED")
  ) {
    return (
      <div className="min-h-screen bg-[#192B36] flex flex-col font-sans text-slate-100 selection:bg-[#FF7D2D] selection:text-white">
        {/* Top Header */}
        <header className="px-6 lg:px-10 py-4 flex flex-wrap items-center justify-between border-b border-[#233C4B] bg-[#1E3442]/90 backdrop-blur sticky top-0 z-20 gap-4">
          <div className="flex items-center gap-3.5">
            <AppLogo size="md" className="ring-2 ring-[#FAC846]/30 shadow-md" />
            <div>
              <p className="text-[#FAC846] text-xs font-semibold uppercase tracking-wider">
                {settings.organization} · Official Primary Results
              </p>
              <h1 className="text-white font-bold text-lg sm:text-xl leading-tight mt-0.5">
                {settings.title}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-[#A0C382]/20 border border-[#A0C382]/40 rounded-full px-4 py-1.5 text-xs font-bold text-[#A0C382]">
            <Trophy className="w-4 h-4 text-[#FAC846]" />
            <span>Stage 1 Concluded · Nominees Finalized</span>
          </div>
        </header>

        {/* Nominated Finalists Main Showcase */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-10 max-w-6xl mx-auto w-full space-y-8">
          {/* Banner */}
          <div className="bg-gradient-to-r from-[#233C4B] to-[#1E3442] border border-[#FAC846]/30 rounded-3xl p-6 sm:p-8 text-center relative overflow-hidden shadow-2xl">
            <div className="inline-flex items-center gap-2 bg-[#FAC846]/20 border border-[#FAC846]/50 text-[#FAC846] text-xs font-extrabold px-4 py-1.5 rounded-full mb-3 uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-[#FAC846]" /> Stage 1 Primary Voting Concluded
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-2 tracking-tight">
              Official Nominated Finalists
            </h2>
            <p className="text-slate-300 text-sm max-w-2xl mx-auto leading-relaxed">
              The Stage 1 voting deadline has passed. Below are the official Block Representative nominees with the highest votes per position who have qualified and are ready for the <strong>Stage 2 Final Executive Election</strong>.
            </p>

            <div className="mt-4 inline-flex items-center gap-2 bg-[#16252F] border border-[#233C4B] rounded-xl px-4 py-2 text-xs text-slate-300">
              <Calendar className="w-4 h-4 text-[#FAC846]" />
              <span>Voting closed on: <strong className="text-white">{scheduleStatus.formattedEndTime}</strong></span>
            </div>
          </div>

          {/* Position by Position Nominated Winners */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {nominatedFinalists.map(({ position, finalists, totalVotes }) => (
              <div key={position} className="bg-[#1E3442] border border-[#233C4B] rounded-3xl p-5 shadow-xl flex flex-col justify-between hover:border-[#FAC846]/40 transition">
                <div>
                  <div className="flex items-center justify-between border-b border-[#233C4B] pb-3 mb-4">
                    <div>
                      <span className="text-[#FAC846] font-extrabold text-xs uppercase tracking-wider">{position}</span>
                      <p className="text-[11px] text-slate-400 font-medium">Top 2 Advancing Finalists</p>
                    </div>
                    <span className="text-xs font-bold text-slate-300 bg-[#16252F] px-2.5 py-1 rounded-lg border border-[#233C4B]">
                      {totalVotes} votes
                    </span>
                  </div>

                  {finalists.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs italic">
                      No nominees recorded for this position.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {finalists.map((f, idx) => (
                        <div key={f.id} className="bg-[#16252F] border border-[#233C4B] rounded-2xl p-3.5 flex items-center gap-3 relative overflow-hidden">
                          <div className="relative flex-shrink-0">
                            <Avatar src={f.photo} name={f.name} className="w-12 h-12 rounded-full ring-2 ring-[#FAC846]" fallbackClassName="bg-[#233C4B]/40 text-[#FAC846]" />
                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#FAC846] rounded-full flex items-center justify-center text-xs font-bold text-[#233C4B] shadow">
                              {idx + 1}
                            </span>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="font-bold text-sm text-white truncate">{f.name}</p>
                              {idx === 0 && <span title="Top Nominee" className="text-xs">👑</span>}
                            </div>
                            <p className="text-xs text-slate-400 truncate">{candidateQualificationLabel(f)}</p>
                            <span className="inline-block bg-[#A0C382]/15 text-[#A0C382] border border-[#A0C382]/30 text-[10px] font-bold px-2 py-0.5 rounded mt-1">
                              ✓ Ready for Final Stage
                            </span>
                          </div>

                          <div className="text-right flex-shrink-0">
                            <p className="font-bold text-base text-[#FAC846] font-mono">{f.stage1Votes}</p>
                            <p className="text-[10px] text-slate-400 uppercase font-semibold">Votes</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-[#233C4B]/60 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Advancement: Confirmed</span>
                  <span className="text-[#A0C382] font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Stage 2 Finalist
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Action to view results display */}
          <div className="text-center pt-4 pb-8">
            <a
              href="/"
              className="inline-flex items-center gap-2 bg-[#FF7D2D] hover:bg-[#EA6C1E] text-white font-bold text-sm px-6 py-3.5 rounded-2xl transition shadow-xl shadow-[#FF7D2D]/20 cursor-pointer"
            >
              <Trophy className="w-4 h-4" /> View Full Real-Time Results Board
            </a>
          </div>
        </div>

        {/* Footer */}
        <footer className="px-6 py-3 border-t border-[#233C4B] bg-[#16252F] text-center text-xs text-slate-400">
          Pagadian Capitol College, Inc. · Central Student Government Election Management System
        </footer>
      </div>
    );
  }

  // =========================================================================
  // VIEW: IF PORTAL PAUSED
  // =========================================================================
  if (step !== "success" && scheduleStatus.code === "PORTAL_PAUSED") {
    return (
      <div className="min-h-screen bg-[#192B36] flex flex-col items-center justify-center p-6 text-slate-100 font-sans">
        <div className="bg-[#1E3442] border border-[#233C4B] rounded-3xl p-8 max-w-md text-center shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 flex items-center justify-center mx-auto mb-4 text-amber-400">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Voting Portal Temporarily Paused</h2>
          <p className="text-slate-300 text-xs leading-relaxed mb-6">
            The election administrator has temporarily paused the voting portal. Please refresh in a moment.
          </p>
          <button
            onClick={reloadData}
            className="w-full bg-[#FF7D2D] hover:bg-[#EA6C1E] text-white font-bold py-3 rounded-xl transition text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" /> Refresh Status
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW: ACTIVE VOTING WORKFLOW
  // =========================================================================
  return (
    <div className="min-h-screen bg-[#F8FAFB] flex flex-col font-sans text-slate-800 selection:bg-[#FF7D2D] selection:text-white">
      {/* Top Banner */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-20 shadow-xs">
        <div className="flex items-center gap-3.5">
          <AppLogo size="sm" className="ring-1 ring-slate-200" />
          <div>
            <h1 className="font-bold text-[#233C4B] text-base leading-tight">{settings.title}</h1>
            <p className="text-slate-500 text-xs">Pagadian Capitol College, Inc. · Student Voting Portal</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-[#233C4B] text-[#FAC846] border border-[#FAC846]/30 rounded-full px-3 py-1 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{scheduleStatus.stageName}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-[#A0C382]/20 border border-[#A0C382]/50 rounded-full px-3 py-1 text-xs font-bold text-[#233C4B]">
            <span className="w-2 h-2 rounded-full bg-[#5F9B8C] animate-pulse" />
            <span>Voting Active</span>
          </div>
        </div>
      </header>

      {/* Schedule Live Countdown Bar */}
      <div className="bg-[#233C4B] text-white px-6 py-2.5 flex items-center justify-between text-xs font-medium">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#FAC846]" />
          <span>
            Voting Schedule Deadline: <strong className="text-[#FAC846]">{scheduleStatus.formattedEndTime}</strong>
            {scheduleStatus.msUntilEnd > 0 && (
              <span className="ml-2 bg-white/15 px-2 py-0.5 rounded font-mono text-[#FAC846]">
                ⏳ {timeUntilEnd.hours}h {timeUntilEnd.minutes}m {timeUntilEnd.seconds}s remaining
              </span>
            )}
          </span>
        </div>
        <span className="text-slate-300 hidden sm:inline">Official PCC Student ID Verification System</span>
      </div>

      <div className="flex-1 flex items-start justify-center p-6 pt-8">
        <div className="w-full max-w-2xl">

          {/* STEP 1: Enter Student Credentials */}
          {step === "credentials" && (
            <div className="animate-slide-in">
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-2xl bg-[#233C4B] flex items-center justify-center mx-auto mb-4 shadow-md text-[#FAC846]">
                  <User className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold text-[#233C4B] mb-1">{scheduleStatus.stageName}</h2>
                <p className="text-slate-500 text-sm max-w-md mx-auto">
                  Step 1 of 2: Please enter your official student credentials.
                </p>
              </div>

              <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-6 sm:p-8 space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Student ID Number *
                  </label>
                  <input
                    type="text"
                    value={studentId}
                    onChange={e => { setStudentId(e.target.value); setError(""); }}
                    placeholder="e.g. 021-0137"
                    className="w-full border border-slate-300 rounded-xl px-4 py-3 text-slate-800 font-mono text-base font-bold focus:outline-none focus:ring-2 focus:ring-[#FF7D2D] focus:border-transparent transition"
                    autoFocus
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Printed on your Pagadian Capitol College Student ID card.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Student Full Name *
                  </label>
                  <input
                    type="text"
                    value={studentName}
                    onChange={e => { setStudentName(e.target.value); setError(""); }}
                    placeholder="e.g. Jhonamery A. Surdilla"
                    className="w-full border border-slate-300 rounded-xl px-4 py-3 text-slate-800 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-[#FF7D2D] focus:border-transparent transition"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Course Program *
                    </label>
                    <select
                      value={selectedCourse}
                      onChange={e => setSelectedCourse(e.target.value as Course)}
                      className="w-full border border-slate-300 rounded-xl px-4 py-3 text-slate-800 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#FF7D2D] focus:border-transparent bg-white"
                    >
                      {COURSES.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Year Level *
                    </label>
                    <select
                      value={yearLevel}
                      onChange={e => setYearLevel(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl px-4 py-3 text-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#FF7D2D] focus:border-transparent bg-white"
                    >
                      {YEAR_LEVELS.map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-2.5 text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <p className="text-xs font-semibold">{error}</p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleValidateCredentials}
                  className="w-full font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2 shadow-xs bg-[#FF7D2D] hover:bg-[#EA6C1E] text-white cursor-pointer"
                >
                  Proceed to Official Ballot <ChevronRight className="w-4 h-4" />
                </button>

                <p className="text-center text-slate-400 text-xs">
                  Your student credentials will be verified and recorded securely.
                </p>
              </div>
            </div>
          )}

          {/* STEP 2: ID Card Scan Verification */}
          {step === "id_verify" && (
            <div className="animate-slide-in">
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-2xl bg-[#233C4B] flex items-center justify-center mx-auto mb-4 shadow-md text-[#FAC846]">
                  <IdCard className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold text-[#233C4B] mb-1">Verify Pagadian Capitol College ID</h2>
                <p className="text-slate-500 text-sm max-w-md mx-auto">
                  Step 2 of 2: Scan or upload your PCC Student ID card to confirm voter authenticity.
                </p>
              </div>

              {/* Student Summary Pill */}
              <div className="bg-[#233C4B] text-white rounded-2xl p-4 mb-5 flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center font-bold text-[#FAC846]">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">{studentName}</p>
                    <p className="text-xs text-slate-300">ID: {studentId} • {selectedCourse} ({yearLevel})</p>
                  </div>
                </div>
                <button
                  onClick={() => { setStep("credentials"); stopCamera(); }}
                  className="text-xs text-[#FAC846] hover:underline font-bold px-2 py-1"
                >
                  Edit Info
                </button>
              </div>

              <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-6 sm:p-8 space-y-5">
                {/* Camera View / Photo Upload Canvas */}
                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-4 bg-slate-50 flex flex-col items-center justify-center relative overflow-hidden">
                  {isCameraActive ? (
                    <div className="relative w-full max-w-md aspect-video bg-black rounded-xl overflow-hidden flex items-center justify-center">
                      <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
                      <div className="absolute inset-4 border-2 border-[#FAC846] rounded-lg pointer-events-none opacity-80 flex items-center justify-center">
                        <span className="bg-black/60 text-[#FAC846] text-[11px] font-bold px-3 py-1 rounded-full">
                          Align PCC School ID Here
                        </span>
                      </div>
                    </div>
                  ) : idPhotoUrl ? (
                    <div className="relative max-w-xs rounded-xl overflow-hidden shadow-md border border-slate-200">
                      <img src={idPhotoUrl} alt="Captured School ID" className="w-full object-cover max-h-64" />
                      <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] font-bold px-2 py-1 rounded-md">
                        PCC ID Attached
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-[#233C4B]/5 flex items-center justify-center mx-auto mb-3 text-[#233C4B]">
                        <Camera className="w-6 h-6" />
                      </div>
                      <p className="font-bold text-[#233C4B] text-sm">Capture / Upload PCC Student ID</p>
                      <p className="text-slate-400 text-xs mt-1 max-w-xs">
                        Hold your student ID card up to your camera or upload a clear photo of your PCC card
                      </p>
                    </div>
                  )}

                  <canvas ref={canvasRef} className="hidden" />
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileUpload}
                    className="hidden"
                  />

                  {/* Camera / Upload buttons */}
                  <div className="flex flex-wrap gap-2 mt-4 w-full max-w-md justify-center">
                    {isCameraActive ? (
                      <>
                        <button
                          type="button"
                          onClick={capturePhotoAndScan}
                          className="flex-1 py-2.5 px-4 bg-[#FF7D2D] hover:bg-[#EA6C1E] text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-xs"
                        >
                          <Check className="w-4 h-4" /> Snap & Verify ID
                        </button>
                        <button
                          type="button"
                          onClick={stopCamera}
                          className="py-2.5 px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={startCamera}
                          className="flex-1 py-2.5 px-4 bg-[#233C4B] hover:bg-[#192B36] text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-xs"
                        >
                          <Camera className="w-4 h-4 text-[#FAC846]" /> Open Camera
                        </button>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="flex-1 py-2.5 px-4 border border-slate-300 text-slate-700 hover:bg-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2"
                        >
                          <Upload className="w-4 h-4 text-slate-500" /> Upload ID Photo
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Scanning Spinner */}
                {isScanning && (
                  <div className="bg-[#233C4B]/5 border border-[#233C4B]/20 rounded-2xl p-4 flex items-center justify-center gap-3">
                    <RefreshCw className="w-5 h-5 text-[#FF7D2D] animate-spin" />
                    <span className="text-xs font-bold text-[#233C4B]">
                      Verifying Pagadian Capitol College ID authenticity…
                    </span>
                  </div>
                )}

                {/* Verified Feedback Badge */}
                {idPhotoUrl && !isScanning && (
                  <div className="bg-[#A0C382]/20 border border-[#A0C382]/50 text-[#233C4B] rounded-2xl p-4 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider">
                        <ShieldCheck className="w-5 h-5 text-[#5F9B8C]" />
                        <span>PCC Student ID Attached</span>
                      </div>
                      <span className="bg-[#5F9B8C] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                        Verified
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 font-medium">
                      {scanResult?.isSchoolVerified
                        ? "School header matches Pagadian Capitol College, Inc."
                        : "ID image attached for voter audit record."}
                    </p>
                  </div>
                )}

                {error && (
                  <div className="flex items-start gap-2.5 text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <p className="text-xs font-semibold">{error}</p>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => { setStep("credentials"); stopCamera(); }}
                    className="py-3.5 px-4 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                  <button
                    type="button"
                    onClick={handleCompleteVerification}
                    disabled={isScanning}
                    className="flex-1 font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2 shadow-xs bg-[#FF7D2D] hover:bg-[#EA6C1E] text-white cursor-pointer"
                  >
                    {isScanning ? (
                      <><RefreshCw className="w-4 h-4 animate-spin" /> Verifying ID…</>
                    ) : (
                      <>Open Official Ballot <ChevronRight className="w-4 h-4" /></>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Ballot Selection */}
          {step === "vote" && participant && (
            <div className="animate-slide-in">
              <div className="bg-[#233C4B] rounded-2xl px-6 py-4.5 mb-6 flex items-center justify-between text-white shadow-md">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#16252F] flex items-center justify-center flex-shrink-0 text-[#FAC846] font-bold">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-base">{participant.name}</p>
                    <p className="text-slate-300 text-xs">{participant.studentId} • {participant.course} ({participant.year})</p>
                  </div>
                </div>
                <span className="bg-white/15 text-[#FAC846] text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  {currentStage === "STAGE_2_FINAL" ? "Final Ballot" : "Stage 1 Ballot"}
                </span>
              </div>

              <div className="mb-6">
                <h2 className="text-xl font-bold text-[#233C4B] mb-1">
                  {currentStage === "STAGE_2_FINAL" ? "Stage 2: Final Executive Election" : "Stage 1: Representative Nominee Vote"}
                </h2>
                <p className="text-slate-500 text-sm">
                  {currentStage === "STAGE_2_FINAL"
                    ? "Choose your final executive officer from the advancing finalists."
                    : "Nominate one Block Representative for each CSG position."}
                </p>
              </div>

              <div className="space-y-6">
                {positions.map(position => {
                  const positionCandidates = getBallotCandidatesForPosition(position);
                  const selected = selections[position];

                  // Helper to check if a candidate is already selected for another position
                  const getSelectedPositionForPerson = (c: Candidate): string | null => {
                    const cRepId = c.blockRepId || (c.id.startsWith("rep_") ? c.id.replace(/^rep_/, "") : "");
                    const cName = c.name.trim().toLowerCase();

                    for (const [pos, selectedId] of Object.entries(selections)) {
                      if (pos === position || !selectedId) continue;

                      // Check direct ID match
                      if (selectedId === c.id) return pos;

                      // Check blockRepId match
                      if (cRepId && (selectedId === `rep_${cRepId}` || selectedId.includes(cRepId))) {
                        return pos;
                      }

                      // Check candidate name match in candidates or blockReps
                      const selCand = candidates.find(cand => cand.id === selectedId || (cand.blockRepId && selectedId.includes(cand.blockRepId)));
                      if (selCand && selCand.name.trim().toLowerCase() === cName) {
                        return pos;
                      }

                      const selRep = blockReps.find(r => selectedId === `rep_${r.id}` || selectedId === r.id || selectedId.includes(r.id));
                      if (selRep && selRep.name.trim().toLowerCase() === cName) {
                        return pos;
                      }
                    }
                    return null;
                  };

                  return (
                    <div key={position} className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                      <div className={`px-5 py-3.5 border-b border-slate-100 flex items-center justify-between ${selected ? "bg-[#FF7D2D]/5" : "bg-slate-50"}`}>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-[#233C4B] text-sm uppercase tracking-wider">{position}</h3>
                          {currentStage === "STAGE_2_FINAL" && (
                            <span className="bg-[#A0C382]/20 text-[#233C4B] text-[10px] font-bold px-2 py-0.5 rounded border border-[#A0C382]/40">
                              Top 2 Finalists
                            </span>
                          )}
                        </div>
                        {selected ? (
                          <span className="flex items-center gap-1 text-[#FF7D2D] text-xs font-bold">
                            <CheckCircle className="w-4 h-4 text-[#FF7D2D]" /> Selected
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs font-medium">Select candidate</span>
                        )}
                      </div>

                      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {positionCandidates.map(c => {
                          const isSelected = selected === c.id || (c.blockRepId && selected === `rep_${c.blockRepId}`);
                          const alreadySelectedInPos = getSelectedPositionForPerson(c);
                          const isDisabled = !isSelected && Boolean(alreadySelectedInPos);

                          return (
                            <button
                              key={c.id}
                              disabled={isDisabled}
                              onClick={() => {
                                if (!isDisabled) {
                                  handleSelect(position, c.id);
                                }
                              }}
                              className={`flex items-start gap-3 p-3.5 rounded-xl border-2 transition-all text-left ${
                                isSelected
                                  ? "border-[#FF7D2D] bg-[#FF7D2D]/5 shadow-xs ring-1 ring-[#FF7D2D]/30 cursor-pointer"
                                  : isDisabled
                                  ? "border-dashed border-slate-200 bg-slate-50/70 opacity-50 cursor-not-allowed"
                                  : "border-slate-200 hover:border-[#FF7D2D]/40 hover:bg-slate-50 cursor-pointer"
                              }`}
                            >
                              <Avatar
                                src={c.photo}
                                name={c.name}
                                className={`w-11 h-11 rounded-full border border-slate-200 ${isDisabled ? "grayscale" : ""}`}
                                fallbackClassName={`bg-slate-100 text-slate-700 ${isDisabled ? "grayscale" : ""}`}
                              />
                              <div className="min-w-0 flex-1">
                                <p className={`font-bold text-sm truncate ${isSelected ? "text-[#233C4B]" : isDisabled ? "text-slate-400" : "text-slate-800"}`}>{c.name}</p>
                                <p className="text-slate-400 text-xs truncate mt-0.5">{candidateQualificationLabel(c)}</p>
                                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                  {c.partyList && (
                                    <span className="inline-block bg-slate-100 text-slate-600 text-[10px] font-semibold px-2 py-0.5 rounded">
                                      {c.partyList}
                                    </span>
                                  )}
                                  {alreadySelectedInPos && !isSelected && (
                                    <span className="inline-block bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-bold px-2 py-0.5 rounded">
                                      🔒 Selected for {alreadySelectedInPos}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {isSelected && <CheckCircle className="w-5 h-5 text-[#FF7D2D] ml-auto flex-shrink-0 mt-1" />}
                            </button>
                          );
                        })}

                        {positionCandidates.length === 0 && (
                          <p className="col-span-full py-4 text-center text-slate-400 text-xs italic">
                            No active candidates for {position} in this stage.
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {error && (
                <div className="mt-5 flex items-start gap-2 text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p className="text-sm font-medium">{error}</p>
                </div>
              )}

              <div className="mt-8 flex items-center gap-3">
                <button
                  onClick={() => setStep("credentials")}
                  className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 transition text-sm font-semibold px-3 py-2 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Change Voter Info
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={!allSelected}
                  className={`flex-1 py-3.5 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 shadow-xs ${
                    allSelected
                      ? "bg-[#FF7D2D] hover:bg-[#EA6C1E] text-white cursor-pointer"
                      : "bg-slate-200 text-slate-400 cursor-not-allowed"
                  }`}
                >
                  Review My Selections <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Confirm Selections */}
          {step === "confirm" && participant && (
            <div className="animate-slide-in">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-[#233C4B] mb-1">Confirm Official Ballot</h2>
                <p className="text-slate-500 text-sm">Please verify your chosen nominees before final submission.</p>
              </div>

              <div className="bg-[#FAC846]/15 border border-[#FAC846]/40 rounded-xl px-4 py-3 mb-5 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-[#FF7D2D] flex-shrink-0 mt-0.5" />
                <p className="text-[#233C4B] text-xs font-semibold">Once submitted, your vote is recorded officially in real time and cannot be modified.</p>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100 mb-6">
                {positions.map(position => {
                  const candidateId = selections[position];
                  const candidatesForPos = getBallotCandidatesForPosition(position);
                  const candidate = candidatesForPos.find(c =>
                    c.id === candidateId ||
                    c.blockRepId === candidateId ||
                    `rep_${c.blockRepId}` === candidateId ||
                    (candidateId && candidateId.startsWith("rep_") && candidateId.includes(c.blockRepId || c.id))
                  );
                  if (!candidate) return null;

                  return (
                    <div key={position} className="flex items-center gap-3 px-5 py-4">
                      <Avatar src={candidate.photo} name={candidate.name} className="w-10 h-10 rounded-full" fallbackClassName="bg-slate-100 text-slate-700" />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-800 text-sm">{candidate.name}</p>
                        <p className="text-slate-500 text-xs">{candidateQualificationLabel(candidate)} • {candidate.partyList}</p>
                      </div>
                      <span className="text-[#233C4B] text-xs font-bold bg-[#F1F5F7] px-3 py-1 rounded-full border border-slate-200">
                        {position}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep("vote")}
                  className="flex-1 py-3 rounded-xl border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition"
                >
                  Edit Choices
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex-1 py-3.5 rounded-xl bg-[#FF7D2D] hover:bg-[#EA6C1E] text-white font-bold text-sm transition flex items-center justify-center gap-2 shadow-xs disabled:opacity-70"
                >
                  {isSubmitting ? (
                    <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Recording Vote…</>
                  ) : (
                    <><CheckCircle className="w-4 h-4" />Cast Final Vote</>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: Success Receipt */}
          {step === "success" && (
            <div className="animate-slide-in text-center py-6">
              <div className="w-20 h-20 rounded-full bg-[#A0C382]/20 flex items-center justify-center mx-auto mb-5 shadow-xs text-[#5F9B8C]">
                <CheckCircle className="w-10 h-10 text-[#5F9B8C]" />
              </div>
              <h2 className="text-2xl font-bold text-[#233C4B] mb-2">Vote Recorded in Real-Time!</h2>
              <p className="text-slate-600 mb-1">Thank you, <strong>{participant?.name}</strong>.</p>
              <p className="text-slate-500 text-sm">Your vote for {scheduleStatus.stageName} has been encrypted and counted into the live tally.</p>

              <div className="mt-8 bg-white rounded-2xl border border-slate-200 shadow-xs p-6 text-left max-w-md mx-auto">
                <div className="flex items-center gap-2 text-[#233C4B] font-bold text-sm mb-1">
                  <Award className="w-4 h-4 text-[#FAC846]" /> Parliamentary Receipt
                </div>
                <p className="text-slate-500 text-xs">Voter ID: <span className="font-mono font-semibold text-[#233C4B]">{participant?.studentId}</span></p>
                <p className="text-slate-500 text-xs mt-0.5">Program: <span className="font-semibold text-[#233C4B]">{participant?.course}</span></p>
                <p className="text-slate-500 text-xs mt-0.5">Stage: <span className="font-semibold text-[#233C4B]">{currentStage}</span></p>
                <p className="text-slate-400 text-xs mt-3 pt-3 border-t border-slate-100">Live leaderboards have updated automatically.</p>
              </div>

              <a
                href="/"
                className="mt-6 inline-flex items-center gap-2 text-[#233C4B] hover:text-[#FF7D2D] font-bold text-sm transition"
              >
                <ArrowLeft className="w-4 h-4" /> View Live Results Display
              </a>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
