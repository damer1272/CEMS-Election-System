import seedElectionData from "../../data/election-data.json";

export type Position = string;

/** Prior block office that qualifies a student to run for CSG (block elections happen outside this system). */
export type BlockOffice = "Block Representative" | "Block Secretary" | "Block Treasurer";

export const COURSES = ["BSIT", "BSBA", "BEEd", "BSCrim"] as const;
export const YEAR_LEVELS = ["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year"] as const;
export const BLOCK_OFFICES: BlockOffice[] = ["Block Representative", "Block Secretary", "Block Treasurer"];

export type ElectionStage =
  | "STAGE_0_ROSTER"        // Inputting Block Representatives roster
  | "STAGE_1_NOMINATION"    // Stage 1 Primary Voting for Block Representatives
  | "STAGE_1_ENDED"         // Stage 1 deadline ended, Top 2 ready to advance
  | "STAGE_2_FINAL"         // Stage 2 Final Executive Election
  | "COMPLETED";            // Final election completed, winners declared

export interface BlockRepresentative {
  id: string;
  name: string;
  course: string;
  year: string;
  block: string;
  photo?: string;
  blockOffice?: string;
  notes?: string;
}

export interface Candidate {
  id: string;
  name: string;
  position: Position;
  photo: string;
  partyList: string;
  course: string;
  year?: string;
  block?: string;
  blockOffice: BlockOffice | string;
  blockRepId?: string;
  votes: number;
  stage1Votes: number;
  stage2Votes: number;
  isFinalist: boolean; // Top finalists advancing candidate
}

export interface Participant {
  id: string;
  studentId: string;
  name: string;
  course: string;
  year: string;
  block?: string;
  hasVoted: boolean;
  hasVotedStage1?: boolean;
  hasVotedStage2?: boolean;
  votedAt?: string;
}

export interface VoteRecord {
  id: string;
  participantId: string;
  candidateId: string;
  position: Position;
  stage: ElectionStage;
  timestamp: string;
}

export interface AuditLog {
  id: string;
  action: string;
  performedBy: string;
  details: string;
  timestamp: string;
}

export interface AdminUser {
  id: string;
  username: string;
  password?: string;
  role: "super_admin" | "admin" | "viewer";
  createdAt: string;
}

export interface ElectionSettings {
  title: string;
  organization: string;
  startDate: string;
  endDate: string;
  isOpen: boolean;
  allowMultipleDevices: boolean;
  publicUrl: string;

  // Parliamentary workflow configuration
  currentStage: ElectionStage;
  stage1StartDate: string;
  stage1EndDate: string;
  stage2StartDate: string;
  stage2EndDate: string;
  topFinalistsCount: number;
}

interface PersistedState {
  blockReps: BlockRepresentative[];
  candidates: Candidate[];
  participants: Participant[];
  votes: VoteRecord[];
  auditLogs: AuditLog[];
  electionSettings: ElectionSettings;
  positions: string[];
  adminUsers?: AdminUser[];
}

const STORAGE_KEY = "cems_election_v9_clean";
const API_URL = "/api/election";
export const DEFAULT_POSITIONS: string[] = [
  "Prime Minister",
  "Deputy Prime Minister",
  "Cabinet Secretary",
  "Minister of Finance",
  "Auditor General",
  "Minister of Academic Affairs",
];

const DEFAULT_ADMIN_USERS: AdminUser[] = [
  { id: "u1", username: "admin", password: "admin123", role: "super_admin", createdAt: "2026-10-04" },
];

const DEFAULT_BLOCK_REPS: BlockRepresentative[] = [];
const DEFAULT_CANDIDATES: Candidate[] = [];
const DEFAULT_PARTICIPANTS: Participant[] = [];

const DEFAULT_AUDIT_LOGS: AuditLog[] = [
  { id: "a1", action: "System Initialized", performedBy: "super_admin", details: "CEMS election portal initialized with clean database", timestamp: new Date().toISOString() },
];

const DEFAULT_SETTINGS: ElectionSettings = {
  title: "CSG Parliamentary Election 2026–2027",
  organization: "Pagadian Capitol College, Inc.",
  startDate: "",
  endDate: "",
  isOpen: false,
  allowMultipleDevices: false,
  publicUrl: "",

  currentStage: "STAGE_0_ROSTER",
  stage1StartDate: "",
  stage1EndDate: "",
  stage2StartDate: "",
  stage2EndDate: "",
  topFinalistsCount: 2,
};

function normalizeCandidate(c: Partial<Candidate> & Pick<Candidate, "id" | "name" | "position">): Candidate {
  const stage1Votes = typeof c.stage1Votes === "number" ? c.stage1Votes : (typeof c.votes === "number" ? c.votes : 0);
  const stage2Votes = typeof c.stage2Votes === "number" ? c.stage2Votes : 0;
  const photo = c.photo && !c.photo.includes("pravatar.cc") ? c.photo : "";
  return {
    id: c.id,
    name: c.name,
    position: c.position,
    photo,
    partyList: c.partyList?.trim() || "Independent",
    course: c.course?.trim() || "",
    year: c.year || "",
    block: c.block || "",
    blockOffice: c.blockOffice?.trim() || "Block Representative",
    blockRepId: c.blockRepId,
    votes: typeof c.votes === "number" ? c.votes : stage1Votes + stage2Votes,
    stage1Votes,
    stage2Votes,
    isFinalist: typeof c.isFinalist === "boolean" ? c.isFinalist : true,
  };
}

