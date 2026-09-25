// Store Screens live feeder
// Opens each store's Berry AI drive-thru dashboard in a hidden browser,
// reads the numbers every few seconds, and serves a live leaderboard at
// http://localhost:<port>. Close this window to stop it.

const fs = require("fs");
const path = require("path");
const http = require("http");
const os = require("os");

const ROOT = __dirname;
const CONFIG_PATH = path.join(ROOT, "config.json");
const DATA_DIR = path.join(ROOT, "data");
const PUBLIC_DIR = path.join(ROOT, "public");

function loadConfig() {
  const cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  cfg.pollSeconds = Math.max(2, cfg.pollSeconds || 5);
  cfg.port = cfg.port || 8787;
  cfg.goalSeconds = cfg.goalSeconds || 240;
  if (!cfg.token || cfg.token.includes("PASTE")) throw new Error("Put your Berry board token in config.json (the long code after berry_board_token= in a dashboard link).");
  if (!Array.isArray(cfg.stores) || !cfg.stores.length) throw new Error("Add at least one store to config.json.");
  return cfg;
}

const cfg = loadConfig();
fs.mkdirSync(DATA_DIR, { recursive: true });

const log = (...a) => console.log(new Date().toLocaleTimeString(), "-", ...a);

// ---------- token expiry warning ----------
function tokenExpiry(token) {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
    return payload.exp ? new Date(payload.exp * 1000) : null;
  } catch { return null; }
}
const expires = tokenExpiry(cfg.token);

// ---------- the reader that runs inside each Berry dashboard ----------
// It reads the visible text of the page, the same numbers a person sees.
const READER = () => {
  const L = document.body.innerText.split("\n").map(s => s.trim()).filter(Boolean);
  const at = (k, from = 0) => L.indexOf(k, from);
  const toS = t => { const m = /^(\d+):(\d{2})$/.exec(t || ""); return m ? +m[1] * 60 + +m[2] : null; };
  if (at("Window Time") < 0) return { ready: false };
  const daypart = L.find(s => /^Daypart \d$/.test(s)) || "";
  const dpi = L.indexOf(daypart);
  const wi = at("Window Time");
  const mi = L.findIndex(s => /^Menu \(POD\)\d? Time/i.test(s));
  const th = at("Total Time(PF)");
  const end = at("Today's Drive-offs");
  let i = at("Cars", th) + 1, exp = 1; const rows = [];
  while (th >= 0 && i < end && exp <= 6) {
    if (L[i] === String(exp)) {
      const r = { dp: exp, t: null, cars: 0 };
      if (toS(L[i + 1]) != null) { r.t = toS(L[i + 1]); r.cars = +L[i + 2] || 0; i += 3; } else i += 1;
      rows.push(r); exp++;
    } else i++;
  }
  const done = rows.filter(r => r.t != null && r.cars > 0);
  const cars = done.reduce((a, r) => a + r.cars, 0);
  const ti = at("Total Time (PF)");
  return {
    ready: true,
    berryName: L[0],
    daypart: daypart ? daypart + " " + (L[dpi + 1] || "") : "",
    windowNow: toS(L[wi + 1]),
    windowAvg: toS(L[wi + 3]),
    windowGoal: toS(L[wi + 5]),
    queue: +L[at("Cars in Queue") + 1] || 0,
    menuAvg: mi >= 0 ? toS(L[mi + 3]) : null,
    driveOffs: end >= 0 ? (+L[end + 1] || 0) : 0,
    daypartAvg: ti >= 0 ? toS(L[ti + 2]) : null,
    todayAvg: cars ? Math.round(done.reduce((a, r) => a + r.t * r.cars, 0) / cars) : null,
    todayCars: cars,
    dayparts: rows.filter(r => r.t != null)
  };
};

// ---------- state ----------
const live = {}; // code -> latest reading + status
cfg.stores.forEach(s => { live[s.code] = { status: "starting" }; });

