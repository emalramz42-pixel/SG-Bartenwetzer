"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Header from "@/components/Header";
import NavBar from "@/components/NavBar";
import RoundResult from "@/components/RoundResult";
import { formatDate, sortRoundsByDate } from "@/lib/scoring";

export default function VerlaufPage() {
  const [players, setPlayers] = useState(null);
  const [rounds, setRounds] = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "players"), (snap) => {
      setPlayers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  useEffect(() => {
    const q = query(collection(db, "rounds"), where("status", "==", "closed"));
    const unsub = onSnapshot(q, (snap) => {
      setRounds(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  const loading = players === null || rounds === null;
  const sorted = loading ? [] : sortRoundsByDate(rounds).reverse();

  return (
    <div className="shell">
      <Header />
      <main>
        <h2 className="section-title">Verlauf</h2>

        {loading && <p className="section-sub">Lädt…</p>}

        {!loading && sorted.length === 0 && (
          <div className="empty">
            <div className="big">🗓️</div>
            Noch keine abgeschlossenen Runden.
          </div>
        )}

        {!loading && sorted.length > 0 && (
          <>
            <p className="section-sub">{sorted.length} gespeicherte Runden, neueste zuerst.</p>
            <div className="stack">
              {sorted.map((r) => (
                <div key={r.id} className="round-card" style={{ marginBottom: 4 }}>
                  <div className="round-head">
                    <span className="round-date">{formatDate(r.date)}</span>
                    <span className="badge type">{r.type === "spiel" ? "Spiel" : "Training"}</span>
                  </div>
                  <RoundResult round={r} players={players} />
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
