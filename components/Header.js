"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot, collection, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function Header() {
  const [settings, setSettings] = useState({ teamName: "Platzreif", teamTag: "Team-Bewertung" });
  const [roundCount, setRoundCount] = useState(0);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "config"), (snap) => {
      if (snap.exists()) setSettings((s) => ({ ...s, ...snap.data() }));
    });
    return unsub;
  }, []);

  useEffect(() => {
    const q = query(collection(db, "rounds"), where("status", "==", "closed"));
    const unsub = onSnapshot(q, (snap) => setRoundCount(snap.size));
    return unsub;
  }, []);

  return (
    <header className="top">
      <div className="brand">
        <span className="name">{settings.teamName || "Platzreif"}</span>
        <span className="tag">{settings.teamTag || "Team-Bewertung"}</span>
      </div>
      <span className="pill">
        {roundCount} {roundCount === 1 ? "Runde" : "Runden"}
      </span>
    </header>
  );
}
