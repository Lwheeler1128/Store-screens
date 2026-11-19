// Records each day's Drive-Thru Showdown daypart winners and Crown of the Day into public/showdown-history.json.
// Run by cron every 10 minutes; the day's entry is overwritten until it is final (after 11 PM Eastern).
// Rules match the board: a store needs 5+ cars in a daypart to win it; the crown goes to the most daypart wins,
// and a tie goes to the faster all-day time.
const fs = require("fs");
const path = require("path");

const API = process.env.SHOWDOWN_API || "https://64-227-29-188.sslip.io/api/live";
const OUT = path.join(__dirname, "..", "public", "showdown-history.json");
const MIN_CARS = 5;
const KEEP_DAYS = 70;

const et = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" });
function nowET() {
  const p = Object.fromEntries(et.formatToParts(new Date()).map(x => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, hour: +p.hour };
}

(async () => {
  const { date, hour } = nowET();
  if (hour < 6) return; // overnight: Berry may already show the next day or nothing
  const r = await fetch(API, { signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error("api/live " + r.status);
  const d = await r.json();
  const stores = (d.stores || []).filter(s => s.code);
  const m = /Daypart\s+(\d)/.exec((stores.find(s => s.daypart) || {}).daypart || "");
  const wd = new Date().toLocaleDateString("en-US", { timeZone: "America/New_York", weekday: "short" });
  const N = /^(Fri|Sat)/.test(wd) ? 6 : 5; // Late Night (daypart 6) is only raced Friday and Saturday
  const c0 = m ? +m[1] : 0, final = hour >= 23, c = final ? N + 1 : c0;

  const winners = {}, wins = {};
  for (let n = 1; n <= N; n++) {
    if (n >= c) break; // only finished dayparts have a winner
    const race = stores.map(s => ({ s, p: (s.dayparts || []).find(x => x.dp === n) }))
      .filter(x => x.p && x.p.t && x.p.cars >= MIN_CARS).sort((a, b) => a.p.t - b.p.t);
    if (race[0]) { winners[n] = { code: race[0].s.code, t: Math.round(race[0].p.t) }; wins[race[0].s.code] = (wins[race[0].s.code] || 0) + 1; }
  }
  const byCode = Object.fromEntries(stores.map(s => [s.code, s]));
  const ranked = Object.entries(wins).sort((a, b) => (b[1] - a[1]) || ((byCode[a[0]].todayAvg || 9e9) - (byCode[b[0]].todayAvg || 9e9)));
  const day = {
    final, updatedAt: new Date().toISOString(),
    crown: ranked[0] ? ranked[0][0] : null,
    winners, wins,
    stores: Object.fromEntries(stores.map(s => [s.code, { name: s.name, avg: s.todayAvg ? Math.round(s.todayAvg) : null, cars: s.todayCars || 0 }]))
  };

  let hist = { days: {} };
  try { hist = JSON.parse(fs.readFileSync(OUT, "utf8")); } catch (e) {}
  hist.days = hist.days || {};
  if (hist.days[date] && hist.days[date].final && !final) return; // never overwrite a finished day
  if (!stores.some(s => s.todayCars)) return; // no data yet today
  hist.days[date] = day;
  const keep = Object.keys(hist.days).sort().slice(-KEEP_DAYS);
  hist.days = Object.fromEntries(keep.map(k => [k, hist.days[k]]));
  hist.updatedAt = day.updatedAt;
  fs.writeFileSync(OUT + ".tmp", JSON.stringify(hist));
  fs.renameSync(OUT + ".tmp", OUT);
  console.log(date, final ? "final" : "partial", "crown:", day.crown, JSON.stringify(wins));
})().catch(e => { console.error(new Date().toISOString(), e.message); process.exit(1); });
