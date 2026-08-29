"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, doc, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Header from "@/components/Header";
import NavBar from "@/components/NavBar";
import { computeStats, splitHalves } from "@/lib/scoring";

export default function BestenlistePage() {
  const [players, setPlayers] = useState(null);
  const [closedRounds, setClosedRounds] = useState(null);
  const [settings, setSettings] = useState({});
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "players"), (snap) => {
      setPlayers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  useEffect(() => {
    const q = query(collection(db, "rounds"), where("status", "==", "closed"));
    const unsub = onSnapshot(q, (snap) => {
      setClosedRounds(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "config"), (snap) => {
      if (snap.exists()) setSettings(snap.data());
    });
    return unsub;
  }, []);

  const halves = useMemo(
    () => splitHalves(closedRounds || [], settings.rueckrundeStartRoundId),
    [closedRounds, settings.rueckrundeStartRoundId]
  );

  const subset =
    filter === "hin" ? halves.hin : filter === "rueck" ? halves.rueck : closedRounds || [];

  const stats = useMemo(() => {
    if (!players) return [];
    return computeStats(players, subset).sort((a, b) => {
      if (b.net !== a.net) return b.net - a.net;
      return b.bestVotes - a.bestVotes;
    });
  }, [players, subset]);

  const hasRueck = !!settings.rueckrundeStartRoundId;
  const loading = players === null || closedRounds === null;

  return (
    <div className="shell">
      <Header />
      <main>
        <h2 className="section-title">Bestenliste</h2>
        <p className="section-sub">
          Netto = Bester-Stimmen minus Schlechteste-Stimmen, über alle Bewertungen summiert.
        </p>

        {loading && <p className="section-sub">Lädt…</p>}

        {!loading && (players.length === 0 || (closedRounds || []).length === 0) && (
          <div className="empty">
            <div className="big">🏆</div>
            {players.length === 0
              ? "Noch keine Spieler im Kader."
              : "Noch keine abgeschlossenen Bewertungen."}
          </div>
        )}

        {!loading && players.length > 0 && (closedRounds || []).length > 0 && (
          <>
            {hasRueck && (
              <div className="segmented" style={{ marginBottom: 14 }}>
                <button
                  className={filter === "all" ? "active" : ""}
                  onClick={() => setFilter("all")}
                >
                  Gesamt
                </button>
                <button
                  className={filter === "hin" ? "active" : ""}
                  onClick={() => setFilter("hin")}
                >
                  Hinrunde
                </button>
                <button
                  className={filter === "rueck" ? "active" : ""}
                  onClick={() => setFilter("rueck")}
                >
                  Rückrunde
                </button>
              </div>
            )}
            <div className="card">
              {stats.map((s, i) => (
                <div className="lb-row" key={s.id}>
                  <span className={"lb-rank" + (i === 0 ? " top" : "")}>{i + 1}</span>
                  <span className="lb-name">{s.name}</span>
                  <span className="lb-stat" title="Bester-Stimmen">
                    ⭐{s.bestVotes}
                  </span>
                  <span className="lb-stat" title="Schlechteste-Stimmen">
                    ⚠{s.worstVotes}
                  </span>
                  <span className={"lb-net " + (s.net > 0 ? "pos" : s.net < 0 ? "neg" : "")}>
                    {s.net > 0 ? "+" : ""}
                    {s.net}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
      <NavBar />
    </div>
  );
}
