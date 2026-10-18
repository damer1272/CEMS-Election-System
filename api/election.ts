import type { IncomingMessage, ServerResponse } from "node:http";
import fs from "node:fs";
import path from "node:path";

let inMemoryData: any = null;

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk: Buffer) => { data += chunk.toString(); });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

export default async function handler(req: IncomingMessage & { body?: any; method?: string }, res: ServerResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, PUT, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  const kvUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const kvToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  if (req.method === "GET") {
    res.setHeader("Content-Type", "application/json");

    if (kvUrl && kvToken) {
      try {
        const kvRes = await fetch(`${kvUrl}/get/cems_election_data`, {
          headers: { Authorization: `Bearer ${kvToken}` }
        });
        const kvJson = (await kvRes.json()) as { result?: any };
        if (kvJson.result) {
          const parsed = typeof kvJson.result === "string" ? JSON.parse(kvJson.result) : kvJson.result;
          res.statusCode = 200;
          res.end(JSON.stringify(parsed));
          return;
        }
      } catch (e) {
        console.error("KV read error:", e);
      }
    }

    if (inMemoryData) {
      res.statusCode = 200;
      res.end(JSON.stringify(inMemoryData));
      return;
    }

    try {
      const dataFilePath = path.join(process.cwd(), "data", "election-data.json");
      if (fs.existsSync(dataFilePath)) {
        const fileContent = fs.readFileSync(dataFilePath, "utf8");
        res.statusCode = 200;
        res.end(fileContent);
        return;
      }
    } catch {}

    res.statusCode = 200;
    res.end(JSON.stringify(null));
    return;
  }

  if (req.method === "PUT") {
    res.setHeader("Content-Type", "application/json");
    let body = req.body;
    if (!body) {
      try {
        const raw = await readBody(req);
        body = JSON.parse(raw);
      } catch {
        body = null;
      }
    }

    if (body) {
      if (!inMemoryData || !inMemoryData.lastUpdated || !body.lastUpdated || body.lastUpdated >= inMemoryData.lastUpdated) {
        inMemoryData = body;
      }
    }

    if (kvUrl && kvToken && body) {
      try {
        await fetch(`${kvUrl}/set/cems_election_data`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${kvToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(body)
        });
      } catch (e) {
        console.error("KV write error:", e);
      }
    }

    res.statusCode = 200;
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  res.statusCode = 405;
  res.end(JSON.stringify({ error: "Method not allowed" }));
}