function storeUrl(s) {
  if (s.url) return s.url; // lets you override per store
  const base = cfg.dashboardUrl || "https://drivethru-remote.berry-ai.com/";
  return `${base}?branch_alias=${encodeURIComponent(s.code)}&crop=${encodeURIComponent(cfg.crop || "bec_group")}&berry_board_token=${encodeURIComponent(cfg.token)}`;
}

// ---------- history log (one line per store per reading) ----------
const HIST = path.join(DATA_DIR, "history.csv");
if (!fs.existsSync(HIST)) fs.writeFileSync(HIST, "time,code,store,daypart,today_avg_sec,daypart_avg_sec,cars_today,window_avg_sec,menu_avg_sec,queue,drive_offs\n");
const lastLogged = {};
function logHistory(s, r) {
  const key = [r.todayAvg, r.daypartAvg, r.todayCars, r.queue].join("|");
  if (lastLogged[s.code] === key) return; // only log changes
  lastLogged[s.code] = key;
  const q = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
  fs.appendFile(HIST, [new Date().toISOString(), s.code, q(s.name), q(r.daypart), r.todayAvg ?? "", r.daypartAvg ?? "", r.todayCars ?? "", r.windowAvg ?? "", r.menuAvg ?? "", r.queue ?? "", r.driveOffs ?? ""].join(",") + "\n", () => {});
}

// ---------- browser ----------
async function launchBrowser() {
  let pw;
  try { pw = require("playwright-core"); }
  catch { throw new Error("Missing parts. Close this window and double-click START.bat again so it can finish installing."); }
  if (cfg.browserPath) {
    const b = await pw.chromium.launch({ executablePath: cfg.browserPath, headless: !cfg.showBrowser });
    log(`Using browser at ${cfg.browserPath}`);
    return b;
  }
  const tries = cfg.browser ? [cfg.browser] : ["msedge", "chrome"];
  for (const channel of tries) {
    try {
      const b = await pw.chromium.launch({ channel, headless: !cfg.showBrowser });
      log(`Using ${channel === "msedge" ? "Microsoft Edge" : "Google Chrome"} in the background.`);
      return b;
    } catch (e) { /* try the next one */ }
  }
  try {
    const b = await pw.chromium.launch({ headless: !cfg.showBrowser });
    log("Using the built-in Chromium browser.");
    return b;
  } catch (e) { /* fall through */ }
  throw new Error("Couldn't start Microsoft Edge, Google Chrome or Chromium. Make sure one of them is installed.");
}

async function runStore(browser, s) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 840 } });
  const page = await ctx.newPage();
  let loadedAt = 0, lastGood = 0;
  const open = async () => {
    live[s.code].status = "loading";
    try { await page.goto(storeUrl(s), { waitUntil: "domcontentloaded", timeout: 45000 }); }
    catch (e) { log(`${s.name}: couldn't open dashboard (${e.message.split("\n")[0]})`); }
    loadedAt = Date.now();
  };
  await open();
  const reloadEveryMs = (cfg.reloadMinutes || 30) * 60000;
  for (;;) {
    let r = null;
    try { r = await page.evaluate(READER); } catch { r = null; }
    const now = Date.now();
    if (r && r.ready) {
      lastGood = now;
      live[s.code] = { ...r, status: "ok", updatedAt: new Date().toISOString() };
      logHistory(s, r);
    } else {
      const prev = live[s.code];
      live[s.code] = { ...prev, status: prev && prev.updatedAt ? "stale" : "loading" };
      // Berry's page sometimes sticks on "Active Loading"; a reload fixes it.
      if (now - loadedAt > 25000) { log(`${s.name}: dashboard stuck loading, reloading`); await open(); }
    }
    if (now - loadedAt > reloadEveryMs && lastGood) { await open(); }
    await new Promise(res => setTimeout(res, cfg.pollSeconds * 1000));
  }
}

