export function topN(tallyObj, n) {
  return Object.keys(tallyObj || {})
    .map((id) => ({ id, count: tallyObj[id] }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}

export function computeRoundResultsFromVotes(votes) {
  const bestTally = {};
  const worstTally = {};
  votes.forEach((v) => {
    if (v.bestId) bestTally[v.bestId] = (bestTally[v.bestId] || 0) + 1;
    (v.worstIds || []).forEach((wid) => {
      worstTally[wid] = (worstTally[wid] || 0) + 1;
    });
  });
  return {
    bestTally,
    worstTally,
    best: topN(bestTally, 1),
    worst: topN(worstTally, 2),
  };
}

export function computeStats(players, closedRounds) {
  const stats = {};
  players.forEach((p) => {
    stats[p.id] = { id: p.id, name: p.name, bestVotes: 0, worstVotes: 0, net: 0 };
  });
  closedRounds.forEach((r) => {
    const results = r.results;
    if (!results) return;
    Object.entries(results.bestTally || {}).forEach(([pid, count]) => {
      if (stats[pid]) stats[pid].bestVotes += count;
    });
    Object.entries(results.worstTally || {}).forEach(([pid, count]) => {
      if (stats[pid]) stats[pid].worstVotes += count;
    });
  });
  Object.values(stats).forEach((s) => {
    s.net = s.bestVotes - s.worstVotes;
  });
  return Object.values(stats);
}

export function sortRoundsByDate(rounds) {
  return [...rounds].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
}

export function splitHalves(rounds, rueckrundeStartRoundId) {
  const sorted = sortRoundsByDate(rounds);
  if (!rueckrundeStartRoundId) return { hin: sorted, rueck: [] };
  const idx = sorted.findIndex((r) => r.id === rueckrundeStartRoundId);
  if (idx === -1) return { hin: sorted, rueck: [] };
  return { hin: sorted.slice(0, idx), rueck: sorted.slice(idx) };
}

export function formatDate(iso) {
  if (!iso) return "";
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

export function todayISO() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}
