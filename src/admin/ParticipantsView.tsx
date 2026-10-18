import { useState, useEffect, useRef } from "react";
import { Plus, Pencil, Trash2, X, Check, Download, Upload, CheckCircle, Clock, AlertCircle } from "lucide-react";
import {
  getParticipants,
  addParticipant,
  importParticipants,
  updateParticipant,
  deleteParticipant,
  COURSES,
  YEAR_LEVELS,
  saveAndReload,
  refreshFromServer
} from "../data/store";
import type { Participant } from "../data/store";

export default function ParticipantsView() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState<"ALL" | "VOTED" | "PENDING">("ALL");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Participant | null>(null);
  const [form, setForm] = useState({ studentId: "", name: "", course: COURSES[0] as string, year: YEAR_LEVELS[0] as string, block: "" });
  const [formError, setFormError] = useState("");
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reload = () => {
    setParticipants(getParticipants());
  };

  useEffect(() => {
    refreshFromServer().then(() => reload());
  }, []);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const filtered = participants.filter(p => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.studentId.toLowerCase().includes(search.toLowerCase()) ||
      p.course.toLowerCase().includes(search.toLowerCase()) ||
      (p.block && p.block.toLowerCase().includes(search.toLowerCase()));

    const matchCourse = selectedCourse === "ALL" || p.course === selectedCourse;
    const matchStatus =
      selectedStatus === "ALL" ||
      (selectedStatus === "VOTED" && p.hasVoted) ||
      (selectedStatus === "PENDING" && !p.hasVoted);

    return matchSearch && matchCourse && matchStatus;
  });

  const openAdd = () => {
    setEditing(null);
    setForm({ studentId: "", name: "", course: COURSES[0], year: YEAR_LEVELS[0], block: "" });
    setFormError("");
    setShowModal(true);
  };

  const openEdit = (p: Participant) => {
    setEditing(p);
    setForm({ studentId: p.studentId, name: p.name, course: p.course, year: p.year, block: p.block || "" });
    setFormError("");
    setShowModal(true);
  };

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setFormError("");
    const studentId = form.studentId.trim();
    const name = form.name.trim();

    if (!studentId) {
      setFormError("Student ID number is required.");
      return;
    }
    if (!name) {
      setFormError("Full student name is required.");
      return;
    }

    // Check duplicate student ID when adding or changing ID
    const duplicate = participants.find(
      p => p.studentId.toLowerCase() === studentId.toLowerCase() && (!editing || p.id !== editing.id)
    );
    if (duplicate) {
      setFormError(`Student ID "${studentId}" is already registered to ${duplicate.name}.`);
      return;
    }

    if (editing) {
      updateParticipant(editing.id, {
        studentId,
        name,
        course: form.course,
        year: form.year,
        block: form.block.trim(),
      });
      showToast("success", `Updated participant ${name}`);
    } else {
      addParticipant({
        studentId,
        name,
        course: form.course,
        year: form.year,
        block: form.block.trim(),
      });
      showToast("success", `Added participant ${name}`);
    }

    await saveAndReload();
    reload();
    setShowModal(false);
  };

  const handleDelete = async (id: string) => {
    const target = participants.find(p => p.id === id);
    if (!confirm(`Remove voter "${target?.name || id}" from the roster?`)) return;
    deleteParticipant(id);
    await saveAndReload();
    reload();
    showToast("success", "Participant removed.");
  };

  const handleExportCSV = () => {
    const header = "Student ID,Name,Course,Year,Block,Has Voted,Voted At";
    const rows = participants.map(
      p => `"${p.studentId}","${p.name}","${p.course}","${p.year}","${p.block || ""}","${p.hasVoted}","${p.votedAt ?? ""}"`
    );
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `voters_registry_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast("success", "Exported CSV successfully.");
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
          showToast("error", "CSV file is empty or missing data rows.");
          return;
        }

        // Parse header line to detect column indices
        const headerCols = lines[0].split(",").map(c => c.replace(/["']/g, "").trim().toLowerCase());
        let idIdx = headerCols.findIndex(c => c.includes("id") || c.includes("student"));
        let nameIdx = headerCols.findIndex(c => c.includes("name") || c.includes("fullname") || c.includes("student name"));
        let courseIdx = headerCols.findIndex(c => c.includes("course") || c.includes("program") || c.includes("dept"));
        let yearIdx = headerCols.findIndex(c => c.includes("year") || c.includes("level"));
        let blockIdx = headerCols.findIndex(c => c.includes("block") || c.includes("section"));

        // Fallback default index positions if headers don't match
        if (idIdx === -1) idIdx = 0;
        if (nameIdx === -1) nameIdx = 1;
        if (courseIdx === -1) courseIdx = 2;
        if (yearIdx === -1) yearIdx = 3;

        const parsedList: Omit<Participant, "id" | "hasVoted">[] = [];
        for (let i = 1; i < lines.length; i++) {
          const row = lines[i];
          const cols = row.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g)?.map(c => c.replace(/^"|"$/g, "").trim()) ||
                       row.split(",").map(c => c.replace(/^"|"$/g, "").trim());

          if (cols.length >= 2) {
            const studentId = cols[idIdx] || "";
            const name = cols[nameIdx] || "";
            const course = (cols[courseIdx] && COURSES.includes(cols[courseIdx] as any)) ? cols[courseIdx] : (COURSES[0] as string);
            const year = (cols[yearIdx] && YEAR_LEVELS.includes(cols[yearIdx] as any)) ? cols[yearIdx] : (YEAR_LEVELS[0] as string);
            const block = blockIdx !== -1 && cols[blockIdx] ? cols[blockIdx] : "";

            if (studentId && name) {
              parsedList.push({ studentId, name, course, year, block });
            }
          }
        }

        if (parsedList.length === 0) {
          showToast("error", "No valid voter rows found in CSV. Expected headers: Student ID, Name, Course, Year");
          return;
        }

        const count = importParticipants(parsedList);
        await saveAndReload();
        reload();
        showToast("success", `Successfully imported ${count} new student voters!`);
      } catch {
        showToast("error", "Failed to parse CSV file. Please check formatting.");
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsText(file);
  };

  const votedCount = participants.filter(p => p.hasVoted).length;

  return (
    <div className="p-6 space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold transition animate-slide-in ${
            toast.type === "success"
              ? "bg-[#A0C382]/20 text-[#233C4B] border-[#A0C382]/50"
              : "bg-red-50 text-red-800 border-red-200"
          }`}
        >
          {toast.type === "success" ? <CheckCircle className="w-4 h-4 text-[#5F9B8C]" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#233C4B]">Voters / Student Participants</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {participants.length} registered · {votedCount} voted · {participants.length - votedCount} pending
          </p>
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
            className="flex items-center gap-2 border border-slate-300 text-slate-700 text-sm font-semibold px-3.5 py-2.5 rounded-xl hover:bg-slate-50 transition"
          >
            <Download className="w-4 h-4 text-slate-500" /> Export CSV
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 border border-slate-300 text-slate-700 text-sm font-semibold px-3.5 py-2.5 rounded-xl hover:bg-slate-50 transition"
          >
            <Upload className="w-4 h-4 text-slate-500" /> Import CSV
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-[#FF7D2D] hover:bg-[#EA6C1E] text-white text-sm font-bold px-4 py-2.5 rounded-xl transition shadow-xs"
          >
            <Plus className="w-4 h-4" /> Add Voter
          </button>
        </div>
      </div>

      {/* Course and Status Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedCourse("ALL")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              selectedCourse === "ALL" ? "bg-[#233C4B] text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            All Courses ({participants.length})
          </button>
          {COURSES.map(course => {
            const count = participants.filter(p => p.course === course).length;
            return (
              <button
                key={course}
                onClick={() => setSelectedCourse(course)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  selectedCourse === course ? "bg-[#233C4B] text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                {course} ({count})
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setSelectedStatus("ALL")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
              selectedStatus === "ALL" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setSelectedStatus("VOTED")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
              selectedStatus === "VOTED" ? "bg-[#5F9B8C] text-white shadow-xs" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Voted ({votedCount})
          </button>
          <button
            onClick={() => setSelectedStatus("PENDING")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
              selectedStatus === "PENDING" ? "bg-[#FF7D2D] text-white shadow-xs" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Pending ({participants.length - votedCount})
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-3">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search student by name, ID number, course, or block…"
            className="flex-1 text-sm text-slate-700 focus:outline-none placeholder:text-slate-400"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Student Name</th>
                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Student ID</th>
                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Course & Year</th>
                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Voted Timestamp</th>
                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider w-20 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-3.5 text-sm font-semibold text-slate-800">{p.name}</td>
                  <td className="px-4 py-3.5 text-sm font-mono text-slate-600">{p.studentId}</td>
                  <td className="px-4 py-3.5 text-sm text-slate-600">
                    <span className="font-semibold text-[#233C4B]">{p.course}</span> · {p.year} {p.block ? `(${p.block})` : ""}
                  </td>
                  <td className="px-4 py-3.5">
                    {p.hasVoted ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-[#233C4B] bg-[#A0C382]/20 border border-[#A0C382]/50 rounded-full px-2.5 py-0.5">
                        <CheckCircle className="w-3 h-3 text-[#5F9B8C]" /> Voted
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 bg-[#FAC846]/20 border border-[#FAC846]/40 rounded-full px-2.5 py-0.5">
                        <Clock className="w-3 h-3 text-[#FF7D2D]" /> Pending
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-400 font-mono">
                    {p.votedAt ? new Date(p.votedAt).toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => openEdit(p)}
                        className="p-1.5 text-slate-400 hover:text-[#233C4B] hover:bg-slate-100 rounded-lg transition"
                        title="Edit Voter"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                        title="Delete Voter"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-400 text-sm">
                    No participants match the search or filters. Click &quot;Add Voter&quot; or &quot;Import CSV&quot; to populate voters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add/Edit */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-[#233C4B] text-lg">{editing ? "Edit Student Voter" : "Add Student Voter"}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Student ID *</label>
                <input
                  value={form.studentId}
                  onChange={e => setForm(f => ({ ...f, studentId: e.target.value }))}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#FF7D2D] focus:border-transparent"
                  placeholder="e.g. 2021-00001"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Full Name *</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7D2D] focus:border-transparent"
                  placeholder="e.g. Juan dela Cruz"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Course *</label>
                  <select
                    value={form.course}
                    onChange={e => setForm(f => ({ ...f, course: e.target.value }))}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7D2D] focus:border-transparent font-medium"
                  >
                    {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Year Level *</label>
                  <select
                    value={form.year}
                    onChange={e => setForm(f => ({ ...f, year: e.target.value }))}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7D2D] focus:border-transparent font-medium"
                  >
                    {YEAR_LEVELS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Block / Section (optional)</label>
                <input
                  value={form.block}
                  onChange={e => setForm(f => ({ ...f, block: e.target.value }))}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF7D2D] focus:border-transparent"
                  placeholder="e.g. Block A"
                />
              </div>

              {formError && (
                <p className="text-red-600 text-xs bg-red-50 border border-red-200 rounded-xl px-3 py-2 font-medium">
                  {formError}
                </p>
              )}

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
                  <Check className="w-4 h-4" /> {editing ? "Save Changes" : "Add Voter"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