// ---------- content (playlist) storage ----------
const crypto = require("crypto");
const MEDIA_DIR = path.join(DATA_DIR, "media");
const CONTENT_PATH = path.join(DATA_DIR, "content.json");
fs.mkdirSync(MEDIA_DIR, { recursive: true });
let content = { items: [] };
try { content = JSON.parse(fs.readFileSync(CONTENT_PATH, "utf8")); } catch {
  content = { items: [
    { id: "leaderboard", type: "leaderboard", name: "Drive-Thru Leaderboard", duration: 20, active: true, stores: "all", order: 1, createdAt: new Date().toISOString() },
    { id: newId(), type: "announcement", name: "Welcome", title: "Let's Get Fast!", body: "Every car counts. Check the leaderboard to see where your store ranks today.", color: "red", duration: 10, active: true, stores: "all", order: 2, createdAt: new Date().toISOString() }
  ] };
  saveContent();
}
function newId() { return crypto.randomBytes(6).toString("hex"); }
function saveContent() {
  const tmp = CONTENT_PATH + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(content, null, 1));
  fs.renameSync(tmp, CONTENT_PATH);
}
function saveConfig() {
  const onDisk = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  onDisk.goalSeconds = cfg.goalSeconds;
  if (cfg.adminPassword) onDisk.adminPassword = cfg.adminPassword;
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(onDisk, null, 2));
}
if (!cfg.adminPassword) { cfg.adminPassword = "zax-" + crypto.randomBytes(3).toString("hex"); saveConfig(); }

const ITEM_FIELDS = ["type", "name", "title", "body", "color", "duration", "active", "stores", "file", "mime"];
function cleanItem(src, base = {}) {
  const it = { ...base };
  for (const k of ITEM_FIELDS) if (k in src) it[k] = src[k];
  it.duration = Math.max(3, Math.min(600, +it.duration || 10));
  it.active = it.active !== false;
  if (it.stores !== "all" && !Array.isArray(it.stores)) it.stores = "all";
  ["name", "title", "body"].forEach(k => { if (it[k] != null) it[k] = String(it[k]).slice(0, 400); });
  return it;
}

// ---------- web server ----------
function payload() {
  return {
    generatedAt: new Date().toISOString(),
    goalSeconds: cfg.goalSeconds,
    title: cfg.boardTitle || "Drive-Thru Showdown",
    tokenExpires: expires ? expires.toISOString() : null,
    stores: cfg.stores.map(s => ({ code: s.code, name: s.name, num: s.num || "", ...live[s.code] }))
  };
}
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".webp": "image/webp", ".svg": "image/svg+xml", ".mp4": "video/mp4", ".webm": "video/webm" };
const EXT_FOR = { "image/png": ".png", "image/jpeg": ".jpg", "image/gif": ".gif", "image/webp": ".webp", "video/mp4": ".mp4", "video/webm": ".webm" };
const MAX_UPLOAD = (cfg.maxUploadMB || 300) * 1024 * 1024;

function sendJson(res, code, obj) {
  res.writeHead(code, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  res.end(JSON.stringify(obj));
}
function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = []; let n = 0;
    req.on("data", c => { n += c.length; if (n > limit) { reject(Object.assign(new Error("too_large"), { code: 413 })); req.destroy(); } else chunks.push(c); });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}
function isAdmin(req) {
  const given = String(req.headers["x-admin-password"] || "");
  const a = Buffer.from(given), b = Buffer.from(String(cfg.adminPassword));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
function serveFile(req, res, file) {
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404); return res.end("Not found"); }
    const type = TYPES[path.extname(file).toLowerCase()] || "application/octet-stream";
    const range = /bytes=(\d*)-(\d*)/.exec(req.headers.range || "");
    if (range) { // videos need this to play smoothly
      const startB = range[1] ? +range[1] : 0, endB = range[2] ? +range[2] : st.size - 1;
      if (startB >= st.size) { res.writeHead(416, { "Content-Range": `bytes */${st.size}` }); return res.end(); }
      res.writeHead(206, { "Content-Type": type, "Content-Range": `bytes ${startB}-${endB}/${st.size}`, "Accept-Ranges": "bytes", "Content-Length": endB - startB + 1 });
      return fs.createReadStream(file, { start: startB, end: endB }).pipe(res);
    }
    res.writeHead(200, { "Content-Type": type, "Content-Length": st.size, "Accept-Ranges": "bytes", "Cache-Control": file.startsWith(MEDIA_DIR) ? "public, max-age=86400" : "no-cache" });
    fs.createReadStream(file).pipe(res);
  });
}

