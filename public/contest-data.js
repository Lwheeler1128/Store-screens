// Drive-Thru Speed Contest, PERIOD 11 (Oct 26 – Nov 22, 2026 · report weeks 44–47)
// Add the next week's object to WEEKS when the SOS reports come in. /contest-p11 and the TV slide read this one file.
window.CONTEST = {
  title: "Drive-Thru Speed Contest",
  period: "Period 11",
  range: "Oct 26 – Nov 22",
  totalWeeks: 4,
  minDays: 4,
  // Last period's winner gets a GOAT badge
  lastWinner: { name: "Caylee Thomas", board: "Thomas C.", store: "University #35401", time: "4:25", period: "P10" },
  WEEKS: [
    { label: "Week 1", dates: "Oct 26 – Nov 1",
      stores: [
        ["Moncks Corner #25901", 368, 2365],
        ["Dorchester #35403", 388, 2099],
        ["Shelby Ray #35402", 321, 1591],
        ["Tanger #55801", 353, 1496],
        ["University #35401", 283, 2058]],
      // [manager, store, days credited, cars credited, Col O seconds, extra days from doubles]
      // University's Week 44 appendix credits crew too; only the managers on its scorecard are counted.
      managers: [
        ["Schmidt C.", "Moncks Corner", 5, 887, 289], ["Nolan J.", "Moncks Corner", 3, 596, 336],
        ["Chisom T.", "Moncks Corner", 4, 749, 346], ["Dunn C.", "Moncks Corner", 5, 1037, 418],
        ["Galloway C.", "Moncks Corner", 4, 969, 423], ["Cooper D.", "Moncks Corner", 5, 703, 490],
        ["Lashway Z.", "University", 5, 847, 260], ["Thomas C.", "University", 4, 671, 273],
        ["Wall M.", "University", 3, 616, 323, 2],
        ["Long R.", "Dorchester", 5, 1011, 335], ["Simmons A.", "Dorchester", 5, 672, 386],
        ["Smith J.", "Dorchester", 5, 866, 455],
        ["Parker M.", "Tanger", 5, 555, 287], ["Hart K.", "Tanger", 5, 719, 331],
        ["Hopper R.", "Tanger", 5, 610, 355], ["Witko A.", "Tanger", 5, 754, 366],
        ["Singleton E.", "Shelby Ray", 5, 757, 269], ["Hamilton D.", "Shelby Ray", 6, 975, 334],
        ["Greene D.", "Shelby Ray", 5, 672, 380]],
      // [Pre-Menu Queue, Menu Time, Lane Queue, Window Time] seconds
      comp: {"Schmidt C.": [40, 57, 114, 79], "Nolan J.": [51, 58, 149, 82], "Chisom T.": [52, 59, 153, 82], "Dunn C.": [65, 63, 179, 89], "Galloway C.": [70, 63, 177, 84], "Cooper D.": [92, 70, 232, 94], "Lashway Z.": [38, 59, 71, 78], "Thomas C.": [48, 60, 74, 78], "Wall M.": [46, 66, 101, 93], "Long R.": [64, 68, 111, 96], "Simmons A.": [58, 63, 125, 98], "Smith J.": [104, 76, 129, 103], "Parker M.": [34, 69, 97, 114], "Hart K.": [46, 70, 107, 108], "Hopper R.": [39, 69, 118, 115], "Witko A.": [52, 70, 116, 107], "Singleton E.": [33, 58, 95, 89], "Hamilton D.": [34, 60, 113, 99], "Greene D.": [44, 63, 139, 107]}
    }
  ],
  // Off the board entirely: Wesner K. (DM), Cobin A. (MIT), Hulsey L. (not running shifts), Blake B. (gone from #35403), Hogan A. (Tanger, in training)
  EXCLUDE: ["Wesner K.", "Cobin A.", "Hulsey L.", "Blake B.", "Hogan A."],
  LEFT: [],
  // GMs are ranked but can't win the prize
  GMS: ["Lashway Z.", "Singleton E.", "Galloway C.", "Witko A."],
  // Double shift (credited Day half + Night half the same day) counts as two days toward the 4-day minimum
  STORE_LABEL: {}
};

window.CONTEST.fmt = s => { s = Math.round(s); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };
window.CONTEST.isGM = n => (window.CONTEST.GMS || []).includes(n);
window.CONTEST.isGoat = n => window.CONTEST.lastWinner && window.CONTEST.lastWinner.board === n;
window.CONTEST.combine = function (weekIdx) {
  const C = window.CONTEST, all = weekIdx === "all", ws = all ? C.WEEKS : [C.WEEKS[weekIdx]];
  const left = new Set(C.LEFT || []), excl = new Set(C.EXCLUDE || []), labels = C.STORE_LABEL || {};
  const m = new Map(), s = new Map();
  ws.forEach(w => {
    const wi = C.WEEKS.indexOf(w);
    w.managers.forEach(([n, st, d, c, t, dbl]) => {
      if (excl.has(n) || (all && left.has(n))) return;
      const eff = d + (dbl || 0);
      const r = m.get(n) || { name: n, store: st, cars: 0, secs: 0, weeks: 0, minDays: 99, days: 0, dayList: [], times: [], doubles: 0 };
      r.cars += c; r.secs += c * t; r.weeks++; r.days += d; r.minDays = Math.min(r.minDays, eff); r.store = st;
      r.dayList.push(dbl ? d + "+" + dbl : d); r.times[wi] = t; r.doubles += dbl || 0;
      const cp = (w.comp || {})[n];
      if (cp) { r.comp = r.comp || [0, 0, 0, 0]; r.compCars = (r.compCars || 0) + c; cp.forEach((v, i) => r.comp[i] += v * c); }
      m.set(n, r);
    });
    w.stores.forEach(([n, t, c]) => { const r = s.get(n) || { name: n, cars: 0, secs: 0, times: [] }; r.cars += c; r.secs += c * t; r.times[wi] = t; s.set(n, r); });
  });
  const need = ws.length;
  const mgrs = [...m.values()].map(r => ({ ...r, time: r.secs / r.cars,
      store: all && labels[r.name] ? labels[r.name] : r.store,
      why: r.weeks < need ? "missed a week" : "under 4 days in a week",
      ok: r.weeks === need && r.minDays >= C.minDays, parts: r.comp ? r.comp.map(v => v / r.compCars) : null }))
    .sort((a, b) => (b.ok - a.ok) || (a.time - b.time));
  const stores = [...s.values()].map(r => ({ ...r, time: r.secs / r.cars, ok: true })).sort((a, b) => a.time - b.time);
  return { mgrs, stores, nWeeks: ws.length };
};
// Places gained since last week's standings, among managers ranked now. "new" = ranked now but not last week.
window.CONTEST.moves = function (rankedNow) {
  const C = window.CONTEST, out = {};
  if (C.WEEKS.length < 2) return out;
  const all = C.WEEKS; let prev = {};
  C.WEEKS = all.slice(0, -1);
  try { C.combine("all").mgrs.filter(r => r.ok).forEach((r, i) => prev[r.name] = i + 1); } finally { C.WEEKS = all; }
  const now = new Set(rankedNow.map(r => r.name)); const prevRanked = Object.keys(prev).filter(n => now.has(n)).sort((a, b) => prev[a] - prev[b]);
  const p2 = {}; prevRanked.forEach((n, i) => p2[n] = i + 1);
  rankedNow.forEach((r, i) => { out[r.name] = p2[r.name] ? p2[r.name] - (i + 1) : "new"; });
  return out;
};
