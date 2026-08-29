# Platzreif

Team-Bewertungs-App: nach jedem Training und Spiel stimmt jede·r von seinem
eigenen Handy aus ab, wer bester und wer schlechteste war. Läuft auf
Next.js + Firebase (Firestore), gehostet auf Vercel.

Komplette Einrichtung: siehe Chat-Anleitung. Kurzfassung:

1. Firebase-Projekt anlegen, Firestore (Native-Modus) + Anonyme
   Authentifizierung aktivieren, `firestore.rules` in der Firebase-Konsole
   einfügen.
2. Firebase-Web-App-Konfiguration in Vercel als Environment Variables
   eintragen (siehe `.env.local.example` für die Namen).
3. Dieses Repo auf GitHub pushen, in Vercel importieren, deployen.
4. `/admin` auf der deployten Seite öffnen → Passwort festlegen → Kader
   anlegen → Runde starten.
5. Link an alle schicken, jede·r stimmt von seinem eigenen Handy ab.

## Lokale Entwicklung (optional, nur falls Node.js installiert ist)

```bash
npm install
cp .env.local.example .env.local   # Werte eintragen
npm run dev
```

## Sicherheitshinweis

Der Admin-Bereich (`/admin`) ist nur durch ein einfaches Passwort
geschützt, keine echte Benutzer-Authentifizierung. Für eine private
Team-App ist das ausreichend, aber jede·r mit dem Passwort und
grundsätzlichem technischen Wissen könnte theoretisch auch direkt über
die Firebase-Konfiguration schreiben. Stimmen selbst sind nach dem
Abgeben unveränderlich (serverseitig über Firestore-Regeln erzwungen).