export function getInitials(name?: string): string {
  if (!name) return "";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function candidateQualificationLabel(c: Pick<Candidate, "course" | "year" | "block" | "blockOffice" | "partyList">): string {
  const parts: string[] = [];
  if (c.course) parts.push(c.course);
  if (c.year) parts.push(c.year);
  if (c.block) parts.push(c.block);
  if (parts.length > 0) return parts.join(" · ");
  return c.blockOffice || c.partyList || "Block Representative";
}

function getDefaultState(): PersistedState {
  return normalizeState({});
}

function normalizeState(parsed: Partial<PersistedState>): PersistedState {
  const OLD_DEFAULTS = ["President", "Vice President", "Secretary", "Treasurer", "Auditor", "Public Relations Officer (PRO)"];
  const isOldDefault = Array.isArray(parsed.positions) &&
    parsed.positions.length === OLD_DEFAULTS.length &&
    parsed.positions.every((p, i) => p === OLD_DEFAULTS[i]);

  const loadedPositions = Array.isArray(parsed.positions) && parsed.positions.length > 0 && !isOldDefault
    ? parsed.positions
    : [...DEFAULT_POSITIONS];
  const rawCandidates = Array.isArray(parsed.candidates)
    ? parsed.candidates
    : [];
  const rawBlockReps = Array.isArray(parsed.blockReps)
    ? parsed.blockReps
    : [];
  const rawParticipants = Array.isArray(parsed.participants)
    ? parsed.participants
    : [];
  const rawVotes = Array.isArray(parsed.votes)
    ? parsed.votes
    : [];
  const rawAuditLogs = Array.isArray(parsed.auditLogs) && parsed.auditLogs.length > 0
    ? parsed.auditLogs
    : [...DEFAULT_AUDIT_LOGS];

  return {
    blockReps: rawBlockReps.map((r: any) => ({
      ...r,
      photo: r.photo && !r.photo.includes("pravatar.cc") ? r.photo : "",
    })),
    candidates: rawCandidates.map((c: any) => normalizeCandidate(c)),
    participants: rawParticipants,
    votes: rawVotes,
    auditLogs: rawAuditLogs,
    electionSettings: { ...DEFAULT_SETTINGS, ...parsed.electionSettings },
    positions: loadedPositions,
    adminUsers: Array.isArray(parsed.adminUsers) && parsed.adminUsers.length > 0
      ? parsed.adminUsers
      : DEFAULT_ADMIN_USERS.map(u => ({ ...u })),
  };
}

function loadStateFromLocalStorage(): PersistedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return normalizeState(JSON.parse(raw) as Partial<PersistedState>);
  } catch {
    return null;
  }
}

function getStateSnapshot(): PersistedState {
  return { blockReps, candidates, participants, votes, auditLogs, electionSettings, positions, adminUsers };
}

function applyState(state: PersistedState) {
  blockReps = state.blockReps;
  candidates = state.candidates;
  participants = state.participants;
  votes = state.votes;
  auditLogs = state.auditLogs;
  electionSettings = state.electionSettings;
  positions = state.positions;
  adminUsers = state.adminUsers ?? DEFAULT_ADMIN_USERS.map(u => ({ ...u }));
}

async function fetchServerState(): Promise<PersistedState | null> {
  try {
    const res = await fetch(API_URL);
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) return null;
    return normalizeState(await res.json() as Partial<PersistedState>);
  } catch {
    return null;
  }
}

async function saveServerState(state: PersistedState): Promise<void> {
  try {
    await fetch(API_URL, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state),
    });
  } catch {
    // Keep working offline with in-memory state
  }
}

let persistQueue: Promise<void> = Promise.resolve();

function persistState() {
  const state = getStateSnapshot();
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore storage quota error
    }
  }
  persistQueue = persistQueue.then(() => saveServerState(state));
}

export async function flushPersist(): Promise<void> {
  await persistQueue;
}

export async function syncFromLocalStorage(): Promise<boolean> {
  const localState = loadStateFromLocalStorage();
  if (!localState) return false;
  applyState(localState);
  await saveServerState(localState);
  return true;
}

export async function initStore(): Promise<void> {
  if (typeof window !== "undefined") {
    try {
      [
        "cems_election_data",
        "cems_election_v2",
        "cems_election_v3",
        "cems_election_v3_clean",
        "cems_election_v4_clean",
        "cems_election_v5_fresh",
        "cems_election_v6_fresh",
        "cems_election_v7_fresh",
        "cems_election_v8_fresh"
      ].forEach(k => localStorage.removeItem(k));
    } catch {}
  }
  const serverState = await fetchServerState();
  if (serverState) {
    applyState(serverState);
    if (typeof window !== "undefined") {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(serverState)); } catch {}
    }
  } else {
    const localState = loadStateFromLocalStorage();
    if (localState) {
      applyState(localState);
    } else {
      const defaults = getDefaultState();
      applyState(defaults);
      if (typeof window !== "undefined") {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults)); } catch {}
      }
    }
  }

  // Auto-detect and set active Wi-Fi IP if unconfigured or localhost:
  if (!electionSettings.publicUrl || isLocalhostUrl(electionSettings.publicUrl)) {
    const net = await fetchNetworkInfo();
    if (net && net.localUrl) {
      electionSettings.publicUrl = net.localUrl;
      persistState();
    }
  }
}

export async function refreshFromServer(): Promise<void> {
  const serverState = await fetchServerState();
  if (serverState) {
    applyState(serverState);
    if (typeof window !== "undefined") {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(serverState)); } catch {}
    }
    return;
  }
  const localState = loadStateFromLocalStorage();
  if (localState) {
    applyState(localState);
  }
}

