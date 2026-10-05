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
        ["Blake B.", "Dorchester", 5, 741, 367], ["Geathers B.", "Shelby Ray", 5, 708, 333],
        ["Singleton E.", "Shelby Ray", 5, 890, 297], ["Hamilton D.", "Shelby Ray", 6, 852, 299],
        ["Aska M.", "Shelby Ray", 4, 353, 308], ["Greene D.", "Shelby Ray", 4, 537, 258],
        ["Parker M.", "Tanger", 4, 479, 278], ["Hopper R.", "Tanger", 5, 604, 286],
        ["Wall M.", "University", 5, 967, 305], ["Lashway Z.", "University", 5, 1018, 262],
        ["Alvarez J.", "University", 1, 174, 213], ["Thomas C.", "University", 5, 885, 315]],
      // [Pre-Menu Queue, Menu Time, Lane Queue, Window Time] seconds, Lunch–Late
      comp: {"Chisom T.": [37, 55, 66, 63], "Dunn C.": [34, 58, 118, 78], "Nolan J.": [57, 57, 114, 71], "Galloway C.": [57, 60, 153, 83], "Cooper D.": [69, 64, 156, 87], "Hart K.": [68, 69, 106, 97], "Blake B.": [63, 65, 100, 92], "Long R.": [70, 66, 101, 97], "Smith J.": [75, 76, 113, 101], "Simmons A.": [87, 75, 104, 104], "Greene D.": [25, 55, 80, 84], "Singleton E.": [24, 59, 100, 92], "Hamilton D.": [27, 62, 92, 97], "Aska M.": [23, 58, 77, 81], "Geathers B.": [45, 62, 104, 96], "Parker M.": [38, 65, 74, 92], "Hopper R.": [20, 62, 79, 110], "Thomas C.": [58, 68, 90, 86], "Alvarez J.": [30, 58, 54, 66], "Wall M.": [56, 70, 87, 85], "Lashway Z.": [44, 63, 70, 76], "Schmidt C.": [41, 58, 93, 85]}
    }
  ]
};

// shared math: car-weighted averages, 4-day minimum every week
window.CONTEST.fmt = s => { s = Math.round(s); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };
window.CONTEST.combine = function (weekIdx) {
  const C = window.CONTEST, ws = weekIdx === "all" ? C.WEEKS : [C.WEEKS[weekIdx]];
  const m = new Map(), s = new Map();
  ws.forEach(w => {
    w.managers.forEach(([n, st, d, c, t]) => {
      const r = m.get(n) || { name: n, store: st, cars: 0, secs: 0, weeks: 0, minDays: 99, days: 0 };
      r.cars += c; r.secs += c * t; r.weeks++; r.days += d; r.minDays = Math.min(r.minDays, d); r.store = st;
      const cp = (w.comp || {})[n];
      if (cp) { r.comp = r.comp || [0, 0, 0, 0]; r.compCars = (r.compCars || 0) + c; cp.forEach((v, i) => r.comp[i] += v * c); }
      m.set(n, r);
    });
    w.stores.forEach(([n, t, c]) => { const r = s.get(n) || { name: n, cars: 0, secs: 0 }; r.cars += c; r.secs += c * t; s.set(n, r); });
  });
  const need = ws.length;
  const mgrs = [...m.values()].map(r => ({ ...r, time: r.secs / r.cars, ok: r.weeks === need && r.minDays >= C.minDays, parts: r.comp ? r.comp.map(v => v / r.compCars) : null }))
    .sort((a, b) => (b.ok - a.ok) || (a.time - b.time));
  const stores = [...s.values()].map(r => ({ ...r, time: r.secs / r.cars, ok: true })).sort((a, b) => a.time - b.time);
  return { mgrs, stores, nWeeks: ws.length };
};
