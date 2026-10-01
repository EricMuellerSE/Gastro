import { datum, eur, uhr } from '../format';
import type { UmsatzDaten } from '../types';
import type { ViewProps } from './types';

const Bilanz = ({ e, k, x }: { e: number; k: number; x: number }) => (
  <>
    <p className="summe">{eur(x)}</p>
    <p className="mu" style={{ margin: 0 }}>Einnahmen {eur(e)} minus Nachbestellkosten {eur(k)}</p>
  </>
);

export function UmsatzView({ data: u }: ViewProps<UmsatzDaten>) {
  const bis = new Date(new Date(u.bis).getTime() - 1);
  return (
    <>
      <h2>Umsatz</h2>
      <p className="sub">Einnahmen aus bezahlten Bestellungen, abzüglich der Kosten der automatischen Nachbestellungen.</p>
      <div className="felder">
        <div className="karte"><h3>Tagesumsatz heute</h3><Bilanz e={u.heute.einnahmen} k={u.heute.kosten} x={u.heute.ergebnis} /></div>
        <div className="karte"><h3>Wochenumsatz ({datum(new Date(u.von))} bis {datum(bis)})</h3><Bilanz e={u.einnahmen} k={u.kosten} x={u.ergebnis} /></div>
      </div>

      <h3>Umsatz pro Tag der Woche</h3>
      <div className="wrap">
        <table>
          <thead><tr><th>Tag</th><th className="num">Einnahmen</th><th className="num">Nachbestellkosten</th><th className="num">Ergebnis</th></tr></thead>
          <tbody>
            {u.tage.map((t) => (
              <tr key={t.datum}>
                <td>{datum(new Date(t.datum))}</td>
                <td className="num">{eur(t.einnahmen)}</td>
                <td className="num">{eur(t.kosten)}</td>
                <td className="num"><strong>{eur(t.ergebnis)}</strong></td>
              </tr>
            ))}
            <tr>
              <td><strong>Woche gesamt</strong></td>
              <td className="num">{eur(u.einnahmen)}</td>
              <td className="num">{eur(u.kosten)}</td>
              <td className="num"><strong>{eur(u.ergebnis)}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3>Bezahlte Bestellungen dieser Woche</h3>
      <div className="wrap">
        <table>
          <thead><tr><th>Bezahlt am</th><th>Tisch</th><th>Art</th><th className="num">Betrag</th></tr></thead>
          <tbody>
            {u.liste.length ? u.liste.map((b, i) => {
              const z = new Date(b.zeit);
              return (
                <tr key={i}>
                  <td>{datum(z)}, {uhr(z)}</td>
                  <td>{b.tisch != null ? `Tisch ${b.tisch}` : `Mitarbeiter: ${b.mitarbeiter ?? '–'}`}</td>
                  <td>Getränk</td>
                  <td className="num">{eur(b.betrag)}</td>
                </tr>
              );
            }) : <tr><td colSpan={4} className="mu">In dieser Woche wurde noch nichts bezahlt.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
