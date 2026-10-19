import { useState, useEffect, useRef } from "react";
import {
  Plus, Pencil, Trash2, X, Check, Download, Upload, UserCheck, ChevronRight, Sparkles, RotateCcw, Calendar, ArrowRight
} from "lucide-react";
import {
  getBlockReps,
  addBlockRep,
  importBlockReps,
  updateBlockRep,
  deleteBlockRep,
  nominateBlockRepToCandidate,
  getCandidates,
  getPositions,
  getSettings,
  formatDateTimeNice,
  SAMPLE_BLOCK_REPS,
  resetToStep1BlockReps,
  startFromBeginning,
  COURSES,
  YEAR_LEVELS,
  saveAndReload,
  refreshFromServer,
  subscribeToStore
} from "../data/store";
import type { BlockRepresentative } from "../data/store";
import Avatar from "../components/Avatar";

export default function BlockRepsView() {
  const [blockReps, setBlockReps] = useState<BlockRepresentative[]>([]);
  const [settings, setSettings] = useState(() => getSettings());
  const [search, setSearch] = useState("");
  const [selectedCourse, setSelectedCourse] = useState<string>("ALL");
  const [showModal, setShowModal] = useState(false);
  const [showNominateModal, setShowNominateModal] = useState<BlockRepresentative | null>(null);
  const [editing, setEditing] = useState<BlockRepresentative | null>(null);
  const [form, setForm] = useState({
    name: "",
    course: COURSES[0] as string,
    year: YEAR_LEVELS[0] as string,
    block: "Block A",
    photo: "",
  });
  const [nominatePosition, setNominatePosition] = useState("");
  const [partyList, setPartyList] = useState("Independent");
  const [notice, setNotice] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reload = () => {
    setBlockReps(getBlockReps());
    setSettings(getSettings());
  };

  useEffect(() => {
    reload();
    const unsubscribe = subscribeToStore(reload);
    const iv = setInterval(() => {
      refreshFromServer().then(reload).catch(() => {});
    }, 1500);
    return () => {
      unsubscribe();
      clearInterval(iv);
    };
  }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: "", course: COURSES[0], year: YEAR_LEVELS[0], block: "Block A", photo: "" });
    setShowModal(true);
  };

  const openEdit = (rep: BlockRepresentative) => {
    setEditing(rep);
    setForm({
      name: rep.name,
      course: rep.course,
      year: rep.year,
      block: rep.block,
      photo: rep.photo || "",
    });
    setShowModal(true);
  };

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!form.name.trim() || !form.course || !form.year || !form.block.trim()) return;

    if (editing) {
      updateBlockRep(editing.id, {
        name: form.name.trim(),
        course: form.course,
        year: form.year,
        block: form.block.trim(),
        photo: form.photo.trim(),
      });
    } else {
      addBlockRep({
        name: form.name.trim(),
        course: form.course,
        year: form.year,
        block: form.block.trim(),
        photo: form.photo.trim(),
      });
    }
    await saveAndReload();
    reload();
    setShowModal(false);
    setNotice(editing ? "Block Representative updated!" : "Block Representative added!");
    setTimeout(() => setNotice(""), 3000);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this Block Representative? This will also remove them from candidates if assigned.")) return;
    deleteBlockRep(id);
    await saveAndReload();
    reload();
  };

  const handleNominate = async () => {
    if (!showNominateModal || !nominatePosition) return;
    nominateBlockRepToCandidate(showNominateModal.id, nominatePosition, partyList);
    await saveAndReload();
    setShowNominateModal(null);
    setNotice(`Nominated ${showNominateModal.name} for ${nominatePosition}!`);
    setTimeout(() => setNotice(""), 3000);
  };

  const handleExportCSV = () => {
    const header = "Name,Course,Year,Block,Office";
    const rows = blockReps.map(b => `"${b.name}","${b.course}","${b.year}","${b.block}","${b.blockOffice || "Block Representative"}"`);
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "block_representatives.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLoadSampleReps = async () => {
    importBlockReps(SAMPLE_BLOCK_REPS);
    await saveAndReload();
    reload();
    setNotice("Loaded 6 official sample Block Representatives!");
    setTimeout(() => setNotice(""), 3500);
  };

  const handleStartFromBeginning = async () => {
    if (!confirm("Start from the beginning? This will clear all Block Representatives, candidates, and votes so you can start with a clean roster.")) return;
    startFromBeginning();
    await saveAndReload();
    reload();
    setNotice("Cleared all representatives! You are now starting from the beginning.");
    setTimeout(() => setNotice(""), 3500);
  };

  const handleResetStep1 = async () => {
    if (!confirm("Reset back to Step 1 (Stage 0: Roster Entry)? This clears all votes and leaves schedules empty so you can manually set them in Settings.")) return;
    resetToStep1BlockReps(false);
    await saveAndReload();
    reload();
    setNotice("Election reset to Step 1 (Stage 0: Roster Entry)! Schedules are cleared for manual setup.");
    setTimeout(() => setNotice(""), 3500);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) return;
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        if (lines.length < 2) {
          setNotice("CSV file is empty or missing data rows.");
          return;
        }

        const headerCols = lines[0].split(",").map(c => c.replace(/["']/g, "").trim().toLowerCase());
        let nameIdx = headerCols.findIndex(c => c.includes("name"));
        let courseIdx = headerCols.findIndex(c => c.includes("course") || c.includes("program"));
        let yearIdx = headerCols.findIndex(c => c.includes("year"));
        let blockIdx = headerCols.findIndex(c => c.includes("block"));
        let officeIdx = headerCols.findIndex(c => c.includes("office") || c.includes("role"));

        if (nameIdx === -1) nameIdx = 0;
        if (courseIdx === -1) courseIdx = 1;
        if (yearIdx === -1) yearIdx = 2;
        if (blockIdx === -1) blockIdx = 3;

        const list: Omit<BlockRepresentative, "id">[] = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(",").map(c => c.replace(/^"|"$/g, "").trim());
          if (cols.length >= 2) {
            const name = cols[nameIdx] || "";
            const course = (cols[courseIdx] && COURSES.includes(cols[courseIdx] as any)) ? cols[courseIdx] : (COURSES[0] as string);
            const year = (cols[yearIdx] && YEAR_LEVELS.includes(cols[yearIdx] as any)) ? cols[yearIdx] : (YEAR_LEVELS[0] as string);
            const block = blockIdx !== -1 && cols[blockIdx] ? cols[blockIdx] : "Block 1";
            const blockOffice = officeIdx !== -1 && cols[officeIdx] ? cols[officeIdx] : "Block Representative";

            if (name) {
              list.push({ name, course, year, block, blockOffice });
            }
          }
        }

        if (list.length === 0) {
          setNotice("No valid representative rows found in CSV.");
          return;
        }

        importBlockReps(list);
        await saveAndReload();
        reload();
        setNotice(`Successfully imported ${list.length} Block Representatives!`);
        setTimeout(() => setNotice(""), 3500);
      } catch {
        setNotice("Failed to parse CSV file.");
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsText(file);
  };

  const candidates = getCandidates();
  const positions = getPositions();

  const filtered = blockReps.filter(b => {
    const matchSearch =
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.course.toLowerCase().includes(search.toLowerCase()) ||
      b.block.toLowerCase().includes(search.toLowerCase());
    const matchCourse = selectedCourse === "ALL" || b.course === selectedCourse;
    return matchSearch && matchCourse;
  });

  return (
    <div className="p-6 space-y-6">
      {/* Step 1 Guide Banner */}
      <div className="bg-gradient-to-r from-[#233C4B] to-[#1E3442] text-white rounded-2xl p-5 border border-[#FAC846]/30 shadow-md flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3.5 max-w-2xl">
          <div className="w-10 h-10 rounded-xl bg-[#FAC846]/20 border border-[#FAC846]/40 flex items-center justify-center text-[#FAC846] font-bold text-base flex-shrink-0">
            1
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#FAC846]">Step 1 of Parliamentary System</span>
              <span className="bg-[#A0C382]/20 text-[#A0C382] border border-[#A0C382]/40 text-[10px] font-bold px-2 py-0.5 rounded">
                Roster Entry
              </span>
            </div>
            <h2 className="font-bold text-lg text-white mt-0.5">Input Elected Block Representatives</h2>
            <p className="text-slate-300 text-xs mt-1 leading-relaxed">
              School personnel hand over the list of class/block representatives. Input them here. When the scheduled time arrives, students scan the QR code to vote and nominate their top representatives into the Final Stage.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {blockReps.length > 0 && (
            <button
              onClick={handleStartFromBeginning}
              className="flex items-center gap-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-200 text-xs font-semibold px-3 py-2.5 rounded-xl transition border border-red-500/30 cursor-pointer"
              title="Clear all Block Representatives to start from the beginning"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-300" /> Start from Beginning
            </button>
          )}
          {blockReps.length === 0 && (
            <button
              onClick={handleLoadSampleReps}
              className="flex items-center gap-2 bg-[#FAC846] hover:bg-[#F0BE3C] text-[#233C4B] text-xs font-bold px-3.5 py-2.5 rounded-xl transition shadow-sm cursor-pointer"
            >
              <Sparkles className="w-4 h-4" /> Load Sample Reps
            </button>
          )}
          <button
            onClick={handleResetStep1}
            className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-3 py-2.5 rounded-xl transition border border-white/15 cursor-pointer"
            title="Reset system back to Step 1 clean state"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#FAC846]" /> Reset to Step 1
          </button>
          <a
            href="/admin"
            onClick={(e) => {
              e.preventDefault();
              sessionStorage.setItem("cems_admin_page", "settings");
              window.location.reload();
            }}
            className="flex items-center gap-1.5 bg-[#FF7D2D] hover:bg-[#EA6C1E] text-white text-xs font-bold px-3.5 py-2.5 rounded-xl transition shadow-xs cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5" /> Set Schedules <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#233C4B]">Block Representatives Roster</h1>
            <span className="bg-[#233C4B] text-[#FAC846] text-xs font-bold px-2.5 py-0.5 rounded-full border border-[#FAC846]/30">
              {blockReps.length} Registered
            </span>
          </div>
          <p className="text-slate-500 text-xs mt-1">
            Current Stage: <strong className="text-[#233C4B]">{settings.currentStage === "STAGE_0_ROSTER" ? "Stage 0: Roster Entry" : settings.currentStage}</strong> • Stage 1 Start: <strong>{settings.stage1StartDate ? formatDateTimeNice(settings.stage1StartDate) : "Not scheduled yet (Set in Settings)"}</strong> • Deadline: <strong>{settings.stage1EndDate ? formatDateTimeNice(settings.stage1EndDate) : "Not scheduled"}</strong>
          </p>
          {notice && (
            <p className="text-[#5F9B8C] font-semibold text-xs mt-1.5 animate-pulse">{notice}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".csv,text/csv"
            className="hidden"
          />
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 border border-slate-300 text-slate-700 text-xs font-semibold px-3 py-2.5 rounded-xl hover:bg-slate-50 transition"
          >
            <Download className="w-4 h-4 text-slate-500" /> Export CSV
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 border border-slate-300 text-slate-700 text-xs font-semibold px-3 py-2.5 rounded-xl hover:bg-slate-50 transition"
          >
            <Upload className="w-4 h-4 text-slate-500" /> Import CSV
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-[#FF7D2D] hover:bg-[#EA6C1E] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Representative
          </button>
        </div>
      </div>

      {/* Course Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200">
        <button
          onClick={() => setSelectedCourse("ALL")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
            selectedCourse === "ALL" ? "bg-[#233C4B] text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          All Courses ({blockReps.length})
        </button>
        {COURSES.map(course => {
          const count = blockReps.filter(b => b.course === course).length;
          return (
            <button
              key={course}
              onClick={() => setSelectedCourse(course)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                selectedCourse === course ? "bg-[#233C4B] text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {course} ({count})
            </button>
          );
        })}
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search Block Representative by name, course, or block…"
          className="w-full text-sm text-slate-800 focus:outline-none placeholder:text-slate-400"
        />
      </div>

      {/* Grid of Block Representatives */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(rep => {
          const assignedCandidates = candidates.filter(c => c.blockRepId === rep.id);
          return (
            <div
              key={rep.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <Avatar
                      src={rep.photo}
                      name={rep.name}
                      className="w-12 h-12 rounded-full border-2 border-slate-100"
                    />
                    <div>
                      <h3 className="font-bold text-[#233C4B] text-base leading-snug">{rep.name}</h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="bg-[#233C4B]/10 text-[#233C4B] font-bold text-xs px-2 py-0.5 rounded-md">
                          {rep.course}
                        </span>
                        <span className="text-slate-400 text-xs">•</span>
                        <span className="text-slate-600 text-xs font-medium">{rep.year}</span>
                        <span className="text-slate-400 text-xs">•</span>
                        <span className="text-slate-600 text-xs font-medium">{rep.block}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit(rep)}
                      className="p-1.5 text-slate-400 hover:text-[#233C4B] hover:bg-slate-100 rounded-lg transition"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(rep.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100">
                  <p className="text-xs font-medium text-slate-500 mb-2">Assigned CSG Positions:</p>
                  {assignedCandidates.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Not nominated for any position yet</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {assignedCandidates.map(c => (
                        <span key={c.id} className="bg-[#A0C382]/20 text-[#233C4B] font-bold text-xs px-2.5 py-1 rounded-lg border border-[#A0C382]/40">
                          {c.position} ({c.partyList})
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100">
                <button
                  onClick={() => {
                    setShowNominateModal(rep);
                    setNominatePosition(positions[0] || "");
                  }}
                  className="w-full bg-[#233C4B] hover:bg-[#192B36] text-white font-bold text-xs py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#FAC846]" /> Nominate to CSG Ballot
                </button>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-slate-200">
            <UserCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="font-bold text-slate-700 text-base">Roster is Empty (Clean Slate)</h3>
            <p className="text-slate-400 text-sm mt-1">Ready to input your representatives from the beginning. Click &quot;Add Representative&quot; or &quot;Import CSV&quot;.</p>
            <div className="mt-4 flex items-center justify-center gap-2.5">
              <button
                onClick={openAdd}
                className="bg-[#FF7D2D] hover:bg-[#EA6C1E] text-white text-xs font-bold px-4 py-2 rounded-xl transition cursor-pointer shadow-xs"
              >
                + Add Representative
              </button>
              <button
                onClick={handleLoadSampleReps}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-4 py-2 rounded-xl transition cursor-pointer"
              >
                Load Sample Reps
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Add/Edit Block Rep */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-[#233C4B] text-lg">{editing ? "Edit Block Representative" : "Add Block Representative"}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 p-1"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Full Name *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Maria Santos"
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7D2D] focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Course *</label>
                  <select
                    value={form.course}
                    onChange={e => setForm(f => ({ ...f, course: e.target.value }))}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7D2D] focus:border-transparent"
                  >
                    {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Year Level *</label>
                  <select
                    value={form.year}
                    onChange={e => setForm(f => ({ ...f, year: e.target.value }))}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7D2D] focus:border-transparent"
                  >
                    {YEAR_LEVELS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Block Name / Number *</label>
                <input
                  type="text"
                  required
                  value={form.block}
                  onChange={e => setForm(f => ({ ...f, block: e.target.value }))}
                  placeholder="e.g. Block A, Block 1"
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7D2D] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Photo URL (optional)</label>
                <input
                  type="text"
                  value={form.photo}
                  onChange={e => setForm(f => ({ ...f, photo: e.target.value }))}
                  placeholder="e.g. https://example.com/photo.jpg (optional)"
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7D2D] focus:border-transparent"
                />
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
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#FF7D2D] hover:bg-[#EA6C1E] text-white text-sm font-bold transition flex items-center justify-center gap-2 shadow-xs"
                >
                  <Check className="w-4 h-4" /> {editing ? "Save Changes" : "Add Representative"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Nominate Representative */}
      {showNominateModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowNominateModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-[#233C4B] text-lg">Nominate to CSG Position</h2>
              <button onClick={() => setShowNominateModal(null)} className="text-slate-400 hover:text-slate-600 p-1"><X className="w-5 h-5" /></button>
            </div>

            <div className="bg-[#233C4B]/5 border border-slate-200 rounded-xl p-3.5 mb-5 flex items-center gap-3">
              <Avatar src={showNominateModal.photo} name={showNominateModal.name} className="w-10 h-10 rounded-full" />
              <div>
                <p className="font-bold text-[#233C4B] text-sm">{showNominateModal.name}</p>
                <p className="text-xs text-slate-500 font-medium">{showNominateModal.course} • {showNominateModal.year} • {showNominateModal.block}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Select CSG Position *</label>
                <select
                  value={nominatePosition}
                  onChange={e => setNominatePosition(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7D2D] focus:border-transparent font-semibold"
                >
                  {positions.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Party / Alliance (optional)</label>
                <input
                  type="text"
                  value={partyList}
                  onChange={e => setPartyList(e.target.value)}
                  placeholder="e.g. Unity Party, Progressive Alliance"
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7D2D] focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowNominateModal(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleNominate}
                className="flex-1 py-2.5 rounded-xl bg-[#FF7D2D] hover:bg-[#EA6C1E] text-white text-sm font-bold transition flex items-center justify-center gap-2 shadow-xs"
              >
                Confirm Nomination <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
