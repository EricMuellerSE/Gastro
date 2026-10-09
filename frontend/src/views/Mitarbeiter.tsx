import { FormEvent, useState } from "react";
import { api } from "../api";
import { LoeschKnopf } from "../components/ui";
import { heuteStr } from "../format";
import { useAktion, useMsg } from "../store";
import type { Mitarbeiter, MitarbeiterDaten } from "../types";
import type { ViewProps } from "./types";

export function MitarbeiterView({ rolle, data }: ViewProps<MitarbeiterDaten>) {
  const aktion = useAktion();
  const { setMsg } = useMsg();
  const [form, setForm] = useState<{ werte?: Mitarbeiter } | null>(null);
  const [bestaetige, setBestaetige] = useState<number | null>(null);

  const speichern = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const id = form?.werte?.id;
    const ok = await aktion(async () => {
      await api.mitarbeiterSpeichern(rolle, d, id);
      return "Gespeichert.";
    });
    if (ok) setForm(null);
  };

  const loeschen = async (id: number) => {
    if (bestaetige !== id) return setBestaetige(id);
    setBestaetige(null);
    await aktion(async () => {
      await api.mitarbeiterLoeschen(rolle, id);
      return "Gelöscht.";
    });
  };

  const w = form?.werte;
  return (
    <>
      <div className="leiste">
        <div>
          <h2>Mitarbeiter</h2>
          <p className="sub" style={{ margin: 0 }}>
            Alle aktuell im Restaurant beschäftigten Mitarbeiter.
          </p>
        </div>
        <button
          className="primaer"
          onClick={() => {
            setMsg(null);
            setBestaetige(null);
            setForm({});
          }}
        >
          Mitarbeiter hinzufügen
        </button>
      </div>

      {form && (
        <form className="karte" key={w?.id ?? "neu"} onSubmit={speichern}>
          <h3>{w ? "Datensatz bearbeiten" : "Neu hinzufügen"}</h3>
          <div className="felder">
            <label>
              Vorname
              <input name="vorname" defaultValue={w?.vorname ?? ""} required />
            </label>
            <label>
              Name
              <input name="name" defaultValue={w?.name ?? ""} required />
            </label>
            <label>
              E-Mail
              <input name="email" type="email" defaultValue={w?.email ?? ""} required />
            </label>
            <label>
              Rolle
              <select name="rolleID" defaultValue={w?.rolleID ?? ""} required>
                <option value="">Bitte wählen</option>
                {data.rollen.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Eintrittsdatum
              <input
                name="eintritt"
                type="date"
                defaultValue={w?.eintritt ?? heuteStr()}
                required
              />
            </label>
            <label>
              {w ? "Neues Passwort (leer = unverändert)" : "Passwort"}
              <input
                name="passwort"
                type="password"
                minLength={8}
                autoComplete="new-password"
                required={!w}
              />
            </label>
          </div>
          <div className="zeile">
            <button className="primaer">Speichern</button>
            <button type="button" className="b" onClick={() => setForm(null)}>
              Abbrechen
            </button>
          </div>
        </form>
      )}

      <div className="wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Rolle</th>
              <th>E-Mail</th>
              <th>Eintritt</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data.mitarbeiter.length ? (
              data.mitarbeiter.map((m) => (
                <tr key={m.id}>
                  <td>
                    {m.vorname} {m.name}
                  </td>
                  <td>{m.rolle}</td>
                  <td>{m.email}</td>
                  <td>{new Date(m.eintritt + "T00:00").toLocaleDateString("de-DE")}</td>
                  <td className="zeile" style={{ justifyContent: "flex-end" }}>
                    <button
                      className="b"
                      onClick={() => {
                        setMsg(null);
                        setBestaetige(null);
                        setForm({ werte: m });
                      }}
                    >
                      Bearbeiten
                    </button>
                    <LoeschKnopf bestaetigt={bestaetige === m.id} onClick={() => loeschen(m.id)} />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="mu">
                  Noch keine Mitarbeiter. Füge den ersten Mitarbeiter hinzu.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