async function api(req, res, url) {
  const p = url.pathname, m = req.method;
  if (p === "/api/live") { res.setHeader("Access-Control-Allow-Origin", "*"); return sendJson(res, 200, payload()); }
  if (p === "/api/content" && m === "GET") {
    return sendJson(res, 200, { items: [...content.items].sort((a, b) => a.order - b.order), stores: cfg.stores.map(s => ({ code: s.code, name: s.name, num: s.num || "" })), goalSeconds: cfg.goalSeconds });
  }
  if (p === "/api/info" && m === "GET") {
    return sendJson(res, 200, { port: cfg.port, lan: cfg.publicUrl ? [] : lanAddresses(), publicUrl: cfg.publicUrl || null, tokenExpires: expires ? expires.toISOString() : null });
  }
  // everything below changes things, so it needs the dashboard password
  if (!isAdmin(req)) return sendJson(res, 401, { error: "Wrong or missing dashboard password." });
  if (p === "/api/login") return sendJson(res, 200, { ok: true });
  if (p === "/api/upload" && m === "PUT") {
    const mime = String(req.headers["content-type"] || "").split(";")[0].trim().toLowerCase();
    const ext = EXT_FOR[mime];
    if (!ext) return sendJson(res, 415, { error: "Use a JPG, PNG, WEBP, GIF, MP4 or WEBM file." });
    let buf; try { buf = await readBody(req, MAX_UPLOAD); } catch (e) { return sendJson(res, 413, { error: `That file is over ${cfg.maxUploadMB || 300} MB.` }); }
    if (!buf.length) return sendJson(res, 400, { error: "The file is empty." });
    const file = newId() + ext;
    fs.writeFileSync(path.join(MEDIA_DIR, file), buf);
    return sendJson(res, 200, { file, mime, url: "/media/" + file });
  }
  if (p === "/api/content" && m === "POST") {
    const body = JSON.parse((await readBody(req, 1e6)).toString() || "{}");
    const it = cleanItem(body, { id: newId(), createdAt: new Date().toISOString(), order: Math.max(0, ...content.items.map(i => i.order || 0)) + 1 });
    if (!["image", "video", "announcement"].includes(it.type)) return sendJson(res, 400, { error: "Unknown item type." });
    content.items.push(it); saveContent();
    log(`Dashboard: added "${it.name}"`);
    return sendJson(res, 200, it);
  }
  const one = /^\/api\/content\/([a-z0-9]+)$/.exec(p);
  if (one) {
    const idx = content.items.findIndex(i => i.id === one[1]);
    if (idx < 0) return sendJson(res, 404, { error: "That item no longer exists." });
    if (m === "PATCH") {
      const body = JSON.parse((await readBody(req, 1e6)).toString() || "{}");
      delete body.type; delete body.file;
      content.items[idx] = cleanItem(body, content.items[idx]); saveContent();
      return sendJson(res, 200, content.items[idx]);
    }
    if (m === "DELETE") {
      const [gone] = content.items.splice(idx, 1);
      if (gone.type === "leaderboard") { content.items.splice(idx, 0, gone); return sendJson(res, 400, { error: "The leaderboard can be paused but not removed." }); }
      if (gone.file && !content.items.some(i => i.file === gone.file)) fs.unlink(path.join(MEDIA_DIR, path.basename(gone.file)), () => {});
      saveContent(); log(`Dashboard: removed "${gone.name}"`);
      return sendJson(res, 200, { ok: true });
    }
  }
  if (p === "/api/order" && m === "POST") {
    const { ids } = JSON.parse((await readBody(req, 1e6)).toString() || "{}");
    if (Array.isArray(ids)) { ids.forEach((id, i) => { const it = content.items.find(x => x.id === id); if (it) it.order = i + 1; }); saveContent(); }
    return sendJson(res, 200, { ok: true });
  }
  if (p === "/api/settings" && m === "POST") {
    const body = JSON.parse((await readBody(req, 1e5)).toString() || "{}");
    if (body.goalSeconds) cfg.goalSeconds = Math.max(60, Math.min(900, +body.goalSeconds));
    saveConfig(); log(`Dashboard: goal set to ${fmt(cfg.goalSeconds)}`);
    return sendJson(res, 200, { goalSeconds: cfg.goalSeconds });
  }
  return sendJson(res, 404, { error: "Not found" });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  try {
    if (url.pathname.startsWith("/api/")) return await api(req, res, url);
    if (url.pathname.startsWith("/media/")) return serveFile(req, res, path.join(MEDIA_DIR, path.basename(decodeURIComponent(url.pathname))));
    const routes = { "/": "/board.html", "/board": "/board.html", "/admin": "/admin.html", "/tv": "/tv.html" };
    const p = routes[url.pathname] || url.pathname;
    const file = path.normalize(path.join(PUBLIC_DIR, p));
    if (!file.startsWith(PUBLIC_DIR)) { res.writeHead(403); return res.end(); }
    serveFile(req, res, file);
  } catch (e) {
    log("Server error: " + e.message);
    if (!res.headersSent) sendJson(res, 500, { error: "Something went wrong: " + e.message });
  }
});

