// Google reviews for each store.
// Looks up each store's Google listing once, then checks its newest reviews
// ONCE A DAY. A hard monthly limit keeps usage inside Google's free allowance,
// so this never costs anything even if someone clicks "check now" a lot.

const fs = require("fs");
const path = require("path");

module.exports = function setupReviews({ DATA_DIR, cfg, log }) {
  const FILE = path.join(DATA_DIR, "reviews.json");
  const KEY_FILE = path.join(DATA_DIR, "google.json"); // never in git, never sent to browsers
  // Google gives 1,000 free review lookups and 5,000 free place searches a month.
  // We stop well short of both.
  const DETAILS_CAP = Math.min(900, cfg.reviewsMonthlyCap || 700);
  const SEARCH_CAP = 150;
  const DAILY_HOUR = cfg.reviewsHour ?? 6; // 6 AM Eastern
  const TZ = cfg.timeZone || "America/New_York";

  let db = { mode: null, stores: {}, usage: {}, lastDaily: null, minStars: 4 };
  try { db = { ...db, ...JSON.parse(fs.readFileSync(FILE, "utf8")) }; } catch {}
  let apiKey = "", serpKey = "";
  try { const k = JSON.parse(fs.readFileSync(KEY_FILE, "utf8")); apiKey = k.apiKey || ""; serpKey = k.serpKey || ""; } catch {}
  // SerpApi (optional) gives the true newest reviews. Free plan = 250 lookups/month,
  // so by default we check every other day and stop at 240.
  const SERP_CAP = cfg.serpMonthlyCap || 240;
  const SERP_EVERY_DAYS = cfg.serpEveryDays || 2;

  const save = () => { const t = FILE + ".tmp"; fs.writeFileSync(t, JSON.stringify(db, null, 1)); fs.renameSync(t, FILE); };
  const saveKey = () => { fs.writeFileSync(KEY_FILE, JSON.stringify({ apiKey, serpKey }), { mode: 0o600 }); };

  // ---- local date/time in Eastern ----
  function nowParts() {
    const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" }).formatToParts(new Date()).map(x => [x.type, x.value]));
    return { day: `${p.year}-${p.month}-${p.day}`, month: `${p.year}-${p.month}`, hour: +p.hour };
  }
  function usage() {
    const { month } = nowParts();
    if (db.usage.month !== month) db.usage = { month, details: 0, search: 0, serp: 0 };
    db.usage.serp = db.usage.serp || 0;
    return db.usage;
  }
  function spend(kind) {
    const u = usage(); const cap = kind === "details" ? DETAILS_CAP : kind === "serp" ? SERP_CAP : SEARCH_CAP;
    if (u[kind] >= cap) throw new Error(`Monthly free limit reached (${u[kind]} of ${cap}). It resets on the 1st.`);
    u[kind]++; save();
  }

  // ---- Google calls ----
  async function searchPlaces(text) {
    if (!apiKey) throw new Error("Add your Google API key first.");
    spend("search");
    const r = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": apiKey, "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount" },
      body: JSON.stringify({ textQuery: String(text).slice(0, 200), maxResultCount: 5 })
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(googleError(d, r.status));
    return (d.places || []).map(p => ({ placeId: p.id, name: p.displayName?.text || "", address: p.formattedAddress || "", rating: p.rating ?? null, total: p.userRatingCount ?? null }));
  }

  async function fetchLegacy(placeId) {
    const u = new URL("https://maps.googleapis.com/maps/api/place/details/json");
    u.search = new URLSearchParams({ place_id: placeId, fields: "rating,user_ratings_total,reviews", reviews_sort: "newest", reviews_no_translations: "true", key: apiKey });
    const d = await (await fetch(u)).json();
    if (d.status !== "OK") { const e = new Error(d.error_message || d.status); e.status = d.status; throw e; }
    const x = d.result || {};
    return { rating: x.rating ?? null, total: x.user_ratings_total ?? null, reviews: (x.reviews || []).map(v => ({ author: v.author_name || "Google user", rating: v.rating, text: v.text || "", time: v.time ? new Date(v.time * 1000).toISOString() : null })) };
  }
  async function fetchNew(placeId) {
    const r = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=en`, { headers: { "X-Goog-Api-Key": apiKey, "X-Goog-FieldMask": "rating,userRatingCount,reviews" } });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(googleError(d, r.status));
    return { rating: d.rating ?? null, total: d.userRatingCount ?? null, reviews: (d.reviews || []).map(v => ({ author: v.authorAttribution?.displayName || "Google user", rating: v.rating, text: v.originalText?.text || v.text?.text || "", time: v.publishTime || null })) };
  }
  async function fetchSerp(placeId) {
    spend("serp");
    const u = new URL("https://serpapi.com/search.json");
    u.search = new URLSearchParams({ engine: "google_maps_reviews", place_id: placeId, sort_by: "newestFirst", hl: "en", api_key: serpKey });
    const d = await (await fetch(u)).json().catch(() => ({}));
    if (d.error) throw new Error("SerpApi: " + d.error);
    const pi = d.place_info || {};
    return { rating: pi.rating ?? null, total: pi.reviews ?? null, reviews: (d.reviews || []).map(v => ({ author: v.user?.name || "Google user", rating: v.rating, text: v.extracted_snippet?.original || v.snippet || "", time: v.iso_date || null })) };
  }
  // The older Google lookup can sort by newest; newer Google accounts may only have the new one.
  async function fetchDetails(placeId) {
    if (db.mode !== "new") {
      spend("details");
      try { const x = await fetchLegacy(placeId); if (db.mode !== "legacy") { db.mode = "legacy"; save(); } return x; }
      catch (e) {
        if (e.status !== "REQUEST_DENIED" || db.mode === "legacy") throw e;
        db.mode = "new"; save(); log("Google reviews: using the new Places API");
      }
    }
    spend("details");
    return fetchNew(placeId);
  }
  function googleError(d, status) {
    const m = d?.error?.message || `Google said ${status}`;
    if (/API key not valid/i.test(m)) return "Google says that API key isn't valid. Check it was copied fully.";
    if (/not been used|disabled|not enabled/i.test(m)) return "The Places API isn't turned on for this key yet. Turn on \"Places API (New)\" in Google Cloud, wait 2 minutes, and try again.";
    if (/billing/i.test(m)) return "Google needs a billing account on the project (you won't be charged at this usage).";
    return m;
  }

  async function refreshStore(code) {
    const s = db.stores[code]; if (!s?.placeId) return;
    try {
      const viaSerp = !!serpKey;
      const x = viaSerp ? await fetchSerp(s.placeId) : await fetchDetails(s.placeId);
      if (viaSerp && x.rating == null && s.rating != null) { x.rating = s.rating; x.total = s.total; }
      const byNewest = x.reviews.filter(v => v.text || v.rating).sort((a, b) => Date.parse(b.time || 0) - Date.parse(a.time || 0)).slice(0, viaSerp ? 8 : 5);
      if (viaSerp) { Object.assign(s, { rating: x.rating, total: x.total, reviews: byNewest, source: "serpapi", fetchedAt: new Date().toISOString(), error: null }); save(); return; }
      // keep what we've already seen so the TV has more than 5 to pick from over time
      const seen = new Map((s.reviews || []).map(v => [v.author + "|" + v.time, v]));
      byNewest.forEach(v => seen.set(v.author + "|" + v.time, v));
      Object.assign(s, { rating: x.rating, total: x.total, reviews: [...seen.values()].sort((a, b) => Date.parse(b.time || 0) - Date.parse(a.time || 0)).slice(0, 20), fetchedAt: new Date().toISOString(), error: null });
    } catch (e) { s.error = e.message; s.errorAt = new Date().toISOString(); log(`Google reviews (${code}): ${e.message}`); }
    save();
  }
  async function refreshAll() {
    for (const st of cfg.stores) { if (db.stores[st.code]?.placeId) { await refreshStore(st.code); await new Promise(r => setTimeout(r, 500)); } }
  }

  // once a day, after 6 AM Eastern
  setInterval(() => {
    const { day, hour } = nowParts();
    if ((!apiKey && !serpKey) || db.lastDaily === day || hour < DAILY_HOUR) return;
    if (serpKey && db.lastDaily && (Date.parse(day) - Date.parse(db.lastDaily)) / 864e5 < SERP_EVERY_DAYS) return;
    db.lastDaily = day; save(); log("Google reviews: daily check");
    refreshAll().catch(e => log("Google reviews: " + e.message));
  }, 5 * 60 * 1000);

  // ---- what the TVs and dashboard see ----
  const shortName = n => { const p = String(n || "").trim().split(/\s+/); return p.length > 1 ? `${p[0]} ${p[p.length - 1][0]}.` : p[0] || "Google user"; };
  const pub = v => ({ author: shortName(v.author), rating: v.rating, text: String(v.text).slice(0, 600), time: v.time });
  const nameOf = code => (cfg.stores.find(s => s.code === code) || {}).name || code;

  function publicView(storeParam) {
    const min = db.minStars || 1;
    const code = String(storeParam || "all").toUpperCase();
    if (code !== "ALL" && db.stores[code]) {
      const s = db.stores[code];
      return { scope: "store", store: nameOf(code), rating: s.rating, total: s.total, fetchedAt: s.fetchedAt, reviews: (s.reviews || []).filter(v => v.rating >= min).slice(0, 5).map(pub) };
    }
    const all = [];
    for (const [c, s] of Object.entries(db.stores)) (s.reviews || []).forEach(v => all.push({ ...pub(v), store: nameOf(c) }));
    all.sort((a, b) => Date.parse(b.time || 0) - Date.parse(a.time || 0));
    const rated = Object.values(db.stores).filter(s => s.rating != null);
    return { scope: "all", store: "All stores", rating: rated.length ? Math.round(rated.reduce((a, s) => a + s.rating, 0) / rated.length * 10) / 10 : null, total: rated.reduce((a, s) => a + (s.total || 0), 0), fetchedAt: rated.map(s => s.fetchedAt).sort().pop() || null, reviews: all.filter(v => v.rating >= min).slice(0, 5) };
  }
  function adminView() {
    const u = usage();
    return { hasKey: !!apiKey, keyHint: apiKey ? "…" + apiKey.slice(-4) : "", hasSerp: !!serpKey, serpHint: serpKey ? "…" + serpKey.slice(-4) : "", serpEveryDays: SERP_EVERY_DAYS, usage: { ...u, detailsCap: DETAILS_CAP, searchCap: SEARCH_CAP, serpCap: SERP_CAP }, minStars: db.minStars, lastDaily: db.lastDaily, dailyHour: DAILY_HOUR,
      stores: cfg.stores.map(st => { const s = db.stores[st.code] || {}; return { code: st.code, name: st.name, num: st.num || "", placeId: s.placeId || null, placeName: s.placeName || "", address: s.address || "", rating: s.rating ?? null, total: s.total ?? null, count: (s.reviews || []).length, fetchedAt: s.fetchedAt || null, error: s.error || null }; }) };
  }

  // ---- dashboard actions (password already checked by the caller) ----
  async function adminAction(p, body) {
    if (p === "/api/reviews/key") {
      apiKey = String(body.apiKey || "").trim().slice(0, 200); saveKey();
      log(apiKey ? "Google reviews: API key saved" : "Google reviews: API key removed");
      return adminView();
    }
    if (p === "/api/reviews/serpkey") {
      serpKey = String(body.serpKey || "").trim().slice(0, 200); saveKey();
      log(serpKey ? "Reviews: SerpApi key saved (newest-first reviews)" : "Reviews: SerpApi key removed");
      if (serpKey && body.refresh) await refreshAll();
      return adminView();
    }
    if (p === "/api/reviews/settings") { if (body.minStars) db.minStars = Math.max(1, Math.min(5, +body.minStars)); save(); return adminView(); }
    if (p === "/api/reviews/search") return { results: await searchPlaces(body.query || "") };
    if (p === "/api/reviews/place") {
      const code = String(body.code || ""); if (!cfg.stores.some(s => s.code === code)) throw new Error("Unknown store.");
      if (!body.placeId) { delete db.stores[code]; save(); return adminView(); }
      db.stores[code] = { placeId: String(body.placeId), placeName: String(body.name || "").slice(0, 120), address: String(body.address || "").slice(0, 200), reviews: [] };
      save(); await refreshStore(code); return adminView();
    }
    if (p === "/api/reviews/refresh") { if (body.code) await refreshStore(String(body.code)); else await refreshAll(); return adminView(); }
    return null;
  }

  return { publicView, adminView, adminAction };
};
