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
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

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
        JSON.parse(body);
        fs.mkdirSync(path.dirname(dataFile), { recursive: true });
        fs.writeFileSync(dataFile, body, "utf-8");
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ ok: true }));
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
