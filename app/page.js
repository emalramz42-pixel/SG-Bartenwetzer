"use client";

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAnonAuth } from "@/lib/useAnonAuth";
import Header from "@/components/Header";
import NavBar from "@/components/NavBar";
import RoundResult from "@/components/RoundResult";
import { formatDate } from "@/lib/scoring";

const ME_KEY = "platzreif:me";

export default function VotePage() {
  const uid = useAnonAuth();
  const [players, setPlayers] = useState(null);
  const [openRound, setOpenRound] = useState(undefined); // undefined = loading, null = none
  const [votes, setVotes] = useState({});
  const [me, setMeState] = useState(null);
  const [meLoaded, setMeLoaded] = useState(false);

  const [pickBest, setPickBest] = useState(null);
  const [pickWorst, setPickWorst] = useState([]);
  const [subStage, setSubStage] = useState("best");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ME_KEY);
      if (raw) setMeState(JSON.parse(raw));
    } catch (e) {
      // ignore
    }
    setMeLoaded(true);
  }, []);

  function setMe(next) {
    setMeState(next);
    try {
      if (next) localStorage.setItem(ME_KEY, JSON.stringify(next));
      else localStorage.removeItem(ME_KEY);
    } catch (e) {
      // ignore
    }
  }

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "players"), (snap) => {
      setPlayers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  useEffect(() => {
    // Neueste Runde insgesamt, nicht nur offene: so bleibt das Ergebnis
    // sichtbar, sobald der Host eine offene Runde live schliesst, statt
    // dass sie einfach aus der Abfrage verschwindet.
    const q = query(collection(db, "rounds"), orderBy("createdAt", "desc"), limit(1));
    const unsub = onSnapshot(q, (snap) => {
      if (snap.empty) {
        setOpenRound(null);
      } else {
        const d = snap.docs[0];
        setOpenRound({ id: d.id, ...d.data() });
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!openRound || openRound.status !== "open") {
      setVotes({});
      return;
    }
    const unsub = onSnapshot(collection(db, "rounds", openRound.id, "votes"), (snap) => {
      const map = {};
      snap.docs.forEach((d) => {
        map[d.id] = d.data();
      });
      setVotes(map);
    });
    return unsub;
  }, [openRound?.id]);

  useEffect(() => {
    setPickBest(null);
    setPickWorst([]);
    setSubStage("best");
  }, [openRound?.id]);

  const activePlayers = useMemo(
    () => (players || []).filter((p) => p.active),
    [players]
  );

  const nameOf = (id) => (players || []).find((p) => p.id === id)?.name || "?";

  async function submitVote() {
    if (!uid || !me || !openRound) return;
    setSubmitting(true);
    try {
      await setDoc(doc(db, "rounds", openRound.id, "votes", uid), {
        voterPlayerId: me.id,
        bestId: pickBest,
        worstIds: pickWorst,
        votedAt: serverTimestamp(),
      });
    } catch (e) {
      alert("Stimme konnte nicht gespeichert werden. Prüf deine Internetverbindung und versuch es nochmal.");
    } finally {
      setSubmitting(false);
    }
  }

  if (openRound === undefined || players === null || !meLoaded) {
    return (
      <div className="shell">
        <Header />
        <main>
          <p className="section-sub">Lädt…</p>
        </main>
        <NavBar />
      </div>
    );
  }

  return (
    <div className="shell">
      <Header />
      <main>
        {openRound === null && (
          <>
            <h2 className="section-title">Abstimmen</h2>
            <div className="empty">
              <div className="big">⏳</div>
              Aktuell läuft keine Abstimmung.
              <br />
              Frag den Host, ob er eine neue Runde startet.
            </div>
          </>
        )}

        {openRound && openRound.status === "closed" && (
          <>
            <h2 className="section-title">Rundenergebnis</h2>
            <p className="section-sub">
              {openRound.type === "spiel" ? "Spiel" : "Training"} vom {formatDate(openRound.date)}
            </p>
            <RoundResult round={openRound} players={players} />
          </>
        )}

        {openRound && openRound.status === "open" && !me && (
          <>
            <div className="row between">
              <h2 className="section-title" style={{ margin: 0 }}>
                Wer bist du?
              </h2>
              <span className="badge type">
                {openRound.type === "spiel" ? "Spiel" : "Training"} · {formatDate(openRound.date)}
              </span>
            </div>
            <p className="section-sub">
              Wähl dich einmal aus der Liste, dein Handy merkt sich das für die nächsten Runden.
            </p>
            <div className="card">
              <div className="chip-grid">
                {activePlayers.map((p) => (
                  <button
                    key={p.id}
                    className="chip"
                    onClick={() => setMe({ id: p.id, name: p.name })}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {openRound && openRound.status === "open" && me && !openRound.presentIds.includes(me.id) && (
          <>
            <h2 className="section-title">Nicht dabei</h2>
            <div className="empty">
              <div className="big">🙅</div>
              Du ({me.name}) bist für diese Runde nicht als anwesend markiert.
              <br />
              Sprich mit dem Host, oder{" "}
              <button className="hint-link" onClick={() => setMe(null)}>
                wähl dich neu aus
              </button>
              , falls das der falsche Name war.
            </div>
          </>
        )}

        {openRound &&
          openRound.status === "open" &&
          me &&
          openRound.presentIds.includes(me.id) &&
          votes[uid] && (
            <>
              <h2 className="section-title">Danke, {me.name}!</h2>
              <p className="section-sub">Deine Stimme ist gespeichert.</p>
              <div className="card stack">
                <div className="mini-tally-row">
                  <span>Bester</span>
                  <span className="badge best">{nameOf(votes[uid].bestId)}</span>
                </div>
                <div className="mini-tally-row">
                  <span>Schlechteste</span>
                  <span className="badge worst">
                    {(votes[uid].worstIds || []).map((id) => nameOf(id)).join(", ")}
                  </span>
                </div>
                <p className="section-sub" style={{ margin: 0 }}>
                  {Object.keys(votes).length} von {openRound.presentIds.length} haben abgestimmt.
                  Ergebnis erscheint, sobald der Host die Runde beendet.
                </p>
              </div>
            </>
          )}

        {openRound &&
          openRound.status === "open" &&
          me &&
          openRound.presentIds.includes(me.id) &&
          !votes[uid] && (
            <VotingFlow
              round={openRound}
              me={me}
              players={players}
              pickBest={pickBest}
              pickWorst={pickWorst}
              subStage={subStage}
              setPickBest={setPickBest}
              setPickWorst={setPickWorst}
              setSubStage={setSubStage}
              onSubmit={submitVote}
              submitting={submitting}
              votedCount={Object.keys(votes).length}
              onNotMe={() => setMe(null)}
            />
          )}
      </main>
      <NavBar />
    </div>
  );
}

function VotingFlow({
  round,
  me,
  players,
  pickBest,
  pickWorst,
  subStage,
  setPickBest,
  setPickWorst,
  setSubStage,
  onSubmit,
  submitting,
  votedCount,
  onNotMe,
}) {
  const nameOf = (id) => players.find((p) => p.id === id)?.name || "?";
  const candidates = round.presentIds.filter((id) => id !== me.id);

  function toggleWorst(id) {
    const idx = pickWorst.indexOf(id);
    if (idx !== -1) {
      setPickWorst(pickWorst.filter((x) => x !== id));
    } else if (pickWorst.length < 2) {
      setPickWorst([...pickWorst, id]);
    }
  }

  return (
    <>
      <div className="row between">
        <span className="badge type">
          {round.type === "spiel" ? "Spiel" : "Training"} · {formatDate(round.date)}
        </span>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
          {votedCount} / {round.presentIds.length} abgestimmt
        </span>
      </div>
      <div className="progress-track" style={{ margin: "10px 0 18px" }}>
        <div
          className="progress-fill"
          style={{ width: `${Math.round((votedCount / round.presentIds.length) * 100)}%` }}
        />
      </div>
      <div className="card">
        <div className="result-hero" style={{ paddingTop: 0 }}>
          <div className="label">Angemeldet als</div>
          <div className="value" style={{ color: "var(--accent-strong)", fontSize: 22 }}>
            {me.name}
          </div>
          <button className="hint-link" style={{ marginTop: 4 }} onClick={onNotMe}>
            Nicht du?
          </button>
        </div>

        {subStage === "best" && (
          <>
            <p className="section-sub" style={{ marginBottom: 12 }}>
              Wer war heute am <strong style={{ color: "var(--gold)" }}>besten</strong>?
            </p>
            <div className="chip-grid">
              {candidates.map((id) => (
                <button
                  key={id}
                  className={"chip" + (pickBest === id ? " sel-best" : "")}
                  onClick={() => setPickBest(id)}
                >
                  {nameOf(id)}
                </button>
              ))}
            </div>
            <button
              className="primary block"
              style={{ marginTop: 16 }}
              disabled={!pickBest}
              onClick={() => setSubStage("worst")}
            >
              Weiter
            </button>
          </>
        )}

        {subStage === "worst" && (
          <>
            <p className="section-sub" style={{ marginBottom: 12 }}>
              Wer war heute am <strong style={{ color: "var(--maroon)" }}>schlechtesten</strong>? (genau 2)
            </p>
            <div className="chip-grid">
              {candidates.map((id) => {
                if (id === pickBest) {
                  return (
                    <button key={id} className="chip disabled" disabled>
                      {nameOf(id)}
                      <span className="sub">bester</span>
                    </button>
                  );
                }
                return (
                  <button
                    key={id}
                    className={"chip" + (pickWorst.includes(id) ? " sel-worst" : "")}
                    onClick={() => toggleWorst(id)}
                  >
                    {nameOf(id)}
                  </button>
                );
              })}
            </div>
            <div className="row" style={{ gap: 10, marginTop: 16 }}>
              <button className="ghost" onClick={() => setSubStage("best")}>
                Zurück
              </button>
              <button
                className="primary block"
                disabled={pickWorst.length !== 2 || submitting}
                onClick={onSubmit}
              >
                {submitting ? "Speichert…" : "Stimme abgeben"}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
