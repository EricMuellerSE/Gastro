import { FormEvent } from "react";
import { api, Zeile } from "../api";
import { eur } from "../format";
import { useAktion } from "../store";
import type { Bestellformular } from "../types";
import type { ViewProps } from "./types";

function BestellTabelle({ karte }: { karte: Bestellformular["karte"] }) {
  return (
    <div className="wrap">
      <table>
        <thead>
          <tr>
            <th>Getränk</th>
            <th className="num">Preis</th>
            <th className="num">Menge</th>
          </tr>
        </thead>
        <tbody>
          {karte.map((k) => (
            <tr key={k.id}>
              <td>{k.name}</td>
              <td className="num">{eur(k.preis)}</td>
              <td className="num">
                <input
                  type="number"
                  name={`m${k.id}`}
                  min="0"
                  step="1"
                  placeholder="0"
                  aria-label={`Menge ${k.name}`}
                  style={{ width: "5rem" }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Mengen aus dem Formular lesen (leere Felder werden ignoriert, wie in der Vorlage). */
const zeilenAus = (fd: FormData, karte: Bestellformular["karte"]): Zeile[] =>
  karte
    .filter((k) => String(fd.get("m" + k.id) ?? "").trim() !== "")
    .map((k) => ({ id: k.id, menge: Number(fd.get("m" + k.id)) }));

export function TablettView({ rolle, data }: ViewProps<Bestellformular>) {
  const aktion = useAktion();
  const senden = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const tisch = Number(fd.get("tisch"));
    const ok = await aktion(async () => {
      await api.bestelleAmTisch(rolle, tisch, zeilenAus(fd, data.karte));
      return `Danke! Deine Bestellung für Tisch ${tisch} ist eingegangen.`;
    });
    if (ok) form.reset();
  };

  // Aufenthalt beenden: offene Bestellungen des Tisches bezahlen, Tisch freigeben
  const beenden = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const tisch = Number(new FormData(form).get("tisch"));
    const ok = await aktion(async () => {
      const r = await api.aufenthaltBeenden(rolle, tisch);
      return r.anzahl
        ? `Aufenthalt an Tisch ${r.tisch} beendet. Bezahlt: ${eur(r.summe)} (${r.anzahl} ${r.anzahl === 1 ? "Bestellung" : "Bestellungen"}). Der Tisch ist wieder frei.`
        : `Aufenthalt an Tisch ${r.tisch} beendet. Es gab keine offenen Bestellungen. Der Tisch ist wieder frei.`;
    });
    if (ok) form.reset();
  };

  return (
    <>
      <h2>Bestellung am Tablet</h2>
      <p className="sub">
        Trage bei den gewünschten Getränken die Menge ein. Deine Bestellung geht direkt an die Bar.
      </p>
      <form className="karte" onSubmit={senden}>
        <label style={{ maxWidth: 260, marginBottom: 14 }}>
          Dieses Tablet steht an
          <select name="tisch" required>
            <option value="">Tisch wählen</option>
            {data.tische.map((t) => (
              <option key={t.id} value={t.nummer}>
                Tisch {t.nummer}
              </option>
            ))}
          </select>
        </label>
        <BestellTabelle karte={data.karte} />
        <button className="primaer">Jetzt bestellen</button>
      </form>

      <form className="karte" onSubmit={beenden}>
        <h3>Aufenthalt beenden</h3>
        <p className="sub">
          Alle offenen Bestellungen des Tisches werden als bezahlt gebucht, danach wird der Tisch
          wieder freigegeben.
        </p>
        {data.tische.length ? (
          <>
            <label style={{ maxWidth: 260, marginBottom: 14 }}>
              Tisch
              <select name="tisch" required>
                <option value="">Tisch wählen</option>
                {data.tische.map((t) => (
                  <option key={t.id} value={t.nummer}>
                    Tisch {t.nummer}
                  </option>
                ))}
              </select>
            </label>
            <button className="primaer">Aufenthalt beenden</button>
          </>
        ) : (
          <p className="mu" style={{ margin: 0 }}>
            Zurzeit ist kein Tisch besetzt.
          </p>
        )}
      </form>
    </>
  );
}

export function EigeneView({ rolle, data }: ViewProps<Bestellformular>) {
  const aktion = useAktion();
  const senden = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const id = Number(fd.get("mitarbeiter"));
    const name = data.mitarbeiter.find((m) => m.id === id)?.name ?? "";
    const ok = await aktion(async () => {
      await api.bestelleEigene(rolle, id, zeilenAus(fd, data.karte));
      return `Eigene Bestellung für ${name} aufgegeben.`;
    });
    if (ok) form.reset();
  };
  return (
    <>
      <h2>Eigene Bestellung</h2>
      <p className="sub">
        Mitarbeiter bestellen hier für sich selbst. Getränke erscheinen in der Bar-Ansicht.
      </p>
      <form className="karte" onSubmit={senden}>
        <label style={{ maxWidth: 260, marginBottom: 14 }}>
          Mitarbeiter
          <select name="mitarbeiter" required>
            <option value="">Mitarbeiter wählen</option>
            {data.mitarbeiter.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
        <BestellTabelle karte={data.karte} />
        <button className="primaer">Eigene Bestellung absenden</button>
      </form>
    </>
  );
}
