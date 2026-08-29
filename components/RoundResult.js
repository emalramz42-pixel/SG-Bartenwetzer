"use client";

export default function RoundResult({ round, players }) {
  const nameOf = (id) => players.find((p) => p.id === id)?.name || "?";
  const results = round.results || { bestTally: {}, worstTally: {}, best: [], worst: [] };
  const fullTally = (round.presentIds || [])
    .map((id) => ({
      name: nameOf(id),
      b: results.bestTally[id] || 0,
      w: results.worstTally[id] || 0,
    }))
    .sort((a, b) => b.b - b.w - (a.b - a.w));

  return (
    <div className="card stack">
      <div className="result-hero">
        <div className="label">🏆 Bester</div>
        <div className="value">{results.best[0] ? nameOf(results.best[0].id) : "—"}</div>
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
          {results.best[0] ? `${results.best[0].count} Stimmen` : ""}
        </div>
      </div>
      <div>
        <label className="field-label" style={{ color: "var(--maroon)" }}>
          Schlechteste
        </label>
        <div className="mini-tally">
          {results.worst.length ? (
            results.worst.map((w) => (
              <div className="mini-tally-row" key={w.id}>
                <span>{nameOf(w.id)}</span>
                <span className="badge worst">{w.count} Stimmen</span>
              </div>
            ))
          ) : (
            <div className="mini-tally-row" style={{ color: "var(--text-muted)" }}>
              Keine Stimmen
            </div>
          )}
        </div>
      </div>
      <details className="round-details">
        <summary>Alle Stimmen anzeigen</summary>
        <div className="mini-tally" style={{ marginTop: 10 }}>
          {fullTally.map((t, i) => (
            <div className="mini-tally-row" key={i}>
              <span>{t.name}</span>
              <span>
                ⭐{t.b} ⚠{t.w}
              </span>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
