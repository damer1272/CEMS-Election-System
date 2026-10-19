import { useState, useEffect } from "react";
import {
  Save,
  Power,
  Plus,
  Trash2,
  RotateCcw,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  Globe,
  Award,
  AlertTriangle,
  Layers,
  Radio
} from "lucide-react";
import {
  getSettings,
  getPositions,
  updateSettings,
  updatePositions,
  toggleElection,
  setElectionStage,
  advanceStage1Winners,
  getCandidates,
  resetAllVotes,
  startFromBeginning,
  syncFromLocalStorage,
  refreshFromServer,
  subscribeToStore
} from "../data/store";
import type { ElectionSettings, ElectionStage } from "../data/store";

export default function SettingsView() {
  const [form, setForm] = useState<ElectionSettings | null>(() => getSettings());
  const [positionList, setPositionList] = useState<string[]>(() => getPositions());
  const [saved, setSaved] = useState(false);
  const [generalSaved, setGeneralSaved] = useState(false);
  const [positionsSaved, setPositionsSaved] = useState(false);
  const [positionError, setPositionError] = useState("");
  const [votesReset, setVotesReset] = useState(false);
  const [cleanReset, setCleanReset] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");

  useEffect(() => {
    const trySync = async () => {
      const synced = await syncFromLocalStorage();
      if (synced) {
        await refreshFromServer();
        setForm(getSettings());
        setPositionList(getPositions());
        setSyncMessage("Your edits were synced with local and shared storage.");
        setTimeout(() => setSyncMessage(""), 5000);
      }
    };
    trySync();
    setForm(getSettings());
    setPositionList(getPositions());

    const unsubscribe = subscribeToStore(() => {
      setForm(getSettings());
      setPositionList(getPositions());
    });
    return () => unsubscribe();
  }, []);

  if (!form) return null;

  const handleSave = () => {
    updateSettings(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleSaveGeneral = () => {
    updateSettings(form);
    setGeneralSaved(true);
    setTimeout(() => setGeneralSaved(false), 2500);
  };

  const handleStageSwitch = (stage: ElectionStage) => {
    setElectionStage(stage);
    setForm(getSettings());
  };

  const handleSetPresetStartNow = () => {
    const now = new Date();
    const end = new Date(Date.now() + 3600000); // 1 hour
    const nowStr = now.toISOString().substring(0, 16);
    const endStr = end.toISOString().substring(0, 16);
    const updated = {
      ...form,
      currentStage: "STAGE_1_NOMINATION" as ElectionStage,
      isOpen: true,
      stage1StartDate: nowStr,
      stage1EndDate: endStr,
      startDate: nowStr,
      endDate: endStr,
    };
    setForm(updated);
    updateSettings(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleSetPresetCountdown = () => {
    const future = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes from now
    const end = new Date(Date.now() + 60 * 60 * 1000);
    const startStr = future.toISOString().substring(0, 16);
    const endStr = end.toISOString().substring(0, 16);
    const updated = {
      ...form,
      currentStage: "STAGE_1_NOMINATION" as ElectionStage,
      isOpen: true,
      stage1StartDate: startStr,
      stage1EndDate: endStr,
      startDate: startStr,
      endDate: endStr,
    };
    setForm(updated);
    updateSettings(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleSetPresetStage2Now = () => {
    const now = new Date();
    const end = new Date(Date.now() + 3600000);
    const nowStr = now.toISOString().substring(0, 16);
    const endStr = end.toISOString().substring(0, 16);
    const pastStart = new Date(Date.now() - 7200000).toISOString().substring(0, 16);
    const pastEnd = new Date(Date.now() - 3600000).toISOString().substring(0, 16);
    const updated = {
      ...form,
      currentStage: "STAGE_2_FINAL" as ElectionStage,
      isOpen: true,
      stage1StartDate: pastStart,
      stage1EndDate: pastEnd,
      stage2StartDate: nowStr,
      stage2EndDate: endStr,
      startDate: nowStr,
      endDate: endStr,
    };
    advanceStage1Winners(form.topFinalistsCount || 2);
    setForm(updated);
    updateSettings(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleSetPresetStage2Countdown = () => {
    const future = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes from now
    const end = new Date(Date.now() + 60 * 60 * 1000);
    const startStr = future.toISOString().substring(0, 16);
    const endStr = end.toISOString().substring(0, 16);
    const pastStart = new Date(Date.now() - 7200000).toISOString().substring(0, 16);
    const pastEnd = new Date(Date.now() - 60000).toISOString().substring(0, 16);
    const updated = {
      ...form,
      currentStage: "STAGE_2_FINAL" as ElectionStage,
      isOpen: true,
      stage1StartDate: pastStart,
      stage1EndDate: pastEnd,
      stage2StartDate: startStr,
      stage2EndDate: endStr,
      startDate: startStr,
      endDate: endStr,
    };
    advanceStage1Winners(form.topFinalistsCount || 2);
    setForm(updated);
    updateSettings(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleSavePositions = () => {
    setPositionError("");
    const trimmed = positionList.map(p => p.trim()).filter(Boolean);
    if (trimmed.length === 0) {
      setPositionError("At least one position is required.");
      return;
    }
    const duplicates = trimmed.filter((p, i) => trimmed.indexOf(p) !== i);
    if (duplicates.length > 0) {
      setPositionError("Each position must have a unique name.");
      return;
    }

    const current = getPositions();
    const removed = current.filter((oldName, i) => {
      if (trimmed.includes(oldName)) return false;
      if (i < trimmed.length && trimmed[i] !== oldName) return false;
      return true;
    });

    const hasCandidatesOnRemoved = removed.some(pos =>
      getCandidates().some(c => c.position === pos)
    );
    if (hasCandidatesOnRemoved) {
      setPositionError(`Cannot remove position with assigned candidates.`);
      return;
    }

    if (!updatePositions(trimmed)) {
      setPositionError("Could not save positions.");
      return;
    }
    setPositionList(getPositions());
    setPositionsSaved(true);
    setTimeout(() => setPositionsSaved(false), 2000);
  };

  const handleToggle = () => {
    toggleElection();
    setForm(getSettings());
  };

  const handleResetVotes = () => {
    if (!confirm("Reset ALL votes across Stage 1 and Stage 2? This clears every vote tally.")) return;
    resetAllVotes();
    setVotesReset(true);
    setTimeout(() => setVotesReset(false), 2500);
  };

  const handleStartFromBeginning = () => {
    if (!confirm("Are you sure you want to reset everything to the beginning? This will clear all Block Representatives, CSG candidates, and votes so you can start fresh with a clean roster.")) return;
    startFromBeginning();
    setForm(getSettings());
    setPositionList(getPositions());
    setCleanReset(true);
    setTimeout(() => setCleanReset(false), 3000);
  };

  const updatePositionAt = (index: number, value: string) => {
    setPositionList(list => list.map((p, i) => (i === index ? value : p)));
  };

  const addPosition = () => {
    setPositionList(list => [...list, ""]);
  };

  const removePosition = (index: number) => {
    setPositionList(list => list.filter((_, i) => i !== index));
  };

  const stagesList = [
    {
      id: "STAGE_0_ROSTER" as ElectionStage,
      label: "Stage 0: Roster",
      desc: "Admin inputs Block Reps roster",
      pill: "Setup Phase"
    },
    {
      id: "STAGE_1_NOMINATION" as ElectionStage,
      label: "Stage 1: Primary",
      desc: "Preliminary student voting",
      pill: "Primary Ballot"
    },
    {
      id: "STAGE_2_FINAL" as ElectionStage,
      label: "Stage 2: Final",
      desc: "Top finalists head-to-head",
      pill: "Final Executive"
    },
    {
      id: "COMPLETED" as ElectionStage,
      label: "Completed",
      desc: "Winners proclaimed & verified",
      pill: "Concluded"
    },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full pb-24">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl lg:text-3xl font-bold text-[#233C4B] tracking-tight">
              Election Settings & Parliamentary Schedules
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1.5 bg-[#233C4B]/10 text-[#233C4B] text-xs font-bold px-3 py-1 rounded-full border border-[#233C4B]/20">
              <Layers className="w-3.5 h-3.5 text-[#FF7D2D]" /> Central Control
            </span>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            Configure parliamentary voting stages, deadlines, executive office titles, and global portal controls.
          </p>
        </div>

        {syncMessage && (
          <div className="flex items-center gap-2 bg-[#A0C382]/20 border border-[#A0C382]/60 text-[#233C4B] text-xs font-semibold px-3.5 py-2 rounded-xl shadow-xs">
            <CheckCircle2 className="w-4 h-4 text-[#5F9B8C]" />
            <span>{syncMessage}</span>
          </div>
        )}
      </div>

      {/* Global Voting Portal Hero Banner */}
      <div
        className={`rounded-2xl border p-5 sm:p-6 transition-all shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5 ${
          form.isOpen
            ? "bg-gradient-to-r from-[#A0C382]/15 via-[#5F9B8C]/10 to-white border-[#5F9B8C]/40"
            : "bg-gradient-to-r from-slate-100 via-slate-50 to-white border-slate-200"
        }`}
      >
        <div className="flex items-start sm:items-center gap-4">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-xs ${
              form.isOpen
                ? "bg-[#5F9B8C] text-white ring-4 ring-[#5F9B8C]/20"
                : "bg-slate-300 text-slate-600"
            }`}
          >
            <Radio className={`w-6 h-6 ${form.isOpen ? "animate-pulse" : ""}`} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                System Master Control
              </span>
              <span
                className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 ${
                  form.isOpen
                    ? "bg-[#5F9B8C] text-white"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${form.isOpen ? "bg-white animate-ping" : "bg-slate-400"}`} />
                {form.isOpen ? "VOTING PORTAL OPEN" : "VOTING PORTAL CLOSED"}
              </span>
            </div>
            <h2 className="text-lg font-bold text-[#233C4B] mt-0.5">
              {form.isOpen
                ? "Students and electors can access the ballot and submit votes"
                : "Voting portal is locked — Students will see the countdown or standby screen"}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end md:self-center">
          <button
            onClick={handleToggle}
            className={`flex items-center gap-2 font-bold text-sm px-6 py-3 rounded-xl transition shadow-sm cursor-pointer ${
              form.isOpen
                ? "bg-red-500 hover:bg-red-600 text-white shadow-red-500/20"
                : "bg-[#5F9B8C] hover:bg-[#4E8376] text-white shadow-[#5F9B8C]/20"
            }`}
          >
            <Power className="w-4 h-4" />
            {form.isOpen ? "Turn Portal OFF (Lock)" : "Turn Portal ON (Open)"}
          </button>
        </div>
      </div>

      {/* Main Responsive Grid Layout (Full Screen Width) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* LEFT / PRIMARY COLUMN: Parliamentary Stages & Schedules (7 cols on xl) */}
        <div className="xl:col-span-7 space-y-6">
          {/* Parliamentary Voting Schedules Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#FF7D2D]/10 flex items-center justify-center text-[#FF7D2D]">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-[#233C4B] text-base">Parliamentary Voting Schedules</h2>
                  <p className="text-slate-500 text-xs">Manage timeline, active phase, and transition dates</p>
                </div>
              </div>
              <span className="text-xs bg-[#233C4B]/5 text-[#233C4B] font-bold px-3 py-1 rounded-lg border border-[#233C4B]/10">
                Stage {form.currentStage.replace("STAGE_", "").replace("_", " ")}
              </span>
            </div>

            {/* Active Parliamentary Stage Switcher */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#FF7D2D]" /> Active Parliamentary Stage
                </label>
                <span className="text-[11px] text-slate-400">Click any stage to manually override current phase</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {stagesList.map(st => {
                  const isActive = form.currentStage === st.id;
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => handleStageSwitch(st.id)}
                      className={`p-3.5 rounded-xl border text-left transition relative flex flex-col justify-between cursor-pointer ${
                        isActive
                          ? "bg-[#233C4B] text-white border-[#233C4B] shadow-sm ring-2 ring-[#FAC846]/40"
                          : "bg-slate-50/60 hover:bg-slate-50 text-slate-700 border-slate-200"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className={`text-xs font-bold ${isActive ? "text-[#FAC846]" : "text-[#233C4B]"}`}>
                          {st.label}
                        </span>
                        {isActive ? (
                          <span className="flex items-center gap-1 text-[11px] font-bold bg-[#FAC846] text-[#233C4B] px-2 py-0.5 rounded-md">
                            <CheckCircle2 className="w-3 h-3" /> Active
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-slate-400 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                            {st.pill}
                          </span>
                        )}
                      </div>
                      <p className={`text-[11px] leading-tight ${isActive ? "text-slate-300" : "text-slate-500"}`}>
                        {st.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Testing & Schedule Presets Bar */}
            <div className="bg-gradient-to-r from-slate-50 to-slate-100/70 border border-slate-200 rounded-xl p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#FF7D2D]" /> Quick Schedule Presets (Testing & Instant Demo)
                </span>
                <span className="text-[10px] bg-white border border-slate-200 text-slate-500 px-2 py-0.5 rounded font-medium">
                  One-click actions
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Instantly populate date and time triggers to demonstrate active voting, student portal countdowns, or finalist timeouts.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSetPresetStartNow}
                  className="py-2.5 px-3 bg-[#233C4B] hover:bg-[#192B36] text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>🚀 Start Stage 1 Now</span>
                </button>
                <button
                  type="button"
                  onClick={handleSetPresetCountdown}
                  className="py-2.5 px-3 bg-[#FAC846] hover:bg-[#F0BE3C] text-[#233C4B] text-xs font-bold rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>⏳ Stage 1 (2-Min)</span>
                </button>
                <button
                  type="button"
                  onClick={handleSetPresetStage2Now}
                  className="py-2.5 px-3 bg-[#5F9B8C] hover:bg-[#4E8376] text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>⚡ Auto Stage 2 Now</span>
                </button>
                <button
                  type="button"
                  onClick={handleSetPresetStage2Countdown}
                  className="py-2.5 px-3 bg-[#FF7D2D] hover:bg-[#EA6C1E] text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>⏱️ Stage 2 (2-Min)</span>
                </button>
              </div>
            </div>

            {/* Stage 1 Schedule Box */}
            <div className="border border-[#233C4B]/20 bg-[#233C4B]/[0.03] rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-[#233C4B]/10 pb-2.5">
                <div>
                  <h3 className="font-bold text-[#233C4B] text-sm">Stage 1: Primary Representative Election Schedule</h3>
                  <p className="text-slate-500 text-xs">Voters select nominated Block Representatives to qualify for finals</p>
                </div>
                <span className="text-xs bg-white text-[#233C4B] border border-slate-200 font-bold px-2.5 py-1 rounded-lg shadow-2xs">
                  Primary Phase
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="min-w-0">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 truncate">
                    Stage 1 Start Date & Time
                  </label>
                  <div className="relative min-w-0 w-full">
                    <input
                      type="datetime-local"
                      value={form.stage1StartDate}
                      onChange={e => setForm(f => f ? { ...f, stage1StartDate: e.target.value } : f)}
                      className="w-full min-w-0 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#FF7D2D] focus:border-transparent transition"
                    />
                    {!form.stage1StartDate && (
                      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-xs sm:text-sm text-slate-400 select-none flex items-center gap-1.5 truncate pr-8">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="truncate">Select start date & time</span>
                      </span>
                    )}
                  </div>
                </div>
                <div className="min-w-0">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 truncate">
                    Stage 1 Deadline (End Date & Time)
                  </label>
                  <div className="relative min-w-0 w-full">
                    <input
                      type="datetime-local"
                      value={form.stage1EndDate}
                      onChange={e => setForm(f => f ? { ...f, stage1EndDate: e.target.value } : f)}
                      className="w-full min-w-0 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#FF7D2D] focus:border-transparent transition"
                    />
                    {!form.stage1EndDate && (
                      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-xs sm:text-sm text-slate-400 select-none flex items-center gap-1.5 truncate pr-8">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="truncate">Select end date & time</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Stage 2 Schedule Box */}
            <div className="border border-[#FF7D2D]/25 bg-[#FF7D2D]/[0.03] rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-[#FF7D2D]/10 pb-2.5">
                <div>
                  <h3 className="font-bold text-[#233C4B] text-sm">Stage 2: Final Executive Election Schedule</h3>
                  <p className="text-slate-500 text-xs">Voters cast decisive ballots among top-voted finalists</p>
                </div>
                <span className="text-xs bg-white text-[#FF7D2D] border border-orange-200 font-bold px-2.5 py-1 rounded-lg shadow-2xs">
                  Finals Phase
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="min-w-0">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 truncate">
                    Stage 2 Start Date & Time
                  </label>
                  <div className="relative min-w-0 w-full">
                    <input
                      type="datetime-local"
                      value={form.stage2StartDate}
                      onChange={e => setForm(f => f ? { ...f, stage2StartDate: e.target.value } : f)}
                      className="w-full min-w-0 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#FF7D2D] focus:border-transparent transition"
                    />
                    {!form.stage2StartDate && (
                      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-xs sm:text-sm text-slate-400 select-none flex items-center gap-1.5 truncate pr-8">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="truncate">Select start date & time</span>
                      </span>
                    )}
                  </div>
                </div>
                <div className="min-w-0">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 truncate">
                    Stage 2 Deadline (Final End Date & Time)
                  </label>
                  <div className="relative min-w-0 w-full">
                    <input
                      type="datetime-local"
                      value={form.stage2EndDate}
                      onChange={e => setForm(f => f ? { ...f, stage2EndDate: e.target.value } : f)}
                      className="w-full min-w-0 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#FF7D2D] focus:border-transparent transition"
                    />
                    {!form.stage2EndDate && (
                      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-xs sm:text-sm text-slate-400 select-none flex items-center gap-1.5 truncate pr-8">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="truncate">Select final deadline</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Advancement Finalists Count Setting */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-[#FF7D2D]" /> Top Finalists Advancing Policy
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Number of top-voted candidates per position that automatically qualify for Stage 2
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={form.topFinalistsCount || 2}
                  onChange={e => setForm(f => f ? { ...f, topFinalistsCount: Math.max(1, parseInt(e.target.value) || 2) } : f)}
                  className="w-20 border border-slate-300 rounded-xl px-3 py-2 text-sm text-center font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#FF7D2D] focus:border-transparent"
                />
                <span className="text-xs font-bold text-slate-600">candidates</span>
              </div>
            </div>

            <button
              onClick={handleSave}
              className="w-full flex items-center justify-center gap-2 bg-[#FF7D2D] hover:bg-[#EA6C1E] text-white font-bold py-3.5 px-6 rounded-xl transition shadow-sm cursor-pointer text-sm"
            >
              <Save className="w-4 h-4" />
              {saved ? "Schedules & Settings Saved Successfully!" : "Save Schedules & Stage Settings"}
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: General Details, Officer Positions & Danger Zone (5 cols on xl) */}
        <div className="xl:col-span-5 space-y-6">
          {/* General Information Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <div className="w-8 h-8 rounded-lg bg-[#233C4B]/10 flex items-center justify-center text-[#233C4B]">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-bold text-[#233C4B] text-sm">General Information & QR Access</h2>
                <p className="text-slate-500 text-xs">Public portal identity and voter QR endpoints</p>
              </div>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Election Title</label>
                <input
                  value={form.title}
                  onChange={e => setForm(f => f ? { ...f, title: e.target.value } : f)}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#FF7D2D] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Organization / School Name</label>
                <input
                  value={form.organization}
                  onChange={e => setForm(f => f ? { ...f, organization: e.target.value } : f)}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#FF7D2D] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Public URL for QR Codes</label>
                <input
                  value={form.publicUrl}
                  onChange={e => setForm(f => f ? { ...f, publicUrl: e.target.value } : f)}
                  placeholder="http://192.168.1.100:8443"
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-[#FF7D2D] focus:border-transparent"
                />
                <p className="text-[11px] text-slate-400 mt-1">Used to generate student mobile QR ballots</p>
              </div>

              <button
                onClick={handleSaveGeneral}
                className="w-full flex items-center justify-center gap-2 bg-[#233C4B] hover:bg-[#192B36] text-white font-bold py-2.5 rounded-xl transition text-xs shadow-xs cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                {generalSaved ? "General Details Saved!" : "Save General Details"}
              </button>
            </div>
          </div>

          {/* CSG Executive Officer Positions Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="font-bold text-[#233C4B] text-sm">CSG Executive Officer Positions</h2>
                <p className="text-slate-500 text-xs">Positions contested during Stage 1 and Stage 2</p>
              </div>
              <span className="text-xs font-bold text-[#FF7D2D] bg-[#FF7D2D]/10 px-2.5 py-1 rounded-lg">
                {positionList.length} Titles
              </span>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {positionList.map((position, index) => (
                <div key={index} className="flex items-center gap-2 group">
                  <span className="text-slate-400 text-xs font-mono w-5 text-right flex-shrink-0">{index + 1}.</span>
                  <input
                    value={position}
                    onChange={e => updatePositionAt(index, e.target.value)}
                    placeholder="e.g. Prime Minister"
                    className="flex-1 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#FF7D2D] focus:border-transparent bg-white group-hover:border-slate-400 transition"
                  />
                  <button
                    type="button"
                    onClick={() => removePosition(index)}
                    disabled={positionList.length <= 1}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
                    title="Remove position"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={addPosition}
                className="flex items-center gap-1.5 text-[#FF7D2D] hover:text-[#EA6C1E] text-xs font-bold transition cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add Officer Position
              </button>
            </div>

            {positionError && (
              <p className="text-red-600 text-xs bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                {positionError}
              </p>
            )}

            <button
              onClick={handleSavePositions}
              className="w-full flex items-center justify-center gap-2 bg-[#233C4B] hover:bg-[#192B36] text-white font-bold py-2.5 rounded-xl transition text-xs shadow-xs cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              {positionsSaved ? "Positions Saved!" : "Save Officer Positions"}
            </button>
          </div>

          {/* Danger Zone */}
          <div className="bg-red-50/40 rounded-2xl border border-red-200 p-5 space-y-4 shadow-2xs">
            <div className="flex items-center gap-2 text-red-600 pb-2 border-b border-red-200/60">
              <AlertTriangle className="w-4 h-4" />
              <h2 className="font-bold text-sm">Danger Zone</h2>
            </div>

            <div className="space-y-3">
              <div className="bg-white border border-red-100 rounded-xl p-3.5">
                <p className="font-bold text-xs text-slate-800">Reset Votes</p>
                <p className="text-slate-500 text-[11px] mb-2 leading-relaxed">
                  Clears all student vote ballots across Stage 1 and Stage 2 without altering candidates.
                </p>
                <button
                  type="button"
                  onClick={handleResetVotes}
                  className="flex items-center justify-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-300 font-bold py-2 px-3 rounded-lg transition text-xs cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  {votesReset ? "Votes Cleared!" : "Reset All Votes"}
                </button>
              </div>

              <div className="bg-white border border-red-100 rounded-xl p-3.5">
                <p className="font-bold text-xs text-slate-800">Start from Beginning (Clean Slate)</p>
                <p className="text-slate-500 text-[11px] mb-2 leading-relaxed">
                  Wipes all Block Representatives, CSG candidates, and votes to allow fresh roster entry.
                </p>
                <button
                  type="button"
                  onClick={handleStartFromBeginning}
                  className="flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-3 rounded-lg transition text-xs shadow-xs cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {cleanReset ? "System Reset to Clean State!" : "Reset to Beginning (Wipe Roster & Votes)"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
