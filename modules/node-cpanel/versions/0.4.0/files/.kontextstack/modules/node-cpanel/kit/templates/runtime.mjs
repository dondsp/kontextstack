// Node-only reference adapted from ContextStack's node-static-mysql-cpanel.
// Inert until reviewed and copied into a project. No authentication or storage.
import http from "node:http";
import { lstat, readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { isIP } from "node:net";

export function runtimeConfig(env = process.env) {
  const mode = env.NODE_ENV ?? "development";
  if (!["development", "test", "production"].includes(mode)) throw new Error("Unsupported runtime mode.");
  const portText = env.PORT ?? (mode === "production" ? "" : "4000");
  if (!/^[0-9]+$/.test(portText) || Number(portText) < 1 || Number(portText) > 65535) throw new Error("A valid injected PORT is required.");
  const host = env.API_HOST ?? "127.0.0.1";
  if (!isIP(host)) throw new Error("API_HOST must be a reviewed bind address.");
  const service = env.SERVICE_NAME ?? "";
  if (!/^[a-z][a-z0-9-]{1,63}$/.test(service)) throw new Error("A non-secret SERVICE_NAME is required.");
  let origin;
  try { origin = new URL(env.APP_BASE_URL); } catch { throw new Error("APP_BASE_URL is required."); }
  if (!["http:", "https:"].includes(origin.protocol) || origin.username || origin.password ||
      origin.origin !== env.APP_BASE_URL || /[<>]/.test(origin.hostname) ||
      (mode === "production" && origin.protocol !== "https:")) throw new Error("APP_BASE_URL is unsafe for the selected mode.");
  // Framework-specific proxy trust needs its own reviewed adapter. This minimal
  // reference does not use forwarded headers for identity, cookies or origin.
  if (env.TRUST_PROXY && env.TRUST_PROXY !== "false") throw new Error("Proxy trust requires a reviewed framework adapter.");
  return { mode, port: Number(portText), host, service, origin: origin.origin };
}

const types = new Map([[".html", "text/html; charset=utf-8"], [".css", "text/css; charset=utf-8"], [".js", "text/javascript; charset=utf-8"], [".svg", "image/svg+xml"], [".png", "image/png"], [".ico", "image/x-icon"]]);
function writeJson(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
  res.end(JSON.stringify(body));
}
function requestPath(raw) {
  if (typeof raw !== "string" || raw.length > 8192) throw new Error("Invalid request target.");
  const pathname = decodeURIComponent(raw.split("?")[0]);
  if (!pathname.startsWith("/") || pathname.startsWith("//") || /[\\\\\x00-\x1f]/.test(pathname) ||
      pathname.split("/").some((part) => part === ".." || part === ".")) throw new Error("Unsafe request path.");
  return pathname;
}
async function publicFile(root, relative) {
  let cursor = root;
  for (const part of relative.split("/")) {
    cursor = path.join(cursor, part);
    const details = await lstat(cursor);
    if (details.isSymbolicLink()) throw new Error("Symlink refused.");
  }
  const details = await lstat(cursor);
  if (!details.isFile() || details.size > 20_000_000) throw new Error("Not a bounded public file.");
  return readFile(cursor);
}

export async function createServer({ config, publicRoot, isReady = async () => true, log = () => {} }) {
  const root = await realpath(publicRoot);
  if (!(await lstat(publicRoot)).isDirectory()) throw new Error("Public root must be a real directory.");
  // Fail startup rather than presenting an incomplete artifact as healthy.
  await publicFile(root, "index.html");
  return http.createServer({ requestTimeout: 30_000, headersTimeout: 10_000, maxHeaderSize: 16_384 }, async (req, res) => {
    res.once("finish", () => { try { log({ event: "request", status: res.statusCode }); } catch {} });
    try {
      let pathname;
      try { pathname = requestPath(req.url); } catch { writeJson(res, 400, { error: "bad_request" }); return; }
      if (!["GET", "HEAD"].includes(req.method)) {
        res.setHeader("Allow", "GET, HEAD");
        writeJson(res, 405, { error: "method_not_allowed" });
        return;
      }
      if (pathname === "/api/health") {
        writeJson(res, 200, { ok: true, service: config.service });
        return;
      }
      if (pathname === "/api/ready") {
        let ready = false;
        try { ready = await isReady() === true; } catch {}
        writeJson(res, ready ? 200 : 503, { ready });
        return;
      }
      if (pathname === "/api" || pathname.startsWith("/api/")) {
        writeJson(res, 404, { error: "not_found" });
        return;
      }
      if (pathname.split("/").some((part) => part.startsWith("."))) {
        writeJson(res, 404, { error: "not_found" });
        return;
      }
      const relative = pathname === "/" ? "index.html" : pathname.slice(1);
      let content;
      let extension = path.extname(relative);
      try {
        if (!types.has(extension)) throw new Error("Not an allowed asset.");
        content = await publicFile(root, relative);
      } catch {
        if (extension || !(req.headers.accept ?? "").includes("text/html")) {
          writeJson(res, 404, { error: "not_found" });
          return;
        }
        extension = ".html";
        content = await publicFile(root, "index.html");
      }
      res.writeHead(200, { "Content-Type": types.get(extension), "Content-Length": content.length, "X-Content-Type-Options": "nosniff" });
      res.end(req.method === "HEAD" ? undefined : content);
    } catch {
      writeJson(res, 500, { error: "server_error" });
    }
  });
}

export function attachShutdown(server, { timeoutMs = 5_000 } = {}) {
  let stopping = false;
  const stop = () => {
    if (stopping) return;
    stopping = true;
    const timer = setTimeout(() => server.closeAllConnections(), timeoutMs);
    timer.unref();
    server.close(() => clearTimeout(timer));
  };
  process.once("SIGTERM", stop);
  process.once("SIGINT", stop);
  return () => {
    process.removeListener("SIGTERM", stop);
    process.removeListener("SIGINT", stop);
  };
}
