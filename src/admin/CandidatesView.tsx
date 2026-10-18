import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, X, Check, Award, ArrowRight, CheckCircle2, RotateCcw } from "lucide-react";
import {
  getCandidates,
  addCandidate,
  updateCandidate,
  deleteCandidate,
  getPositions,
  getSettings,
  setElectionStage,
  advanceStage1Winners,
  toggleCandidateFinalist,
  refreshFromServer,
  saveAndReload,
  subscribeToStore,
  COURSES,
  BLOCK_OFFICES,
  candidateQualificationLabel,
} from "../data/store";
import type { Candidate, ElectionStage } from "../data/store";
import Avatar from "../components/Avatar";

const emptyForm = (position = "") => ({
  name: "",
  position,
  partyList: "",
  photo: "",
  course: COURSES[0],
  year: "3rd Year",
  block: "Block A",
  blockOffice: BLOCK_OFFICES[0],
});

export default function CandidatesView() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [positions, setPositions] = useState<string[]>([]);
  const [stage, setStage] = useState<ElectionStage>("STAGE_1_NOMINATION");
  const [topCount, setTopCount] = useState<number>(2);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Candidate | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  const reloadList = () => {
    setCandidates(getCandidates());
    setPositions(getPositions());
    const settings = getSettings();
    setStage(settings.currentStage);
    setTopCount(settings.topFinalistsCount || 2);
  };

  const refresh = async () => {
    await refreshFromServer();
    reloadList();
  };

  useEffect(() => {
    refresh();
    const unsubscribe = subscribeToStore(reloadList);
    const iv = setInterval(() => {
      refreshFromServer().then(reloadList).catch(() => {});
    }, 1500);
    return () => {
      unsubscribe();
      clearInterval(iv);
    };
  }, []);

  const openAdd = (position?: string) => {
    const latest = getPositions();
    setPositions(latest);
    setEditing(null);
    setForm(emptyForm(position ?? latest[0] ?? ""));
    setFormError("");
    setShowModal(true);
  };

  const openEdit = (c: Candidate) => {
    setPositions(getPositions());
    setEditing(c);
    setForm({
      name: c.name,
      position: c.position,
      partyList: c.partyList,
      photo: c.photo,
      course: c.course || COURSES[0],
      year: c.year || "3rd Year",
      block: c.block || "Block A",
      blockOffice: c.blockOffice || BLOCK_OFFICES[0],
    });
    setFormError("");
    setShowModal(true);
  };

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setFormError("");
    const name = form.name.trim();
    const position = form.position.trim();
    const partyList = form.partyList.trim() || "Independent";
    const course = form.course.trim();
    const blockOffice = form.blockOffice.trim();

    if (!name) { setFormError("Please enter full name."); return; }
    if (!position) { setFormError("Please select a CSG position."); return; }
    if (!positions.includes(position)) { setFormError(`"${position}" is not a valid position.`); return; }

    const payload = {
      name,
      position,
      partyList,
      course,
      year: form.year,
      block: form.block,
      blockOffice,
      photo: form.photo.trim() && !form.photo.includes("pravatar.cc") ? form.photo.trim() : "",
    };

    setSaving(true);
    try {
      if (editing) {
        updateCandidate(editing.id, payload);
      } else {
        addCandidate(payload);
      }
      await saveAndReload();
      reloadList();
      setShowModal(false);
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this candidate?")) return;
    deleteCandidate(id);
    await saveAndReload();
    reloadList();
  };

  const handleAdvanceStage1 = async () => {
    if (!confirm(`Calculate Stage 1 votes and automatically advance the Top ${topCount} candidates per position as finalists for Stage 2 Final Voting?`)) return;
    advanceStage1Winners(topCount);
    await saveAndReload();
    reloadList();
  };

  const handleToggleFinalist = async (candidateId: string) => {
    toggleCandidateFinalist(candidateId);
    await saveAndReload();
    reloadList();
  };

  const handleSetStage = async (newStage: ElectionStage) => {
    setElectionStage(newStage);
    await saveAndReload();
    reloadList();
  };

  const grouped = positions.map(pos => ({
    position: pos,
    candidates: candidates.filter(c => c.position === pos),
  }));

  const steps: { stage: ElectionStage; label: string; desc: string }[] = [
    { stage: "STAGE_0_ROSTER", label: "Stage 0: Roster", desc: "Block Reps Input" },
    { stage: "STAGE_1_NOMINATION", label: "Stage 1: Primary", desc: "Nominee Voting" },
    { stage: "STAGE_2_FINAL", label: "Stage 2: Final", desc: "Top 2 Election" },
    { stage: "COMPLETED", label: "Winners", desc: "Final Results" },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#233C4B]">Parliamentary Election & Candidates</h1>
          <p className="text-slate-500 text-sm max-w-2xl mt-0.5">
            Manage candidates nominated from elected Block Representatives across Stage 1 (Primary) and Stage 2 (Final Executive Election).
          </p>
        </div>
        <button
          onClick={() => openAdd()}
          className="flex items-center gap-2 bg-[#FF7D2D] hover:bg-[#EA6C1E] text-white text-sm font-bold px-4 py-2.5 rounded-xl transition shadow-xs"
        >
          <Plus className="w-4 h-4" /> Add Candidate
        </button>
      </div>

      {/* Parliamentary Stage Stepper */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Current Parliamentary Election Stage</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {steps.map((s, idx) => {
            const isActive = stage === s.stage;
            return (
              <button
                key={s.stage}
                onClick={() => handleSetStage(s.stage)}
                className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between ${
                  isActive
                    ? "border-[#233C4B] bg-[#233C4B] text-white shadow-sm"
                    : "border-slate-200 hover:border-slate-300 bg-slate-50/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold ${isActive ? "text-[#FAC846]" : "text-slate-400"}`}>Step {idx + 1}</span>
                  {isActive && <CheckCircle2 className="w-4 h-4 text-[#A0C382]" />}
                </div>
                <div className="mt-2">
                  <p className={`font-bold text-sm ${isActive ? "text-white" : "text-slate-800"}`}>{s.label}</p>
                  <p className={`text-xs mt-0.5 ${isActive ? "text-slate-300" : "text-slate-500"}`}>{s.desc}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Stage Action Controls */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-slate-700">
            <Award className="w-4 h-4 text-[#FF7D2D]" />
            <span>Advancement Rule: <strong>Top {topCount} Candidates</strong> per position automatically qualify for Stage 2</span>
          </div>

          {stage === "STAGE_1_NOMINATION" && (
            <button
              onClick={handleAdvanceStage1}
              className="bg-[#5F9B8C] hover:bg-[#4E8376] text-white font-bold text-sm px-4 py-2.5 rounded-xl transition flex items-center gap-2 shadow-xs"
            >
              Advance Top {topCount} Candidates to Stage 2 Final <ArrowRight className="w-4 h-4" />
            </button>
          )}

          {stage === "STAGE_2_FINAL" && (
            <button
              onClick={() => handleSetStage("COMPLETED")}
              className="bg-[#233C4B] hover:bg-[#192B36] text-[#FAC846] font-bold text-sm px-4 py-2.5 rounded-xl transition flex items-center gap-2 shadow-xs"
            >
              Finalize Stage 2 & Announce Winners <Award className="w-4 h-4" />
            </button>
          )}

          {stage === "COMPLETED" && (
            <button
              onClick={() => handleSetStage("STAGE_1_NOMINATION")}
              className="border border-slate-300 text-slate-700 font-semibold text-xs px-3 py-2 rounded-xl hover:bg-slate-50 transition flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" /> Re-open Stage 1 Voting
            </button>
          )}
        </div>
      </div>

      {/* Candidate List Grouped By Position */}
      <div className="space-y-6">
        {grouped.map(({ position, candidates: positionCandidates }) => (
          <div key={position} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-[#233C4B] text-base">{position}</h2>
                <span className="text-xs text-slate-500 font-medium">({positionCandidates.length} nominated)</span>
              </div>
              <button
                onClick={() => openAdd(position)}
                className="flex items-center gap-1.5 text-[#FF7D2D] hover:text-[#EA6C1E] text-xs font-bold hover:bg-[#FF7D2D]/5 px-3 py-1.5 rounded-lg transition"
              >
                <Plus className="w-3.5 h-3.5" /> Add Candidate
              </button>
            </div>

            {positionCandidates.length === 0 ? (
              <div className="px-5 py-8 text-center text-slate-400 text-sm">
                No candidates nominated for {position} yet. Click &quot;Add Candidate&quot; or nominate from Block Representatives.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {positionCandidates.map(c => {
                  return (
                    <div key={c.id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 hover:bg-slate-50/60 transition">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <Avatar
                          src={c.photo}
                          name={c.name}
                          className="w-12 h-12 rounded-full border border-slate-200"
                          fallbackClassName="bg-slate-100 text-slate-700"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-[#233C4B] text-base">{c.name}</p>
                            {c.isFinalist ? (
                              <span className="bg-[#A0C382]/20 text-[#233C4B] font-bold text-xs px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-[#A0C382]/40">
                                <Award className="w-3 h-3 text-[#5F9B8C]" /> Top 2 Finalist
                              </span>
                            ) : (
                              <span className="bg-slate-100 text-slate-600 font-semibold text-xs px-2.5 py-0.5 rounded-full">
                                Stage 1 Nominee
                              </span>
                            )}
                          </div>
                          <p className="text-slate-500 text-xs mt-0.5">{candidateQualificationLabel(c)}</p>
                          <p className="text-slate-400 text-xs mt-0.5">Party: {c.partyList}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        {/* Stage Votes Summary */}
                        <div className="flex items-center gap-4 text-center">
                          <div className="bg-[#233C4B]/5 border border-slate-200 rounded-xl px-3 py-1.5">
                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Stage 1</p>
                            <p className="font-bold text-[#233C4B] text-sm">{c.stage1Votes || 0}</p>
                          </div>
                          <div className="bg-[#FAC846]/10 border border-[#FAC846]/30 rounded-xl px-3 py-1.5">
                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Stage 2</p>
                            <p className="font-bold text-[#233C4B] text-sm">{c.stage2Votes || 0}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleFinalist(c.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                              c.isFinalist
                                ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                                : "bg-[#A0C382]/20 text-[#233C4B] hover:bg-[#A0C382]/30"
                            }`}
                          >
                            {c.isFinalist ? "Demote from Finalists" : "Promote to Top 2 Finalist"}
                          </button>
                          <button onClick={() => openEdit(c)} className="p-2 text-slate-400 hover:text-[#233C4B] hover:bg-slate-100 rounded-lg transition">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(c.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal Add/Edit Candidate */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-[#233C4B] text-lg">{editing ? "Edit Candidate" : "Add CSG Candidate"}</h2>
              <button type="button" onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 p-1"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSave}>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Full Name *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7D2D] focus:border-transparent" placeholder="e.g. Maria Santos" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">CSG Position *</label>
                  <select
                    value={positions.includes(form.position) ? form.position : positions[0] ?? ""}
                    onChange={e => setForm(f => ({ ...f, position: e.target.value }))}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7D2D] focus:border-transparent"
                  >
                    {positions.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Course *</label>
                    <select value={form.course} onChange={e => setForm(f => ({ ...f, course: e.target.value }))} className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7D2D] focus:border-transparent">
                      {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Block Office</label>
                    <select value={form.blockOffice} onChange={e => setForm(f => ({ ...f, blockOffice: e.target.value }))} className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7D2D] focus:border-transparent">
                      {BLOCK_OFFICES.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Party / Alliance</label>
                  <input value={form.partyList} onChange={e => setForm(f => ({ ...f, partyList: e.target.value }))} className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7D2D] focus:border-transparent" placeholder="e.g. Unity Party" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Photo URL</label>
                  <input value={form.photo} onChange={e => setForm(f => ({ ...f, photo: e.target.value }))} className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7D2D] focus:border-transparent" placeholder="https://..." />
                </div>

                {formError && (
                  <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-3 py-2">{formError}</p>
                )}
              </div>
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition">Cancel</button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-[#FF7D2D] hover:bg-[#EA6C1E] text-white text-sm font-bold transition flex items-center justify-center gap-2 shadow-xs"
                >
                  <Check className="w-4 h-4" /> {saving ? "Saving…" : editing ? "Save Changes" : "Add Candidate"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
