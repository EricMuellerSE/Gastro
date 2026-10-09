import { useNavigate } from "@tanstack/react-router";
import { FormEvent, useState } from "react";
import { api } from "../api";

/** Anmeldeseite. Ohne Anmeldung ist nur die Kundenansicht (Tablet) erreichbar. */
export function LoginSeite() {
  const navigate = useNavigate();
  const [fehler, setFehler] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState(false);

  const anmelden = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setFehler(null);
    setLaeuft(true);
    try {
      const { benutzer } = await api.login(String(fd.get("email")), String(fd.get("passwort")));
      // Weiter zur Ansicht der Rolle, die dem Mitarbeiter in der Datenbank zugewiesen ist
      await navigate({ to: "/$rolle", params: { rolle: benutzer.rolle } });
    } catch (err) {
      setFehler((err as Error).message);
      setLaeuft(false);
    }
  };

  return (
    <>
      <header>
        <div className="kopf">
          <h1>Restaurantverwaltung</h1>
        </div>
      </header>
      <main id="main">
        <h2>Anmelden</h2>
        <p className="sub">
          Melde dich mit deiner E-Mail-Adresse und deinem Passwort an. Du siehst danach die Bereiche
          deiner Rolle.
        </p>
        {fehler && (
          <p className="hinweis fehler" role="alert">
            {fehler}
          </p>
        )}
        <form className="karte" onSubmit={anmelden} style={{ maxWidth: 420 }}>
          <div className="felder" style={{ gridTemplateColumns: "1fr" }}>
            <label>
              E-Mail
              <input name="email" type="email" autoComplete="username" required autoFocus />
            </label>
            <label>
              Passwort
              <input name="passwort" type="password" autoComplete="current-password" required />
            </label>
          </div>
          <div className="zeile" style={{ marginTop: 10 }}>
            <button className="primaer" disabled={laeuft}>
              {laeuft ? "Anmelden …" : "Anmelden"}
            </button>
          </div>
        </form>
        <p className="sub" style={{ marginTop: 18 }}>
          Du bist Gast? Ohne Anmeldung kannst du die Kundenansicht (Tablet) öffnen.
        </p>
        <button
          className="b"
          onClick={() => navigate({ to: "/$rolle", params: { rolle: "kunde" } })}
        >
          Zur Kundenansicht (Tablet)
        </button>
      </main>
    </>
  );
}
