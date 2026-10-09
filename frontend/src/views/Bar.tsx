import { useState } from "react";
import { api } from "../api";
import { Pill } from "../components/ui";
import { uhr } from "../format";
import { useAktion } from "../store";
import type { BarBestellung } from "../types";
import type { ViewProps } from "./types";

type Sortierung = "" | "auf" | "ab";

export function BarView({ rolle, data }: ViewProps<BarBestellung[]>) {
  const aktion = useAktion();
  const [sort, setSort] = useState<Sortierung>("");
  const liste = [...data];
  if (sort === "auf") liste.sort((x, y) => +new Date(x.zeit) - +new Date(y.zeit));
  if (sort === "ab") liste.sort((x, y) => +new Date(y.zeit) - +new Date(x.zeit));

  const sb = (v: Sortierung, t: string) => (
    <button className={sort === v ? "primaer" : "b"} onClick={() => setSort(v)}>
      {t}
    </button>
  );
  const fertig = (id: number) =>
    aktion(async () => {
      await api.fertig(rolle, id);
      return "Bestellung ist jetzt „fertig“.";
    });

  return (
    <>
      <h2>Getränkebestellungen</h2>
      <p className="sub">
        Alle aufgegebenen Getränkebestellungen. Sortiere nach Bestelluhrzeit, um ältere Bestellungen
        zuerst zu bearbeiten.
      </p>
      <div className="zeile" style={{ marginBottom: 14 }}>
        <span className="mu">Sortierung nach Bestelluhrzeit:</span>
        {sb("auf", "Älteste zuerst")}
        {sb("ab", "Neueste zuerst")}
      </div>
      <div className="wrap">
        <table>
          <thead>
            <tr>
              <th>Bestelluhrzeit</th>
              <th>Tisch / Mitarbeiter</th>
              <th>Getränke</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {liste.length ? (
              liste.map((b) => (
                <tr key={b.id}>
                  <td>
                    <strong>{uhr(new Date(b.zeit))} Uhr</strong>
                  </td>
                  <td>{b.tisch != null ? `Tisch ${b.tisch}` : `Mitarbeiter: ${b.mitarbeiter}`}</td>
                  <td>{b.positionen.map((p) => `${p.menge}× ${p.name}`).join(", ")}</td>
                  <td>
                    <Pill art={b.status === "fertig" ? "ok" : "warn"}>{b.status}</Pill>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {b.status === "in Bearbeitung" && (
                      <button className="primaer" onClick={() => fertig(b.id)}>
                        Auf „fertig“ setzen
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="mu">
                  Keine Getränkebestellungen vorhanden.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
