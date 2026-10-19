import type { Plugin } from "vite";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import type { IncomingMessage, ServerResponse } from "node:http";

const API_PATH = "/api/election";
const NETWORK_INFO_PATH = "/api/network-info";

function getLocalIp(): string {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
  return "localhost";
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk: Buffer) => { data += chunk.toString(); });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function attachElectionApi(dataFile: string) {
  return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const url = req.url?.split("?")[0];

    if (url === NETWORK_INFO_PATH) {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      if (req.method === "OPTIONS") {
        res.statusCode = 204;
        res.end();
        return;
      }
      res.setHeader("Content-Type", "application/json");
      const localIp = getLocalIp();
      const port = process.env.PORT || "8443";
      res.end(JSON.stringify({
        localIp,
        port,
        localUrl: `http://${localIp}:${port}`,
      }));
      return;
    }

    if (url !== API_PATH) return next();

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, PUT, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-CEMS-Reset");

    if (req.method === "OPTIONS") {
      res.statusCode = 204;
      res.end();
      return;
    }

    try {
      if (req.method === "GET") {
        if (!fs.existsSync(dataFile)) {
          res.statusCode = 404;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(null));
          return;
        }
        const data = fs.readFileSync(dataFile, "utf-8");
        res.setHeader("Content-Type", "application/json");
        res.end(data);
        return;
      }

      if (req.method === "PUT") {
        const body = await readBody(req);
        const incoming = JSON.parse(body);
        let finalData = incoming;
        const isReset = req.headers["x-cems-reset"] === "true";

        if (!isReset && fs.existsSync(dataFile)) {
          try {
            const currentRaw = fs.readFileSync(dataFile, "utf-8");
            const current = JSON.parse(currentRaw);

            if (current && typeof current === "object") {
              // 1. Merge votes: keep all existing votes on disk + incoming votes by id
              const existingVotes = Array.isArray(current.votes) ? current.votes : [];
              const incomingVotes = Array.isArray(incoming.votes) ? incoming.votes : [];
              const voteMap = new Map();
              existingVotes.forEach((v: any) => { if (v && v.id) voteMap.set(v.id, v); });
              incomingVotes.forEach((v: any) => { if (v && v.id) voteMap.set(v.id, v); });
              const mergedVotes = Array.from(voteMap.values());

              // 2. Merge participants: preserve any who voted
              const existingParticipants = Array.isArray(current.participants) ? current.participants : [];
              const incomingParticipants = Array.isArray(incoming.participants) ? incoming.participants : [];
              const participantMap = new Map();
              existingParticipants.forEach((p: any) => {
                if (p && (p.id || p.studentId)) participantMap.set(p.studentId || p.id, p);
              });
              incomingParticipants.forEach((p: any) => {
                const key = p.studentId || p.id;
                const existing = participantMap.get(key);
                if (existing) {
                  participantMap.set(key, {
                    ...existing,
                    ...p,
                    hasVoted: existing.hasVoted || p.hasVoted,
                    hasVotedStage1: existing.hasVotedStage1 || p.hasVotedStage1,
                    hasVotedStage2: existing.hasVotedStage2 || p.hasVotedStage2,
                    votedAt: p.votedAt || existing.votedAt,
                  });
                } else {
                  participantMap.set(key, p);
                }
              });
              const mergedParticipants = Array.from(participantMap.values());

              // 3. Merge audit logs: union by id
              const existingLogs = Array.isArray(current.auditLogs) ? current.auditLogs : [];
              const incomingLogs = Array.isArray(incoming.auditLogs) ? incoming.auditLogs : [];
              const logMap = new Map();
              incomingLogs.forEach((l: any) => { if (l && l.id) logMap.set(l.id, l); });
              existingLogs.forEach((l: any) => { if (l && l.id && !logMap.has(l.id)) logMap.set(l.id, l); });
              const mergedAuditLogs = Array.from(logMap.values()).sort(
                (a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
              );

              // 4. Merge candidates & recount votes from mergedVotes
              const candidates = Array.isArray(incoming.candidates)
                ? incoming.candidates
                : Array.isArray(current.candidates)
                ? current.candidates
                : [];
              candidates.forEach((cand: any) => {
                const s1 = mergedVotes.filter(
                  (v: any) => v.candidateId === cand.id && (v.stage === "STAGE_1_NOMINATION" || v.stage === "STAGE_0_ROSTER")
                ).length;
                const s2 = mergedVotes.filter(
                  (v: any) => v.candidateId === cand.id && v.stage === "STAGE_2_FINAL"
                ).length;
                cand.stage1Votes = Math.max(cand.stage1Votes || 0, s1);
                cand.stage2Votes = Math.max(cand.stage2Votes || 0, s2);
                cand.votes = cand.stage1Votes + cand.stage2Votes;
              });

              finalData = {
                ...current,
                ...incoming,
                votes: mergedVotes,
                participants: mergedParticipants,
                auditLogs: mergedAuditLogs,
                candidates,
                lastUpdated: Math.max(Number(current.lastUpdated) || 0, Number(incoming.lastUpdated) || 0, Date.now()),
              };
            }
          } catch (e) {
            console.error("Error merging server state, using incoming body:", e);
          }
        }

        const outBody = JSON.stringify(finalData);
        fs.mkdirSync(path.dirname(dataFile), { recursive: true });
        fs.writeFileSync(dataFile, outBody, "utf-8");
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ ok: true, state: finalData }));
        return;
      }

      res.statusCode = 405;
      res.end();
    } catch (err) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: String(err) }));
    }
  };
}

export function electionApiPlugin(): Plugin {
  const dataFile = path.resolve(process.cwd(), "data", "election-data.json");

  return {
    name: "election-api",
    configureServer(server) {
      server.middlewares.use(attachElectionApi(dataFile));
    },
    configurePreviewServer(server) {
      server.middlewares.use(attachElectionApi(dataFile));
    },
  };
}
