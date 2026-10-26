// Drive-Thru Speed Contest data. Add the next week's object to WEEKS when the SOS reports come in.
// Both /contest (full page) and the TV slide read this one file.
window.CONTEST = {
  title: "Drive-Thru Speed Contest",
  totalWeeks: 4,
  minDays: 4,
  WEEKS: [
    { label: "Week 1", dates: "Sep 28 – Oct 4",
      // [store, Col O seconds, cars]
      stores: [
        ["Moncks Corner #25901", 310, 2397],
        ["Dorchester #35403", 370, 1994],
        ["Shelby Ray #35402", 316, 1606],
        ["Tanger #55801", 271, 1352],
        ["University #35401", 291, 2109]],
      // [manager, store(s), days credited, cars credited, Col O seconds]
      managers: [
        ["Chisom T.", "Moncks Corner", 5, 1021, 220], ["Galloway C.", "Moncks Corner", 5, 1130, 355],
        ["Dunn C.", "Moncks Corner", 5, 947, 293], ["Cooper D.", "Moncks Corner", 5, 782, 381],
        ["Nolan J.", "Moncks Corner", 5, 1160, 301], ["Schmidt C.", "Moncks Corner + Tanger", 5, 648, 284],
        ["Hart K.", "Dorchester", 5, 927, 365], ["Smith J.", "Dorchester", 5, 800, 425],
        ["Simmons A.", "Dorchester", 5, 570, 480], ["Long R.", "Dorchester", 5, 809, 378],
        ["Geathers B.", "Shelby Ray", 5, 708, 333],
        ["Singleton E.", "Shelby Ray", 5, 890, 297], ["Hamilton D.", "Shelby Ray", 6, 852, 299],
        ["Aska M.", "Shelby Ray", 4, 353, 308], ["Greene D.", "Shelby Ray", 4, 537, 258],
        ["Parker M.", "Tanger", 4, 479, 278], ["Hopper R.", "Tanger", 5, 604, 286],
        ["Wall M.", "University", 5, 967, 305], ["Lashway Z.", "University", 5, 1018, 262],
        ["Alvarez J.", "University", 1, 174, 213], ["Thomas C.", "University", 5, 885, 315]],
      // [Pre-Menu Queue, Menu Time, Lane Queue, Window Time] seconds, Lunch–Late
      comp: {"Chisom T.": [37, 55, 66, 63], "Dunn C.": [34, 58, 118, 78], "Nolan J.": [57, 57, 114, 71], "Galloway C.": [57, 60, 153, 83], "Cooper D.": [69, 64, 156, 87], "Hart K.": [68, 69, 106, 97], "Long R.": [70, 66, 101, 97], "Smith J.": [75, 76, 113, 101], "Simmons A.": [87, 75, 104, 104], "Greene D.": [25, 55, 80, 84], "Singleton E.": [24, 59, 100, 92], "Hamilton D.": [27, 62, 92, 97], "Aska M.": [23, 58, 77, 81], "Geathers B.": [45, 62, 104, 96], "Parker M.": [38, 65, 74, 92], "Hopper R.": [20, 62, 79, 110], "Thomas C.": [58, 68, 90, 86], "Alvarez J.": [30, 58, 54, 66], "Wall M.": [56, 70, 87, 85], "Lashway Z.": [44, 63, 70, 76], "Schmidt C.": [41, 58, 93, 85]}
    },
    { label: "Week 2", dates: "Oct 5 – Oct 11",
      stores: [
        ["Moncks Corner #25901", 303, 2403],
        ["Dorchester #35403", 371, 1914],
        ["Shelby Ray #35402", 332, 1548],
        ["Tanger #55801", 266, 1495],
        ["University #35401", 279, 1969]],
      managers: [
        ["Chisom T.", "Moncks Corner", 5, 1092, 242], ["Schmidt C.", "Moncks Corner", 2, 370, 261],
        ["Nolan J.", "Moncks Corner", 4, 923, 264], ["Galloway C.", "Moncks Corner", 6, 1502, 290],
        ["Dunn C.", "Moncks Corner", 5, 870, 336], ["Cooper D.", "Moncks Corner", 5, 767, 396],
        ["Thomas C.", "University", 4, 562, 257], ["Wall M.", "University", 5, 822, 284],
        ["Lashway Z.", "University", 4, 813, 286],
        ["Smith J.", "Dorchester", 5, 798, 382], ["Simmons A.", "Dorchester", 4, 481, 392],
        ["Long R.", "Dorchester", 5, 754, 422],
        ["Parker M.", "Tanger", 5, 633, 255], ["Hart K.", "Tanger", 5, 609, 275],
        ["Hopper R.", "Tanger", 5, 772, 283],
        ["Singleton E.", "Shelby Ray", 5, 867, 285], ["Greene D.", "Shelby Ray", 4, 515, 295],
        ["Hamilton D.", "Shelby Ray", 5, 634, 385]],
      comp: {"Chisom T.": [42, 58, 85, 68], "Schmidt C.": [31, 58, 93, 78], "Nolan J.": [44, 56, 92, 67], "Galloway C.": [43, 56, 129, 77], "Dunn C.": [44, 56, 150, 81], "Cooper D.": [50, 64, 171, 88],
        "Lashway Z.": [59, 63, 76, 77], "Wall M.": [35, 67, 76, 88], "Thomas C.": [44, 60, 67, 77], "Smith J.": [58, 71, 114, 110], "Simmons A.": [49, 71, 120, 110], "Long R.": [70, 72, 96, 103],
        "Parker M.": [29, 56, 63, 90], "Hart K.": [27, 56, 78, 100], "Hopper R.": [25, 60, 74, 102], "Singleton E.": [32, 58, 89, 85], "Greene D.": [36, 60, 89, 89], "Hamilton D.": [41, 68, 139, 112]}
    },
    { label: "Week 3", dates: "Oct 12 – Oct 18",
      // Moncks Corner: headsets down all day Tue 10/13. All of Tuesday is left out of times, cars and days (Monday counts normally).
      stores: [
        ["Moncks Corner #25901", 375, 2294],
        ["Dorchester #35403", 389, 1889],
        ["Shelby Ray #35402", 300, 1640],
        ["Tanger #55801", 332, 1429],
        ["University #35401", 280, 1964]],
      managers: [
        ["Chisom T.", "Moncks Corner", 4, 747, 347], ["Schmidt C.", "Moncks Corner", 4, 1033, 355],
        ["Nolan J.", "Moncks Corner", 2, 344, 254], ["Galloway C.", "Moncks Corner", 4, 1140, 357],
        ["Dunn C.", "Moncks Corner", 4, 782, 433], ["Cooper D.", "Moncks Corner", 5, 764, 446],
        ["Lashway Z.", "University", 5, 846, 260], ["Thomas C.", "University", 4, 569, 262],
        ["Wall M.", "University", 6, 899, 306], ["Simmons A.", "Dorchester", 5, 588, 395],
        ["Long R.", "Dorchester", 6, 867, 397], ["Smith J.", "Dorchester", 5, 843, 426],
        ["Hart K.", "Tanger", 5, 597, 290], ["Parker M.", "Tanger", 5, 622, 309],
        ["Hopper R.", "Tanger", 5, 695, 383], ["Singleton E.", "Shelby Ray", 4, 563, 286],
        ["Greene D.", "Shelby Ray", 5, 670, 290], ["Hamilton D.", "Shelby Ray", 6, 790, 306]]
    },
    { label: "Week 4", dates: "Oct 19 – Oct 25",
      stores: [
        ["Moncks Corner #25901", 312, 2382],
        ["Dorchester #35403", 397, 1980],
        ["Shelby Ray #35402", 240, 1607],
        ["Tanger #55801", 322, 1442],
        ["University #35401", 233, 1935]],
      managers: [
        ["Nolan J.", "Moncks Corner", 3, 607, 270], ["Schmidt C.", "Moncks Corner", 5, 903, 284],
        ["Chisom T.", "Moncks Corner", 5, 988, 296], ["Dunn C.", "Moncks Corner", 5, 1060, 314],
        ["Galloway C.", "Moncks Corner", 5, 1306, 328], ["Cooper D.", "Moncks Corner", 5, 853, 403],
        ["Thomas C.", "University", 5, 877, 223], ["Lashway Z.", "University", 5, 915, 225],
        ["Wall M.", "University", 4, 590, 234], ["Smith J.", "Dorchester", 5, 778, 397],
        ["Long R.", "Dorchester", 5, 874, 411], ["Simmons A.", "Dorchester", 5, 576, 422],
        ["Hart K.", "Tanger", 5, 814, 295], ["Parker M.", "Tanger", 5, 692, 324],
        ["Hopper R.", "Tanger", 3, 448, 360], ["Singleton E.", "Shelby Ray", 5, 825, 198],
        ["Greene D.", "Shelby Ray", 5, 592, 254], ["Hamilton D.", "Shelby Ray", 5, 729, 289]]
    }
  ],
  // Witko A. joined Tanger as GM in Week 4; not on the board (not in the contest from the start)
  // Excluded entirely (never on the board): Wesner K. (DM), Cobin A. (MIT), Hulsey L. and Blake B. (not running shifts)
  // No longer in the contest: Geathers B. left the store, Aska M. moved back to Crew Trainer (still shown in their Week 1 tab)
  LEFT: ["Geathers B.", "Aska M."],
  // Managers who worked at more than one store across the contest
  // GMs keep their overall place but can't win the prize
  GMS: ["Lashway Z.", "Singleton E.", "Galloway C."],
  // Qualified by owner override: Schmidt C. worked his Week 2 days but they are missing from the Tanger timecard (report shows 2). His time uses the days on record.
  QUALIFY_OVERRIDE: {"Schmidt C.": 3}, // name: first standings (number of weeks) the override applies to,
  STORE_LABEL: {"Hart K.": "Dorchester → Tanger", "Schmidt C.": "Moncks Corner + Tanger"}
};

