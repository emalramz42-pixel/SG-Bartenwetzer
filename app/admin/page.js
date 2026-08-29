"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import Header from "@/components/Header";
import NavBar from "@/components/NavBar";
import { computeRoundResultsFromVotes, formatDate, sortRoundsByDate, todayISO } from "@/lib/scoring";

const HOST_KEY = "platzreif:isHost";

export default function AdminPage() {
  const [gate, setGate] = useState("checking"); // checking | setup | locked | unlocked
  const [knownPasscode, setKnownPasscode] = useState(null);
  const [passInput, setPassInput] = useState("");
  const [passError, setPassError] = useState("");

  useEffect(() => {
    (async () => {
      const snap = await getDoc(doc(db, "settings", "config"));
      const data = snap.exists() ? snap.data() : null;
      if (!data || !data.hostPasscode) {
        setGate("setup");
        return;
      }
      setKnownPasscode(data.hostPasscode);
      const isHost = typeof window !== "undefined" && localStorage.getItem(HOST_KEY) === "true";
      setGate(isHost ? "unlocked" : "locked");
    })();
  }, []);

  async function handleSetup(e) {
    e.preventDefault();
    if (!passInput.trim()) return;
    await setDoc(
      doc(db, "settings", "config"),
      { hostPasscode: passInput.trim(), teamName: "Platzreif", teamTag: "Team-Bewertung" },
      { merge: true }
    );
    localStorage.setItem(HOST_KEY, "true");
    setGate("unlocked");
  }

  function handleUnlock(e) {
    e.preventDefault();
    if (passInput.trim() === knownPasscode) {
      localStorage.setItem(HOST_KEY, "true");
      setGate("unlocked");
      setPassError("");
    } else {
      setPassError("Falsches Passwort.");
    }
  }

  if (gate === "checking") {
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

  if (gate === "setup") {
    return (
      <div className="shell">
        <Header />
        <main>
          <h2 className="section-title">Admin-Ersteinrichtung</h2>
          <p className="section-sub">
            Leg ein Passwort für den Host-Bereich fest. Wer es kennt, kann Kader und Runden verwalten.
          </p>
          <form className="card stack" onSubmit={handleSetup}>
            <input
              type="password"
              placeholder="Passwort festlegen"
              value={passInput}
              onChange={(e) => setPassInput(e.target.value)}
            />
            <button className="primary block" type="submit">
              Passwort setzen &amp; Admin öffnen
            </button>
          </form>
        </main>
        <NavBar />
      </div>
    );
  }

  if (gate === "locked") {
    return (
      <div className="shell">
        <Header />
        <main>
          <h2 className="section-title">Admin-Bereich</h2>
          <p className="section-sub">Nur für den Host. Passwort eingeben.</p>
          <form className="card stack" onSubmit={handleUnlock}>
            <input
              type="password"
              placeholder="Passwort"
              value={passInput}
              onChange={(e) => setPassInput(e.target.value)}
              autoFocus
            />
            {passError && <span className="error-text">{passError}</span>}
            <button className="primary block" type="submit">
              Entsperren
            </button>
          </form>
        </main>
        <NavBar />
      </div>
    );
  }

  return <AdminDashboard />;
}

function AdminDashboard() {
  const [players, setPlayers] = useState(null);
  const [rounds, setRounds] = useState(null);
  const [settings, setSettings] = useState({});
  const [newPlayerName, setNewPlayerName] = useState("");
  const [toast, setToast] = useState("");

  const [setupDate, setSetupDate] = useState(todayISO());
  const [setupType, setSetupType] = useState("training");
  const [presentIds, setPresentIds] = useState([]);

  const [openVotes, setOpenVotes] = useState({});

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "players"), (snap) => {
      setPlayers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "rounds"), (snap) => {
      setRounds(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "config"), (snap) => {
      if (snap.exists()) setSettings(snap.data());
    });
    return unsub;
  }, []);

  const activePlayers = useMemo(() => (players || []).filter((p) => p.active), [players]);
  const openRound = useMemo(
    () => (rounds || []).find((r) => r.status === "open") || null,
    [rounds]
  );
  const closedRounds = useMemo(
    () => sortRoundsByDate((rounds || []).filter((r) => r.status === "closed")).reverse(),
    [rounds]
  );

  useEffect(() => {
    if (!openRound) {
      setOpenVotes({});
      return;
    }
    const unsub = onSnapshot(collection(db, "rounds", openRound.id, "votes"), (snap) => {
      const map = {};
      snap.docs.forEach((d) => {
        map[d.id] = d.data();
      });
      setOpenVotes(map);
    });
    return unsub;
  }, [openRound?.id]);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  }

  async function saveTeamSettings(e) {
    e.preventDefault();
    const form = e.target;
    await setDoc(
      doc(db, "settings", "config"),
      {
        teamName: form.teamName.value.trim() || "Platzreif",
        teamTag: form.teamTag.value.trim(),
      },
      { merge: true }
    );
    showToast("Gespeichert");
  }

  async function changePasscode(e) {
    e.preventDefault();
    const val = e.target.newPasscode.value.trim();
    if (!val) return;
    await setDoc(doc(db, "settings", "config"), { hostPasscode: val }, { merge: true });
    e.target.reset();
    showToast("Passwort geändert");
  }

  async function addPlayer(e) {
    e.preventDefault();
    const name = newPlayerName.trim();
    if (!name) return;
    await addDoc(collection(db, "players"), { name, active: true, createdAt: serverTimestamp() });
    setNewPlayerName("");
  }

  async function renamePlayer(id, name) {
    if (!name.trim()) return;
    await updateDoc(doc(db, "players", id), { name: name.trim() });
  }

  async function toggleActive(id, active) {
    await updateDoc(doc(db, "players", id), { active });
  }

  async function deletePlayer(id) {
    const used = (rounds || []).some((r) => (r.presentIds || []).includes(id));
    if (used) {
      if (
        !confirm(
          "Dieser Spieler hat bereits Bewertungen. Trotzdem entfernen? Vergangene Runden bleiben in der Historie erhalten."
        )
      )
        return;
    }
    await deleteDoc(doc(db, "players", id));
  }

  function togglePresent(id) {
    setPresentIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }

  async function startRound(e) {
    e.preventDefault();
    if (presentIds.length < 4) return;
    await addDoc(collection(db, "rounds"), {
      date: setupDate,
      type: setupType,
      presentIds,
      status: "open",
      createdAt: serverTimestamp(),
    });
    setPresentIds([]);
    showToast("Runde gestartet");
  }

  async function closeRound() {
    if (!openRound) return;
    const voteList = Object.values(openVotes);
    const results = computeRoundResultsFromVotes(voteList);
    await updateDoc(doc(db, "rounds", openRound.id), {
      status: "closed",
      results,
      closedAt: serverTimestamp(),
    });
    showToast("Runde beendet");
  }

  async function cancelRound() {
    if (!openRound) return;
    if (!confirm("Diese offene Runde wirklich abbrechen? Bereits abgegebene Stimmen gehen verloren.")) return;
    await deleteDoc(doc(db, "rounds", openRound.id));
  }

  async function deleteRound(id) {
    if (!confirm("Diese Runde wirklich löschen?")) return;
    if (settings.rueckrundeStartRoundId === id) {
      await setDoc(doc(db, "settings", "config"), { rueckrundeStartRoundId: null }, { merge: true });
    }
    await deleteDoc(doc(db, "rounds", id));
  }

  async function saveRueckrunde(e) {
    e.preventDefault();
    const val = e.target.rueckrundeSelect.value || null;
    await setDoc(doc(db, "settings", "config"), { rueckrundeStartRoundId: val }, { merge: true });
    showToast("Rückrunde aktualisiert");
  }

  const loading = players === null || rounds === null;

  return (
    <div className="shell">
      <Header />
      <main>
        <h2 className="section-title">Kader &amp; Einstellungen</h2>

        {loading && <p className="section-sub">Lädt…</p>}

        {!loading && (
          <div className="stack">
            <form className="card stack" onSubmit={saveTeamSettings}>
              <label className="field-label">Teamname</label>
              <input type="text" name="teamName" defaultValue={settings.teamName || "Platzreif"} />
              <label className="field-label">Untertitel</label>
              <input type="text" name="teamTag" defaultValue={settings.teamTag || "Team-Bewertung"} />
              <button className="primary" type="submit">
                Speichern
              </button>
            </form>

            <form className="card stack" onSubmit={changePasscode}>
              <label className="field-label">Admin-Passwort ändern</label>
              <input type="password" name="newPasscode" placeholder="Neues Passwort" />
              <button className="ghost" type="submit">
                Passwort ändern
              </button>
            </form>

            <form className="card stack" onSubmit={addPlayer}>
              <label className="field-label">Spieler hinzufügen</label>
              <div className="row">
                <input
                  type="text"
                  placeholder="Name"
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                />
                <button className="primary" type="submit">
                  Hinzufügen
                </button>
              </div>
              {players.length > 0 && (
                <table className="roster-table">
                  <tbody>
                    {players.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <input
                            type="text"
                            defaultValue={p.name}
                            onBlur={(e) => renamePlayer(p.id, e.target.value)}
                          />
                        </td>
                        <td>
                          <label className="switch">
                            <input
                              type="checkbox"
                              checked={!!p.active}
                              onChange={(e) => toggleActive(p.id, e.target.checked)}
                            />
                            <span className="track">
                              <span className="thumb"></span>
                            </span>
                          </label>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="ghost small danger"
                            onClick={() => deletePlayer(p.id)}
                          >
                            Entfernen
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </form>

            <div className="card stack">
              <label className="field-label">Rundensteuerung</label>
              {!openRound && (
                <form className="stack" onSubmit={startRound}>
                  <div>
                    <label className="field-label">Datum</label>
                    <input
                      type="date"
                      value={setupDate}
                      onChange={(e) => setSetupDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="field-label">Art</label>
                    <div className="segmented">
                      <button
                        type="button"
                        className={setupType === "training" ? "active" : ""}
                        onClick={() => setSetupType("training")}
                      >
                        Training
                      </button>
                      <button
                        type="button"
                        className={setupType === "spiel" ? "active" : ""}
                        onClick={() => setSetupType("spiel")}
                      >
                        Spiel
                      </button>
                    </div>
                  </div>
                  <div>
                    <div className="row between">
                      <label className="field-label" style={{ margin: 0 }}>
                        Anwesend ({presentIds.length})
                      </label>
                      <button
                        type="button"
                        className="ghost small"
                        onClick={() =>
                          setPresentIds(
                            presentIds.length === activePlayers.length
                              ? []
                              : activePlayers.map((p) => p.id)
                          )
                        }
                      >
                        {presentIds.length === activePlayers.length ? "Keinen" : "Alle"} auswählen
                      </button>
                    </div>
                    <div className="chip-grid">
                      {activePlayers.map((p) => (
                        <button
                          type="button"
                          key={p.id}
                          className={"chip checkbox" + (presentIds.includes(p.id) ? " checked" : "")}
                          onClick={() => togglePresent(p.id)}
                        >
                          {p.name}
                        </button>
                      ))}
                    </div>
                    <p className="section-sub" style={{ marginTop: 8 }}>
                      Mindestens 4 nötig (einer stimmt ab, einer wird Bester, zwei werden
                      Schlechteste).
                    </p>
                  </div>
                  <button className="primary block" type="submit" disabled={presentIds.length < 4}>
                    Runde starten
                  </button>
                </form>
              )}

              {openRound && (
                <div className="stack">
                  <div className="row between">
                    <span className="badge type">
                      {openRound.type === "spiel" ? "Spiel" : "Training"} · {formatDate(openRound.date)}
                    </span>
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      {Object.keys(openVotes).length} / {openRound.presentIds.length} abgestimmt
                    </span>
                  </div>
                  <div className="mini-tally">
                    {openRound.presentIds.map((id) => {
                      const p = players.find((pl) => pl.id === id);
                      const voted = Object.values(openVotes).some((v) => v.voterPlayerId === id);
                      return (
                        <div className="mini-tally-row" key={id}>
                          <span>{p ? p.name : "?"}</span>
                          <span>{voted ? "✅" : "⏳"}</span>
                        </div>
                      );
                    })}
                  </div>
                  <button className="primary block" onClick={closeRound}>
                    Runde schließen &amp; Ergebnis speichern
                  </button>
                  <button className="ghost small" onClick={cancelRound}>
                    Runde abbrechen
                  </button>
                </div>
              )}
            </div>

            <form className="card stack" onSubmit={saveRueckrunde}>
              <label className="field-label">Rückrunde</label>
              <p className="section-sub" style={{ margin: "0 0 4px" }}>
                Ab welcher Runde beginnt die Rückrunde? Alles davor zählt als Hinrunde.
              </p>
              {closedRounds.length ? (
                <>
                  <select name="rueckrundeSelect" defaultValue={settings.rueckrundeStartRoundId || ""}>
                    <option value="">— nicht festgelegt —</option>
                    {[...closedRounds].reverse().map((r) => (
                      <option key={r.id} value={r.id}>
                        {formatDate(r.date)} · {r.type === "spiel" ? "Spiel" : "Training"}
                      </option>
                    ))}
                  </select>
                  <button className="ghost" type="submit">
                    Übernehmen
                  </button>
                </>
              ) : (
                <p className="section-sub" style={{ margin: 0 }}>
                  Sobald Runden abgeschlossen sind, könnt ihr hier den Start der Rückrunde markieren.
                </p>
              )}
            </form>

            {closedRounds.length > 0 && (
              <div className="card stack">
                <label className="field-label">Runden löschen (Korrektur)</label>
                {closedRounds.map((r) => (
                  <div className="row between" key={r.id}>
                    <span>
                      {formatDate(r.date)} · {r.type === "spiel" ? "Spiel" : "Training"}
                    </span>
                    <button className="danger small" onClick={() => deleteRound(r.id)}>
                      Löschen
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
      <div className={"toast" + (toast ? " show" : "")}>{toast}</div>
      <NavBar />
    </div>
  );
}