function lanAddresses() {
  return Object.values(os.networkInterfaces()).flat().filter(a => a && a.family === "IPv4" && !a.internal).map(a => a.address);
}

// ---------- console summary ----------
const fmt = s => s == null ? " -- " : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
function printSummary() {
  const rows = cfg.stores.map(s => ({ s, r: live[s.code] })).sort((a, b) => (a.r.todayAvg ?? 9e9) - (b.r.todayAvg ?? 9e9));
  console.log(`\n${new Date().toLocaleTimeString()}  Today avg  Daypart  Cars  Status`);
  rows.forEach(({ s, r }, i) => console.log(`  ${i + 1}. ${s.name.padEnd(22).slice(0, 22)} ${fmt(r.todayAvg).padStart(5)}    ${fmt(r.daypartAvg).padStart(5)}  ${String(r.todayCars ?? "--").padStart(4)}  ${r.status}`));
}

(async () => {
  console.log("\n  STORE SCREENS LIVE FEEDER\n  -------------------------");
  if (expires) {
    const days = Math.round((expires - Date.now()) / 86400000);
    console.log(`  Berry access key expires ${expires.toLocaleDateString()} (${days} days).${days < 7 ? "  ASK BERRY FOR A NEW ONE SOON." : ""}`);
  }
  server.listen(cfg.port, cfg.host || undefined, () => {
    if (cfg.publicUrl) console.log(`\n  Dashboard: ${cfg.publicUrl}/admin   TV: ${cfg.publicUrl}/tv?store=CODE`);
    console.log(`\n  Content dashboard:   http://localhost:${cfg.port}/admin    (password: ${cfg.adminPassword})`);
    console.log(`  Leaderboard only:    http://localhost:${cfg.port}`);
    console.log(`  Store TV player:     http://localhost:${cfg.port}/tv?store=ZBBG10   (store code)`);
    lanAddresses().forEach(ip => console.log(`  From a TV on the same Wi-Fi, use http://${ip}:${cfg.port} in place of http://localhost:${cfg.port}`));
    console.log(`\n  Keep this window open. Close it to stop.\n`);
  });
  server.on("error", e => { console.error(e.code === "EADDRINUSE" ? `Port ${cfg.port} is busy. Is the feeder already running in another window?` : e.message); process.exit(1); });

  const browser = await launchBrowser();
  cfg.stores.forEach((s, i) => setTimeout(() => runStore(browser, s).catch(e => log(`${s.name}: ${e.message}`)), i * 3000));
  setInterval(printSummary, 60000);
  setTimeout(printSummary, 30000);
})().catch(e => { console.error("\n  PROBLEM: " + e.message + "\n"); process.exit(1); });
