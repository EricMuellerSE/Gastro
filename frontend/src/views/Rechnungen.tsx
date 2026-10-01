import { useState } from 'react';
import { eur, zahl } from '../format';
import type { Rechnung } from '../types';
import type { ViewProps } from './types';

export function RechnungenView({ data }: ViewProps<Rechnung[]>) {
  const [auswahl, setAuswahl] = useState<number | null>(null);
  const d = data.find((x) => x.id === auswahl);
  const zl = (a: string, b: React.ReactNode) => <tr><th>{a}</th><td>{b}</td></tr>;

  return (
    <>
      <h2>Rechnungen</h2>
      <p className="sub">Rechnungen aller automatischen Nachbestellungen.</p>

      {d && (
        <div className="karte">
          <div className="leiste">
            <h3 style={{ margin: 0 }}>Rechnung {d.nummer}</h3>
            <button className="b" onClick={() => setAuswahl(null)}>Schließen</button>
          </div>
          <table style={{ minWidth: 0 }}>
            <tbody>
              {zl('Datum und Uhrzeit', new Date(d.zeit).toLocaleString('de-DE'))}
              {zl('Artikel', d.artikel)}
              {zl('Auslöser', d.grund)}
              {zl('Menge', `${zahl(d.menge)} ${d.einheit ?? ''}`)}
              {zl('Einzelpreis', `${eur(d.einzelpreis, 4)}${d.einheit ? ' / ' + d.einheit : ''}`)}
              {zl('Gesamtbetrag', <strong>{eur(d.gesamt)}</strong>)}
            </tbody>
          </table>
        </div>
      )}

      <div className="wrap">
        <table>
          <thead><tr><th>Rechnungsnummer</th><th>Datum</th><th>Artikel</th><th className="num">Gesamtbetrag</th><th></th></tr></thead>
          <tbody>
            {data.length ? data.map((x) => (
              <tr key={x.id}>
                <td>{x.nummer}</td>
                <td>{new Date(x.zeit).toLocaleString('de-DE')}</td>
                <td>{x.artikel}</td>
                <td className="num">{eur(x.gesamt)}</td>
                <td style={{ textAlign: 'right' }}><button className="b" onClick={() => setAuswahl(x.id)}>Ansehen</button></td>
              </tr>
            )) : <tr><td colSpan={5} className="mu">Noch keine Rechnungen.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
