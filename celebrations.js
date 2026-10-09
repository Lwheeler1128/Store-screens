// SC Celebration Cup data: the SMG Celebration Alerts from the SC Celebration Board.
// The daily Claude task overwrites one OneDrive file every morning; this module downloads that
// file from its share link every 30 minutes and keeps the last good copy on disk.
const fs = require("fs");
const path = require("path");

module.exports = function ({ DATA_DIR, log }) {
  const CUP_PATH = path.join(DATA_DIR, "celebrations-cup.json");     // {updated, alerts}
  const OLD_PATH = path.join(DATA_DIR, "celebrations.json");         // older {updatedAt, alerts}
  const SRC_PATH = path.join(DATA_DIR, "celebrations-source.json");  // {url, lastCheck, lastOk, lastError}
  const EVERY_MS = 30 * 60 * 1000;

  const pad = n => String(n).padStart(2, "0");
  const localStamp = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; // server runs on Eastern time
  const str = (v, n) => String(v ?? "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, n);

  function clean(a) {
    const received = str(a.received, 16), store = str(a.store, 12);
    if (!/^\d{4}-\d{2}-\d{2}/.test(received) || !store) return null;
    let member = str(a.member, 60);
    if (/^(team\s*members?|n\/?a|none)$/i.test(member)) member = "";
    const expDate = /^\d{4}-\d{2}-\d{2}$/.test(str(a.expDate, 10)) ? str(a.expDate, 10) : "";
    const comment = a.excerpt ? "" : str(a.comment, 800); // excerpt-only rows keep no comment
    return { store, member, expDate, received, comment };
  }
  function normalize(obj, fallbackUpdated) {
    if (!obj || !Array.isArray(obj.alerts)) throw new Error("The file has no alerts list.");
    const alerts = obj.alerts.map(clean).filter(Boolean).sort((x, y) => x.received.localeCompare(y.received));
    let updated = str(obj.updated, 16);
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(updated)) updated = obj.updatedAt ? localStamp(new Date(obj.updatedAt)) : fallbackUpdated;
    return { updated, alerts };
  }

  let cup = { updated: "", alerts: [] };
  try { cup = JSON.parse(fs.readFileSync(CUP_PATH, "utf8")); }
  catch { try { cup = normalize(JSON.parse(fs.readFileSync(OLD_PATH, "utf8")), localStamp(new Date())); } catch {} }
  let src = { url: "", lastCheck: null, lastOk: null, lastError: "" };
  try { src = { ...src, ...JSON.parse(fs.readFileSync(SRC_PATH, "utf8")) }; } catch {}
  const saveSrc = () => fs.writeFileSync(SRC_PATH, JSON.stringify(src, null, 1));
  function saveCup(next, how) {
    cup = next;
    const tmp = CUP_PATH + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(cup));
    fs.renameSync(tmp, CUP_PATH);
    log(`Celebrations: ${cup.alerts.length} alerts saved (${how}, data from ${cup.updated})`);
  }

  // SharePoint/OneDrive share links give the file itself when download=1 is added.
  function downloadUrl(u) {
    const url = new URL(u);
    if (/sharepoint\.com|onedrive\.live\.com|1drv\.ms/i.test(url.hostname)) url.searchParams.set("download", "1");
    return url.toString();
  }
  let running = null;
  async function check() {
    if (!src.url) return;
    if (running) return running;
    running = (async () => {
      src.lastCheck = new Date().toISOString();
      try {
        const r = await fetch(downloadUrl(src.url), { redirect: "follow", signal: AbortSignal.timeout(30000) });
        if (!r.ok) throw new Error(`The link answered ${r.status}.`);
        const text = await r.text();
        let obj;
        try { obj = JSON.parse(text.replace(/^﻿/, "")); }
        catch { throw new Error("The link didn't return the data file. Make sure it's an \"Anyone with the link\" share of celebrations.json."); }
        const next = normalize(obj, localStamp(new Date()));
        if (next.updated !== cup.updated || next.alerts.length !== cup.alerts.length) saveCup(next, "downloaded");
        src.lastOk = new Date().toISOString(); src.lastError = "";
      } catch (e) {
        src.lastError = e.name === "TimeoutError" ? "The link didn't answer within 30 seconds." : e.message;
        log("Celebrations: download failed - " + src.lastError);
      } finally { saveSrc(); running = null; }
    })();
    return running;
  }
  setTimeout(check, 20000);
  setInterval(check, EVERY_MS);

  return {
    // public: the slide's data file, and the older shape used by /api/celebrations
    file: () => cup,
    apiView: () => ({ updatedAt: cup.updated ? new Date(cup.updated).toISOString() : null, alerts: cup.alerts.map(a => ({ ...a, excerpt: !a.comment })) }),
    adminView: () => ({ hasUrl: !!src.url, urlHint: src.url ? src.url.replace(/^(https?:\/\/[^/]+).*$/, "$1/…") : "", lastCheck: src.lastCheck, lastOk: src.lastOk, lastError: src.lastError, updated: cup.updated, count: cup.alerts.length }),
    async setUrl(url) {
      url = String(url || "").trim();
      if (url && !/^https:\/\/\S+$/i.test(url)) throw new Error("Paste the full share link, starting with https://");
      src.url = url; src.lastError = ""; saveSrc();
      if (url) await check();
    },
    check,
    upload(obj) { const next = normalize(obj, localStamp(new Date())); saveCup(next, "uploaded"); return next.alerts.length; },
  };
};
