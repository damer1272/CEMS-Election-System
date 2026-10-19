import { useEffect, useState } from "react";
import { getVotes, getCandidates, getParticipants, getPositions, getBlockReps, refreshFromServer, subscribeToStore } from "../data/store";
import type { VoteRecord, Candidate, Participant, BlockRepresentative } from "../data/store";
import { Download, Search, CheckCircle2 } from "lucide-react";

export default function VotesView() {
  const [votes, setVotes] = useState<VoteRecord[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [positions, setPositions] = useState<string[]>([]);
  const [blockReps, setBlockReps] = useState<BlockRepresentative[]>([]);
  const [search, setSearch] = useState("");
  const [selectedPos, setSelectedPos] = useState("ALL");

  useEffect(() => {
    const refresh = () => {
      setVotes(getVotes());
      setCandidates(getCandidates());
      setParticipants(getParticipants());
      setPositions(getPositions());
      setBlockReps(getBlockReps());
    };
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

  const getCandidateName = (id: string) => {
    const cand = candidates.find(
      c => c.id === id || c.blockRepId === id || (c.blockRepId && id.includes(c.blockRepId))
    );
    if (cand) return cand.name;
    const rep = blockReps.find(r => r.id === id || id.includes(r.id));
    if (rep) return rep.name;
    return id;
  };
  const getParticipant = (id: string) => participants.find(p => p.id === id);

  const filtered = votes.filter(v => {
    const p = getParticipant(v.participantId);
    const cName = getCandidateName(v.candidateId);
    const matchSearch =
      (p?.name.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      (p?.studentId.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      cName.toLowerCase().includes(search.toLowerCase()) ||
      v.position.toLowerCase().includes(search.toLowerCase());
    const matchPos = selectedPos === "ALL" || v.position === selectedPos;
    return matchSearch && matchPos;
  });

  const handleExportCSV = () => {
    const header = "Vote ID,Voter Name,Student ID,Position,Candidate,Stage,Timestamp";
    const rows = votes.map(v => {
      const p = getParticipant(v.participantId);
      const cName = getCandidateName(v.candidateId);
      return `"${v.id}","${p?.name || ""}","${p?.studentId || ""}","${v.position}","${cName}","${v.stage || ""}","${v.timestamp}"`;
    });
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `votes_audit_log_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Official Vote Audit Trail</h1>
          <p className="text-slate-500 text-sm mt-0.5">{votes.length} vote records · live real-time sync</p>
        </div>
        <button
          onClick={handleExportCSV}
          disabled={votes.length === 0}
          className="flex items-center gap-2 border border-slate-300 text-slate-700 text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-slate-50 transition disabled:opacity-40 shadow-sm"
        >
          <Download className="w-4 h-4" /> Export Votes CSV
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[240px] flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by voter name, student ID, candidate..."
              className="w-full text-sm bg-transparent text-slate-800 focus:outline-none placeholder:text-slate-400"
            />
          </div>
          <select
            value={selectedPos}
            onChange={e => setSelectedPos(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Positions</option>
            {positions.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">#</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Voter</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Position</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Selected Candidate</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Stage</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-slate-400 text-sm">
                    {votes.length === 0 ? "No votes recorded yet." : "No votes match the search criteria."}
                  </td>
                </tr>
              ) : (
                [...filtered].reverse().map((v, i) => {
                  const p = getParticipant(v.participantId);
                  return (
                    <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3.5 text-xs font-mono text-slate-400">{filtered.length - i}</td>
                      <td className="px-4 py-3.5">
                        <p className="text-sm font-semibold text-slate-800">{p ? p.name : "Unknown Voter"}</p>
                        <p className="text-xs text-slate-400 font-mono">{p?.studentId ?? v.participantId}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-100 rounded-full px-2.5 py-0.5">
                          {v.position}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-sm font-semibold text-slate-800">{getCandidateName(v.candidateId)}</td>
                      <td className="px-4 py-3.5">
                        <span className="text-[10px] font-bold text-slate-600 bg-slate-100 rounded px-2 py-0.5">
                          {v.stage?.replace(/_/g, " ") || "Official"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs font-mono text-slate-400">{new Date(v.timestamp).toLocaleString()}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