export async function fetchNetworkInfo(): Promise<{ localIp: string; port: string; localUrl: string } | null> {
  try {
    const res = await fetch("/api/network-info");
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export const setPublicUrl = (url: string) => {
  electionSettings.publicUrl = url.trim().replace(/\/$/, "");
  persistState();
};

export async function saveAndReload(): Promise<void> {
  await flushPersist();
  await refreshFromServer();
}

const initialState = getDefaultState();

let blockReps: BlockRepresentative[] = initialState.blockReps;
let candidates: Candidate[] = initialState.candidates;
let participants: Participant[] = initialState.participants;
let votes: VoteRecord[] = initialState.votes;
let auditLogs: AuditLog[] = initialState.auditLogs;
let electionSettings: ElectionSettings = initialState.electionSettings;
let positions: string[] = initialState.positions;
let adminUsers: AdminUser[] = initialState.adminUsers ?? DEFAULT_ADMIN_USERS.map(u => ({ ...u }));

// Getters
export const getBlockReps = () => [...blockReps];
export const getCandidates = () => [...candidates];
export const getParticipants = () => [...participants];
export const getVotes = () => [...votes];
export const getAuditLogs = () => [...auditLogs];
export const getSettings = () => ({ ...electionSettings });
export const getPositions = () => [...positions];
export const getAdminUsers = () => [...adminUsers];

export const authenticateAdmin = (username: string, password: string): AdminUser | null => {
  const u = adminUsers.find(
    user => user.username.trim().toLowerCase() === username.trim().toLowerCase() && (user.password === password || (!user.password && password === "admin123"))
  );
  return u || null;
};

export const addAdminUser = (user: Omit<AdminUser, "id" | "createdAt">): AdminUser => {
  const newUser: AdminUser = {
    ...user,
    id: `u${Date.now()}`,
    createdAt: new Date().toISOString().split("T")[0],
  };
  adminUsers.push(newUser);
  auditLogs.unshift({
    id: `a${Date.now()}`,
    action: "Admin User Created",
    performedBy: "super_admin",
    details: `Created admin user account: ${newUser.username} (${newUser.role})`,
    timestamp: new Date().toISOString(),
  });
  persistState();
  return newUser;
};

export const deleteAdminUser = (id: string) => {
  const target = adminUsers.find(u => u.id === id);
  if (target && target.username === "admin") return false; // Prevent removing primary admin
  adminUsers = adminUsers.filter(u => u.id !== id);
  auditLogs.unshift({
    id: `a${Date.now()}`,
    action: "Admin User Deleted",
    performedBy: "super_admin",
    details: `Deleted admin user account: ${target?.username ?? id}`,
    timestamp: new Date().toISOString(),
  });
  persistState();
  return true;
};

export const getPublicBaseUrl = () => {
  if (typeof window !== "undefined") {
    const origin = window.location.origin;
    const isLocal = /localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+/i.test(origin);
    // If the browser is on a public domain like Vercel (https://...):
    if (!isLocal && origin.startsWith("http")) {
      return origin;
    }
  }
  const configured = electionSettings.publicUrl?.trim().replace(/\/$/, "");
  if (configured) return configured;
  if (typeof window !== "undefined") return window.location.origin;
  return "";
};

export const getVotingUrl = () => `${getPublicBaseUrl()}/vote`;
export const getDisplayUrl = () => `${getPublicBaseUrl()}/`;
export const isLocalhostUrl = (url: string) => /localhost|127\.0\.0\.1/i.test(url);

// Computed
export const getTotalVoters = () => participants.length;

export const getVotesCast = () => {
  const stage = electionSettings.currentStage;
  if (stage === "STAGE_1_NOMINATION") {
    return participants.filter(p => p.hasVotedStage1 || p.hasVoted).length;
  }
  if (stage === "STAGE_2_FINAL") {
    return participants.filter(p => p.hasVotedStage2).length;
  }
  return participants.filter(p => p.hasVoted).length;
};

export const getRemainingVoters = () => Math.max(0, getTotalVoters() - getVotesCast());

export const getCandidatesByPosition = (): Record<string, Candidate[]> => {
  const stage = electionSettings.currentStage;
  const grouped: Record<string, Candidate[]> = {};

  positions.forEach(pos => {
    if (stage === "STAGE_2_FINAL" || stage === "COMPLETED") {
      // In Stage 2 / Final: Show ONLY the winners who advanced from Stage 1!
      const finalists = candidates.filter(c => c.position === pos && c.isFinalist);
      grouped[pos] = finalists.length > 0 ? finalists : candidates.filter(c => c.position === pos);
    } else {
      // In Stage 1 / Stage 0 / Nomination:
      // Ballot options come directly from the registered Block Representatives!
      if (blockReps.length > 0) {
        grouped[pos] = blockReps.map(rep => {
          const existing = candidates.find(
            c => (c.blockRepId === rep.id || c.name.toLowerCase() === rep.name.toLowerCase() || c.id === `c_${rep.id}_${pos.replace(/[^a-zA-Z0-9]/g, "_")}`) && c.position === pos
          );
          if (existing) {
            return {
              ...existing,
              photo: rep.photo || existing.photo,
              course: rep.course || existing.course,
              year: rep.year || existing.year,
              block: rep.block || existing.block,
              blockOffice: rep.blockOffice || existing.blockOffice || "Block Representative",
            };
          }
          return {
            id: `rep_${rep.id}`,
            name: rep.name,
            position: pos,
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
      } else {
        grouped[pos] = candidates.filter(c => c.position === pos);
      }
    }
  });

  return grouped;
};

export type ScheduleStatusCode =
  | "STAGE_0_PREPARATION"
  | "NOT_YET_OPEN"
  | "ACTIVE"
  | "PORTAL_PAUSED"
  | "TIMED_OUT"
  | "STAGE_1_ENDED"
  | "COMPLETED";

export interface ScheduleStatusInfo {
  code: ScheduleStatusCode;
  stage: ElectionStage;
  stageName: string;
  isOpen: boolean;
  startTime: string;
  endTime: string;
  startDate: Date | null;
  endDate: Date | null;
  msUntilStart: number;
  msUntilEnd: number;
  formattedStartTime: string;
  formattedEndTime: string;
  canVote: boolean;
  message: string;
  subMessage: string;
}

export function formatDateTimeNice(isoOrDateStr?: string): string {
  if (!isoOrDateStr) return "Not scheduled";
  const d = new Date(isoOrDateStr);
  if (isNaN(d.getTime())) return isoOrDateStr;
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getScheduleStatus(now: Date = new Date()): ScheduleStatusInfo {
  const stage = electionSettings.currentStage;
  const nowMs = now.getTime();
  const isOpen = !!electionSettings.isOpen;

  if (stage === "STAGE_0_ROSTER") {
    const sDate = electionSettings.stage1StartDate ? new Date(electionSettings.stage1StartDate) : null;
    const sTime = sDate && !isNaN(sDate.getTime()) ? sDate.getTime() : null;
    const msUntilStart = sTime ? Math.max(0, sTime - nowMs) : 0;
    return {
      code: "STAGE_0_PREPARATION",
      stage,
      stageName: "Stage 0: Roster Submission Phase",
      isOpen,
      startTime: electionSettings.stage1StartDate || "",
      endTime: electionSettings.stage1EndDate || "",
      startDate: sDate,
      endDate: electionSettings.stage1EndDate ? new Date(electionSettings.stage1EndDate) : null,
      msUntilStart,
      msUntilEnd: 0,
      formattedStartTime: formatDateTimeNice(electionSettings.stage1StartDate),
      formattedEndTime: formatDateTimeNice(electionSettings.stage1EndDate),
      canVote: false,
      message: "Stage 0: Block Representatives Roster Submission",
      subMessage: "The Election Administrator is currently inputting the elected Block Representatives. The voting portal will open according to the scheduled start time.",
    };
  }

  if (stage === "COMPLETED") {
    return {
      code: "COMPLETED",
      stage,
      stageName: "Parliamentary Election Completed",
      isOpen,
      startTime: electionSettings.stage2StartDate || "",
      endTime: electionSettings.stage2EndDate || "",
      startDate: electionSettings.stage2StartDate ? new Date(electionSettings.stage2StartDate) : null,
      endDate: electionSettings.stage2EndDate ? new Date(electionSettings.stage2EndDate) : null,
      msUntilStart: 0,
      msUntilEnd: 0,
      formattedStartTime: formatDateTimeNice(electionSettings.stage2StartDate),
      formattedEndTime: formatDateTimeNice(electionSettings.stage2EndDate),
      canVote: false,
      message: "Parliamentary Election Completed",
      subMessage: "Voting is concluded and winning CSG Officers have been officially proclaimed.",
    };
  }

  if (stage === "STAGE_1_ENDED") {
    return {
      code: "STAGE_1_ENDED",
      stage,
      stageName: "Stage 1 Nomination Ended",
      isOpen,
      startTime: electionSettings.stage1StartDate || "",
      endTime: electionSettings.stage1EndDate || "",
      startDate: electionSettings.stage1StartDate ? new Date(electionSettings.stage1StartDate) : null,
      endDate: electionSettings.stage1EndDate ? new Date(electionSettings.stage1EndDate) : null,
      msUntilStart: 0,
      msUntilEnd: 0,
      formattedStartTime: formatDateTimeNice(electionSettings.stage1StartDate),
      formattedEndTime: formatDateTimeNice(electionSettings.stage1EndDate),
      canVote: false,
      message: "Stage 1 Primary Nomination Voting Closed",
      subMessage: "Nomination voting has ended. The top nominated students have been determined and are ready for the Stage 2 Final Executive Election.",
    };
  }

  // STAGE_1_NOMINATION or STAGE_2_FINAL
  const isStage1 = stage === "STAGE_1_NOMINATION";
  const rawStart = isStage1 ? (electionSettings.stage1StartDate || electionSettings.startDate) : (electionSettings.stage2StartDate || electionSettings.startDate);
  const rawEnd = isStage1 ? (electionSettings.stage1EndDate || electionSettings.endDate) : (electionSettings.stage2EndDate || electionSettings.endDate);

  const startDate = rawStart ? new Date(rawStart) : null;
  const endDate = rawEnd ? new Date(rawEnd) : null;
  const startTimeMs = startDate && !isNaN(startDate.getTime()) ? startDate.getTime() : null;
  const endTimeMs = endDate && !isNaN(endDate.getTime()) ? endDate.getTime() : null;

  const stageName = isStage1 ? "Stage 1: Primary Nominee Voting" : "Stage 2: Final Executive Election";

  // Check before opening time
  if (startTimeMs && nowMs < startTimeMs) {
    const msUntilStart = startTimeMs - nowMs;
    return {
      code: "NOT_YET_OPEN",
      stage,
      stageName,
      isOpen,
      startTime: rawStart,
      endTime: rawEnd,
      startDate,
      endDate,
      msUntilStart,
      msUntilEnd: endTimeMs ? Math.max(0, endTimeMs - nowMs) : 0,
      formattedStartTime: formatDateTimeNice(rawStart),
      formattedEndTime: formatDateTimeNice(rawEnd),
      canVote: false,
      message: "Voting Portal is Not Yet Available",
      subMessage: `The ${stageName} is scheduled to open on ${formatDateTimeNice(rawStart)}. Please wait for the scheduled time to open.`,
    };
  }

  // Check after deadline / timeout
  if (endTimeMs && nowMs > endTimeMs) {
    return {
      code: "TIMED_OUT",
      stage,
      stageName,
      isOpen,
      startTime: rawStart,
      endTime: rawEnd,
      startDate,
      endDate,
      msUntilStart: 0,
      msUntilEnd: 0,
      formattedStartTime: formatDateTimeNice(rawStart),
      formattedEndTime: formatDateTimeNice(rawEnd),
      canVote: false,
      message: `${isStage1 ? "Stage 1 Primary Nomination" : "Stage 2 Final Election"} Has Ended`,
      subMessage: `The voting schedule deadline (${formatDateTimeNice(rawEnd)}) has passed. ${isStage1 ? "Top nominated candidates are finalized and ready for the final stage." : "Final election tallies are locked."}`,
    };
  }

  // If inside time window but admin toggled portal off
  if (!isOpen) {
    return {
      code: "PORTAL_PAUSED",
      stage,
      stageName,
      isOpen: false,
      startTime: rawStart,
      endTime: rawEnd,
      startDate,
      endDate,
      msUntilStart: 0,
      msUntilEnd: endTimeMs ? Math.max(0, endTimeMs - nowMs) : 0,
      formattedStartTime: formatDateTimeNice(rawStart),
      formattedEndTime: formatDateTimeNice(rawEnd),
      canVote: false,
      message: "Voting Portal is Temporarily Paused",
      subMessage: "The election administrator has temporarily paused the voting portal. Please check back shortly.",
    };
  }

  // Active voting window!
  const msUntilEnd = endTimeMs ? Math.max(0, endTimeMs - nowMs) : 0;
  return {
    code: "ACTIVE",
    stage,
    stageName,
    isOpen: true,
    startTime: rawStart,
    endTime: rawEnd,
    startDate,
    endDate,
    msUntilStart: 0,
    msUntilEnd,
    formattedStartTime: formatDateTimeNice(rawStart),
    formattedEndTime: formatDateTimeNice(rawEnd),
    canVote: true,
    message: `${stageName} is Active`,
    subMessage: isStage1
      ? "Enter your PCC student credentials and verify your ID to cast your primary nominations."
      : "Enter your PCC student credentials and verify your ID to vote for final executive officers.",
  };
}

export interface NominatedCandidateItem {
  id: string;
  name: string;
  course: string;
  year?: string;
  block?: string;
  photo: string;
  partyList: string;
  blockOffice?: string;
  blockRepId?: string;
  stage1Votes: number;
  stage2Votes: number;
  totalVotes: number;
  rank: number;
  isFinalist: boolean;
}

export interface PositionFinalistsSummary {
  position: string;
  totalVotes: number;
  finalists: NominatedCandidateItem[];
  allNominees: NominatedCandidateItem[];
}

export const getNominatedFinalists = (topN = electionSettings.topFinalistsCount || 2): PositionFinalistsSummary[] => {
  const grouped = getCandidatesByPosition();
  return positions.map(pos => {
    const list = grouped[pos] || [];
    const sorted = [...list].sort((a, b) => {
      const vA = (typeof a.stage1Votes === "number" ? a.stage1Votes : a.votes) || 0;
      const vB = (typeof b.stage1Votes === "number" ? b.stage1Votes : b.votes) || 0;
      if (vB !== vA) return vB - vA;
      return a.name.localeCompare(b.name);
    });

    const totalVotes = sorted.reduce((s, c) => s + ((typeof c.stage1Votes === "number" ? c.stage1Votes : c.votes) || 0), 0);

    const allNominees: NominatedCandidateItem[] = sorted.map((c, idx) => ({
      id: c.id,
      name: c.name,
      course: c.course || "",
      year: c.year || "",
      block: c.block || "",
      photo: c.photo && !c.photo.includes("pravatar.cc") ? c.photo : "",
      partyList: c.partyList || "Independent",
      blockOffice: c.blockOffice || "Block Representative",
      blockRepId: c.blockRepId,
      stage1Votes: typeof c.stage1Votes === "number" ? c.stage1Votes : (c.votes || 0),
      stage2Votes: c.stage2Votes || 0,
      totalVotes: c.votes || 0,
      rank: idx + 1,
      isFinalist: idx < topN,
    }));

    const finalists = allNominees.filter(c => c.isFinalist);

    return {
      position: pos,
      totalVotes,
      finalists,
      allNominees,
    };
  });
};

export const SAMPLE_BLOCK_REPS: Omit<BlockRepresentative, "id">[] = [
  { name: "Jhonamery A. Surdilla", course: "BSIT", year: "3rd Year", block: "Block 3A", blockOffice: "Block Representative", photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80" },
  { name: "John Mark D. Villanueva", course: "BSIT", year: "3rd Year", block: "Block 3B", blockOffice: "Block Representative", photo: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80" },
  { name: "Princess Mae T. Alcantara", course: "BSBA", year: "2nd Year", block: "Block 2A", blockOffice: "Block Secretary", photo: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80" },
  { name: "Carl Angelo B. Ramos", course: "BSBA", year: "4th Year", block: "Block 4A", blockOffice: "Block Representative", photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80" },
  { name: "Mary Grace C. Fernandez", course: "BEEd", year: "3rd Year", block: "Block 3A", blockOffice: "Block Representative", photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80" },
  { name: "Joshua Kyle E. Mendoza", course: "BSCrim", year: "2nd Year", block: "Block 2B", blockOffice: "Block Representative", photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80" },
];

export const resetToStep1BlockReps = (fillSampleReps = false) => {
  votes = [];
  participants.forEach(p => {
    p.hasVoted = false;
    p.hasVotedStage1 = false;
    p.hasVotedStage2 = false;
    delete p.votedAt;
  });

  if (fillSampleReps) {
    blockReps = [];
    SAMPLE_BLOCK_REPS.forEach(r => {
      blockReps.push({
        ...r,
        id: `br${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      });
    });
  }

  // Reset candidates stage votes
  candidates = [];

  electionSettings = {
    ...electionSettings,
    currentStage: "STAGE_0_ROSTER",
    isOpen: false,
    stage1StartDate: "",
    stage1EndDate: "",
    stage2StartDate: "",
    stage2EndDate: "",
    startDate: "",
    endDate: "",
  };

  auditLogs.unshift({
    id: `a${Date.now()}`,
    action: "System Reset to Step 1",
    performedBy: "admin",
    details: `System reset to Step 1 (Stage 0: Roster Entry). Schedules cleared for manual setup.`,
    timestamp: new Date().toISOString(),
  });

  persistState();
};

export const getLeaderboard = () => {
  const stage = electionSettings.currentStage;
  const grouped = getCandidatesByPosition();
  return positions.map(pos => {
    const list = grouped[pos] || [];
    const sorted = [...list].sort((a, b) => {
      if (stage === "STAGE_2_FINAL" || stage === "COMPLETED") {
        return (b.stage2Votes || b.votes) - (a.stage2Votes || a.votes);
      }
      return (b.stage1Votes || b.votes) - (a.stage1Votes || a.votes);
    });
    return { position: pos, candidates: sorted };
  });
};

// Block Representatives Mutations
export const addBlockRep = (rep: Omit<BlockRepresentative, "id">) => {
  const newRep: BlockRepresentative = {
    ...rep,
    id: `br${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    name: rep.name.trim(),
    course: rep.course.trim(),
    year: rep.year.trim(),
    block: rep.block.trim(),
    photo: rep.photo?.trim() && !rep.photo.includes("pravatar.cc") ? rep.photo.trim() : "",
    blockOffice: rep.blockOffice || "Block Representative",
  };
  blockReps.push(newRep);
  auditLogs.unshift({
    id: `a${Date.now()}`,
    action: "Block Representative Registered",
    performedBy: "admin",
    details: `Inputted Block Representative ${newRep.name} (${newRep.course} ${newRep.year} ${newRep.block})`,
    timestamp: new Date().toISOString(),
  });
  persistState();
  return newRep;
};

export const updateBlockRep = (id: string, updates: Partial<BlockRepresentative>) => {
  const idx = blockReps.findIndex(b => b.id === id);
  if (idx !== -1) {
    blockReps[idx] = { ...blockReps[idx], ...updates };
    // Also update associated candidates
    candidates.forEach((c, cIdx) => {
      if (c.blockRepId === id) {
        candidates[cIdx] = {
          ...c,
          name: updates.name ?? c.name,
          course: updates.course ?? c.course,
          year: updates.year ?? c.year,
          block: updates.block ?? c.block,
          photo: updates.photo ?? c.photo,
        };
      }
    });
    persistState();
  }
};

export const deleteBlockRep = (id: string) => {
  const target = blockReps.find(b => b.id === id);
  blockReps = blockReps.filter(b => b.id !== id);

  const targetName = target?.name.trim().toLowerCase();
  const removedCandidateIds = candidates
    .filter(c => c.blockRepId === id || (targetName && c.name.trim().toLowerCase() === targetName))
    .map(c => c.id);

  candidates = candidates.filter(
    c => c.blockRepId !== id && (!targetName || c.name.trim().toLowerCase() !== targetName)
  );

  if (removedCandidateIds.length > 0) {
    votes = votes.filter(v => !removedCandidateIds.includes(v.candidateId));
  }

  auditLogs.unshift({
    id: `a${Date.now()}`,
    action: "Block Representative Deleted",
    performedBy: "admin",
    details: `Removed Block Representative ${target ? target.name : id}`,
    timestamp: new Date().toISOString(),
  });

  persistState();
};

export const clearAllBlockReps = () => {
  const count = blockReps.length;
  blockReps = [];
  candidates = candidates.filter(c => !c.blockRepId && !c.id.startsWith("c_br") && !c.id.startsWith("rep_"));
  const remainingCandidateIds = new Set(candidates.map(c => c.id));
  votes = votes.filter(v => remainingCandidateIds.has(v.candidateId));

  auditLogs.unshift({
    id: `a${Date.now()}`,
    action: "Block Representatives Cleared",
    performedBy: "admin",
    details: `Cleared all ${count} Block Representatives from roster to start fresh`,
    timestamp: new Date().toISOString(),
  });

  persistState();
};

export const startFromBeginning = () => {
  blockReps = [];
  candidates = [];
  votes = [];
  positions = [...DEFAULT_POSITIONS];
  participants.forEach(p => {
    p.hasVoted = false;
    p.hasVotedStage1 = false;
    p.hasVotedStage2 = false;
    delete p.votedAt;
  });

  electionSettings = {
    ...electionSettings,
    currentStage: "STAGE_0_ROSTER",
    isOpen: false,
    startDate: "",
    endDate: "",
    stage1StartDate: "",
    stage1EndDate: "",
    stage2StartDate: "",
    stage2EndDate: "",
  };

  auditLogs.unshift({
    id: `a${Date.now()}`,
    action: "Clean Start Initialized",
    performedBy: "admin",
    details: "Reset election to the very beginning with empty roster, Stage 0, and cleared schedules for manual setup",
    timestamp: new Date().toISOString(),
  });

  persistState();
};

export const importBlockReps = (reps: Omit<BlockRepresentative, "id">[]) => {
  const added: BlockRepresentative[] = [];
  reps.forEach(r => {
    if (r.name?.trim()) {
      added.push(addBlockRep(r));
    }
  });
  auditLogs.unshift({
    id: `a${Date.now()}`,
    action: "Block Representatives Bulk Imported",
    performedBy: "admin",
    details: `Bulk imported ${added.length} Block Representatives into roster`,
    timestamp: new Date().toISOString(),
  });
  persistState();
  return added;
};

// Candidate Mutations
export const nominateBlockRepToCandidate = (blockRepId: string, position: Position, partyList = "Independent") => {
  const rep = blockReps.find(b => b.id === blockRepId);
  if (!rep) return null;

  // Check if candidate already exists for this position
  const existing = candidates.find(c => c.blockRepId === blockRepId && c.position === position);
  if (existing) return existing;

  const newCandidate: Candidate = {
    id: `c${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    name: rep.name,
    position,
    partyList,
    photo: rep.photo?.trim() && !rep.photo.includes("pravatar.cc") ? rep.photo.trim() : "",
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
  candidates.push(newCandidate);
  auditLogs.unshift({
    id: `a${Date.now()}`,
    action: "Nominated to CSG Ballot",
    performedBy: "admin",
    details: `Nominated Block Rep ${rep.name} (${rep.course}) for CSG ${position}`,
    timestamp: new Date().toISOString(),
  });
  persistState();
  return newCandidate;
};

export const addCandidate = (candidate: Omit<Candidate, "id" | "votes" | "stage1Votes" | "stage2Votes" | "isFinalist">) => {
  const position = candidate.position.trim();
  if (!positions.includes(position)) return null;

  const newCandidate: Candidate = {
    ...candidate,
    id: `c${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    position,
    name: candidate.name.trim(),
    partyList: candidate.partyList.trim() || "Independent",
    course: candidate.course.trim(),
    blockOffice: candidate.blockOffice.trim() || "Block Representative",
    photo: candidate.photo.trim() && !candidate.photo.includes("pravatar.cc") ? candidate.photo.trim() : "",
    votes: 0,
    stage1Votes: 0,
    stage2Votes: 0,
    isFinalist: true,
  };
  candidates.push(newCandidate);
  auditLogs.unshift({
    id: `a${Date.now()}`,
    action: "Candidate Added",
    performedBy: "admin",
    details: `Added ${newCandidate.name} (${newCandidate.course}) for ${newCandidate.position}`,
    timestamp: new Date().toISOString(),
  });
  persistState();
  return newCandidate;
};

export const updateCandidate = (id: string, updates: Partial<Candidate>) => {
  const idx = candidates.findIndex(c => c.id === id);
  if (idx !== -1) {
    candidates[idx] = { ...candidates[idx], ...updates };
    persistState();
  }
};

export const deleteCandidate = (id: string) => {
  candidates = candidates.filter(c => c.id !== id);
  persistState();
};

// Stage & Transition Mutations
export const setElectionStage = (stage: ElectionStage) => {
  electionSettings.currentStage = stage;
  if (stage === "STAGE_1_NOMINATION") {
    electionSettings.startDate = electionSettings.stage1StartDate;
    electionSettings.endDate = electionSettings.stage1EndDate;
  } else if (stage === "STAGE_2_FINAL") {
    electionSettings.startDate = electionSettings.stage2StartDate;
    electionSettings.endDate = electionSettings.stage2EndDate;
  }
  auditLogs.unshift({
    id: `a${Date.now()}`,
    action: "Parliamentary Stage Changed",
    performedBy: "admin",
    details: `Election stage moved to ${stage}`,
    timestamp: new Date().toISOString(),
  });
  persistState();
};

export const advanceStage1Winners = (topN = 2) => {
  electionSettings.topFinalistsCount = topN;

  // Make sure all block reps voted in Stage 1 are officially in candidates pool
  positions.forEach(pos => {
    // Ensure every registered block rep has a candidate record for this position
    blockReps.forEach(rep => {
      let existing = candidates.find(c => (c.blockRepId === rep.id || c.name.toLowerCase() === rep.name.toLowerCase()) && c.position === pos);
      if (!existing) {
        existing = {
          id: `c_${rep.id}_${pos.replace(/[^a-zA-Z0-9]/g, "_")}`,
          name: rep.name,
          position: pos,
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
          isFinalist: false,
        };
        candidates.push(existing);
      }
    });

    // Find all candidates and block reps with stage 1 votes for this position
    const list = [...candidates.filter(c => c.position === pos)].sort((a, b) => (b.stage1Votes || b.votes) - (a.stage1Votes || a.votes));

    list.forEach((c, index) => {
      const idx = candidates.findIndex(cand => cand.id === c.id);
      if (idx !== -1) {
        candidates[idx].isFinalist = index < topN;
      }
    });
  });

  // Reset participant voting status for Stage 2 so voters can vote on Stage 2 Final
  participants.forEach(p => {
    p.hasVotedStage2 = false;
    p.hasVoted = false;
  });

  electionSettings.currentStage = "STAGE_2_FINAL";
  electionSettings.startDate = electionSettings.stage2StartDate || new Date().toISOString().substring(0, 16);
  electionSettings.endDate = electionSettings.stage2EndDate || new Date(Date.now() + 86400000).toISOString().substring(0, 16);

  auditLogs.unshift({
    id: `a${Date.now()}`,
    action: "Stage 1 Winners Advanced to CSG Candidates",
    performedBy: "admin",
    details: `Stage 1 votes tallied! Winning Block Representatives per position have automatically advanced into official CSG Candidates for Stage 2 Final Election.`,
    timestamp: new Date().toISOString(),
  });
  persistState();
};

export const toggleCandidateFinalist = (candidateId: string) => {
  const candidate = candidates.find(c => c.id === candidateId);
  if (candidate) {
    candidate.isFinalist = !candidate.isFinalist;
    persistState();
  }
};

// Voting Mutations
export const verifyStudent = (studentId: string): Participant | null => {
  const normalized = studentId.trim().toLowerCase();
  return participants.find(p => p.studentId.trim().toLowerCase() === normalized) || null;
};

export const registerOrVerifyStudent = (data: {
  studentId: string;
  name: string;
  course: Course | string;
  year?: string;
  block?: string;
}): { participant: Participant; isNew: boolean } => {
  const normalizedId = data.studentId.trim();
  let existing = participants.find(p => p.studentId.trim().toLowerCase() === normalizedId.toLowerCase());
  if (existing) {
    if (data.name && data.name.trim()) existing.name = data.name.trim();
    if (data.course && COURSES.includes(data.course as any)) existing.course = data.course;
    persistState();
    return { participant: existing, isNew: false };
  }

  const newParticipant: Participant = {
    id: `p${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    studentId: normalizedId,
    name: data.name.trim() || `Student ${normalizedId}`,
    course: (data.course as Course) || COURSES[0],
    year: data.year || YEAR_LEVELS[0],
    block: data.block || "Block A",
    hasVoted: false,
    hasVotedStage1: false,
    hasVotedStage2: false,
  };
  participants.push(newParticipant);
  auditLogs.unshift({
    id: `a${Date.now()}`,
    action: "Student Self-Registered via ID Scan",
    performedBy: "voter_portal",
    details: `Student verified & registered via PCC ID: ${newParticipant.name} (${newParticipant.studentId}) - ${newParticipant.course}`,
    timestamp: new Date().toISOString(),
  });
  persistState();
  return { participant: newParticipant, isNew: true };
};

export const castVote = (participantId: string, selections: Record<string, string>): boolean => {
  const participant = participants.find(p => p.id === participantId);
  if (!participant) return false;

  const stage = electionSettings.currentStage;
  const hasVotedInCurrentStage = votes.some(v => v.participantId === participantId && v.stage === stage);
  if (hasVotedInCurrentStage) return false;

  Object.entries(selections).forEach(([position, candidateId]) => {
    let candidate = candidates.find(c =>
      c.id === candidateId ||
      c.blockRepId === candidateId ||
      (c.blockRepId && candidateId.includes(c.blockRepId) && c.position === position) ||
      (c.position === position && candidateId.startsWith("rep_") && candidateId.includes(c.blockRepId || ""))
    );

    // If candidate does not exist in candidates array yet, create from Block Rep
    if (!candidate) {
      const repId = candidateId.startsWith("rep_") ? candidateId.replace(/^rep_/, "") : candidateId;
      const rep = blockReps.find(b => b.id === repId || candidateId.includes(b.id));
      if (rep) {
        candidate = {
          id: `c_${rep.id}_${position.replace(/[^a-zA-Z0-9]/g, "_")}`,
          name: rep.name,
          position,
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
        candidates.push(candidate);
      }
    }

    if (candidate) {
      if (stage === "STAGE_1_NOMINATION" || stage === "STAGE_0_ROSTER") {
        candidate.stage1Votes = (candidate.stage1Votes || 0) + 1;
        candidate.votes = candidate.stage1Votes + (candidate.stage2Votes || 0);
      } else if (stage === "STAGE_2_FINAL") {
        candidate.stage2Votes = (candidate.stage2Votes || 0) + 1;
        candidate.votes = (candidate.stage1Votes || 0) + candidate.stage2Votes;
      } else {
        candidate.votes += 1;
      }

      votes.push({
        id: `v${Date.now()}-${candidate.id}`,
        participantId,
        candidateId: candidate.id,
        position,
        stage,
        timestamp: new Date().toISOString(),
      });
    }
  });

  if (stage === "STAGE_1_NOMINATION" || stage === "STAGE_0_ROSTER") {
    participant.hasVotedStage1 = true;
    participant.hasVoted = true;
  } else if (stage === "STAGE_2_FINAL") {
    participant.hasVotedStage2 = true;
    participant.hasVoted = true;
  } else {
    participant.hasVoted = true;
  }
  participant.votedAt = new Date().toISOString();

  auditLogs.unshift({
    id: `a${Date.now()}`,
    action: `Vote Cast (${stage})`,
    performedBy: participant.name,
    details: `${participant.name} (${participant.studentId}) cast their vote in ${stage}`,
    timestamp: new Date().toISOString(),
  });

  persistState();
  return true;
};

// Participants Mutations
export const addParticipant = (participant: Omit<Participant, "id" | "hasVoted">) => {
  const newP: Participant = {
    ...participant,
    id: `p${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    studentId: participant.studentId.trim(),
    name: participant.name.trim(),
    course: participant.course.trim(),
    year: participant.year.trim(),
    block: participant.block?.trim(),
    hasVoted: false,
    hasVotedStage1: false,
    hasVotedStage2: false,
  };
  participants.push(newP);
  persistState();
  return newP;
};

export const importParticipants = (list: Omit<Participant, "id" | "hasVoted">[]): number => {
  let count = 0;
  list.forEach(p => {
    if (p.studentId?.trim() && p.name?.trim()) {
      // Avoid duplicate student IDs
      const exists = participants.some(existing => existing.studentId.trim().toLowerCase() === p.studentId.trim().toLowerCase());
      if (!exists) {
        addParticipant(p);
        count++;
      }
    }
  });
  if (count > 0) {
    auditLogs.unshift({
      id: `a${Date.now()}`,
      action: "Participants Imported",
      performedBy: "admin",
      details: `Imported ${count} student voters into voter registry`,
      timestamp: new Date().toISOString(),
    });
    persistState();
  }
  return count;
};

export const updateParticipant = (id: string, updates: Partial<Participant>) => {
  const idx = participants.findIndex(p => p.id === id);
  if (idx !== -1) {
    participants[idx] = { ...participants[idx], ...updates };
    persistState();
  }
};

export const deleteParticipant = (id: string) => {
  participants = participants.filter(p => p.id !== id);
  persistState();
};

export const updateSettings = (updates: Partial<ElectionSettings>) => {
  electionSettings = { ...electionSettings, ...updates };
  auditLogs.unshift({ id: `a${Date.now()}`, action: "Settings Updated", performedBy: "admin", details: `Election settings & schedules updated`, timestamp: new Date().toISOString() });
  persistState();
};

export const toggleElection = () => {
  electionSettings.isOpen = !electionSettings.isOpen;
  auditLogs.unshift({
    id: `a${Date.now()}`,
    action: electionSettings.isOpen ? "Election Opened" : "Election Closed",
    performedBy: "admin",
    details: `Election ${electionSettings.isOpen ? "opened" : "closed"} by admin`,
    timestamp: new Date().toISOString(),
  });
  persistState();
};

export const updatePositions = (newPositions: string[]): boolean => {
  const trimmed = newPositions.map(p => p.trim()).filter(Boolean);
  if (trimmed.length === 0) return false;

  const duplicates = trimmed.filter((p, i) => trimmed.indexOf(p) !== i);
  if (duplicates.length > 0) return false;

  positions.forEach((oldName, i) => {
    const newName = trimmed[i];
    if (newName && oldName !== newName) {
      candidates.forEach(c => {
        if (c.position === oldName) c.position = newName;
      });
      votes.forEach(v => {
        if (v.position === oldName) v.position = newName;
      });
    }
  });

  positions = trimmed;
  auditLogs.unshift({
    id: `a${Date.now()}`,
    action: "Positions Updated",
    performedBy: "admin",
    details: `Officer positions updated: ${trimmed.join(", ")}`,
    timestamp: new Date().toISOString(),
  });
  persistState();
  return true;
};

export const resetAllVotes = () => {
  votes = [];
  candidates.forEach(c => {
    c.votes = 0;
    c.stage1Votes = 0;
    c.stage2Votes = 0;
  });
  participants.forEach(p => {
    p.hasVoted = false;
    p.hasVotedStage1 = false;
    p.hasVotedStage2 = false;
    delete p.votedAt;
  });
  auditLogs.unshift({
    id: `a${Date.now()}`,
    action: "Votes Reset",
    performedBy: "admin",
    details: "All vote counts cleared and voters reset across all stages",
    timestamp: new Date().toISOString(),
  });
  persistState();
};

export const resetElectionData = () => {
  const defaults = getDefaultState();
  blockReps = defaults.blockReps;
  candidates = defaults.candidates;
  participants = defaults.participants;
  votes = defaults.votes;
  auditLogs = defaults.auditLogs;
  electionSettings = defaults.electionSettings;
  positions = defaults.positions;
  adminUsers = defaults.adminUsers ?? DEFAULT_ADMIN_USERS.map(u => ({ ...u }));
  persistState();
};