// shared math: car-weighted averages, 4-day minimum every week
window.CONTEST.fmt = s => { s = Math.round(s); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };
window.CONTEST.combine = function (weekIdx) {
  const C = window.CONTEST, all = weekIdx === "all", ws = all ? C.WEEKS : [C.WEEKS[weekIdx]];
  const left = new Set(C.LEFT || []), labels = C.STORE_LABEL || {}, override = C.QUALIFY_OVERRIDE || {};
  const m = new Map(), s = new Map();
  ws.forEach(w => {
    const wi = C.WEEKS.indexOf(w);
    w.managers.forEach(([n, st, d, c, t]) => {
      if (all && left.has(n)) return;
      const r = m.get(n) || { name: n, store: st, cars: 0, secs: 0, weeks: 0, minDays: 99, days: 0, dayList: [], times: [] };
      r.cars += c; r.secs += c * t; r.weeks++; r.days += d; r.minDays = Math.min(r.minDays, d); r.store = st;
      r.dayList.push(d); r.times[wi] = t;
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
      ok: r.weeks === need && (r.minDays >= C.minDays || (all && override[r.name] && C.WEEKS.length >= override[r.name])), parts: r.comp ? r.comp.map(v => v / r.compCars) : null }))
    .sort((a, b) => (b.ok - a.ok) || (a.time - b.time));
  const stores = [...s.values()].map(r => ({ ...r, time: r.secs / r.cars, ok: true })).sort((a, b) => a.time - b.time);
  return { mgrs, stores, nWeeks: ws.length };
};
// prize rank: qualified non-GMs only
window.CONTEST.isGM = n => (window.CONTEST.GMS || []).includes(n);
// places gained since Week 1, among managers ranked now: {name: +n / -n / 0}
// "new": ranked now but not qualified in the standings before the latest week (e.g. Schmidt C. after Week 3)
window.CONTEST.moves = function (rankedNow) {
  const C = window.CONTEST, out = {};
  if (C.WEEKS.length < 2) return out;
  const now = new Set(rankedNow.map(r => r.name)), w1 = {};
  C.combine(0).mgrs.filter(r => r.ok && now.has(r.name)).forEach((r, i) => w1[r.name] = i + 1);
  let before = null;
  if (C.WEEKS.length > 2) { const all = C.WEEKS; C.WEEKS = all.slice(0, -1); try { before = new Set(C.combine("all").mgrs.filter(r => r.ok).map(r => r.name)); } finally { C.WEEKS = all; } }
  rankedNow.forEach((r, i) => { if (before && !before.has(r.name)) out[r.name] = "new"; else if (w1[r.name]) out[r.name] = w1[r.name] - (i + 1); });
  return out;
};
