import { FormEvent, useState } from 'react';
import { api } from '../api';
import { zahl } from '../format';
import { useAktion, useMsg } from '../store';
import type { RezeptDaten } from '../types';
import type { ViewProps } from './types';

type Zutat = RezeptDaten['zutaten'][number];

/** Eine Zutatenzeile: Die Einheit wird aus dem Lagerartikel übernommen und ist nicht auswählbar. */
function ZutatZeile({ i, zutaten }: { i: number; zutaten: Zutat[] }) {
  const [id, setId] = useState('');
  const gewaehlt = zutaten.find((z) => String(z.id) === id);
  return (
    <div className="felder">
      <label>
        Zutat {i}{i === 1 ? ' (Pflicht)' : ' (optional)'}
        <select name={`zutatArtikel${i}`} required={i === 1} value={id} onChange={(e) => setId(e.target.value)}>
          <option value="">{i === 1 ? 'Zutat aus dem Lager wählen' : '– keine –'}</option>
          {zutaten.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
        </select>
      </label>
      <label>Menge<input type="number" name={`zutatMenge${i}`} min="0.01" step="any" defaultValue={1} /></label>
      <label>
        Einheit (aus dem Lager)
        <input value={gewaehlt?.einheit ?? '–'} readOnly tabIndex={-1} aria-readonly="true" />
      </label>
    </div>
  );
}

export function RezepteView({ rolle, data }: ViewProps<RezeptDaten>) {
  const aktion = useAktion();
  const { setMsg } = useMsg();
  const [offen, setOffen] = useState(false);

  const speichern = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const ok = await aktion(async () => {
      await api.getraenkErstellen(rolle, d);
      return 'Rezept gespeichert.';
    });
    if (ok) setOffen(false);
  };

  return (
    <>
      <div className="leiste">
        <div>
          <h2>Rezepte</h2>
          <p className="sub" style={{ margin: 0 }}>
            Zutaten je Getränk. Wird genutzt, um bei eingehenden Bestellungen zu prüfen, ob genug Zutaten im Lager vorhanden sind.
          </p>
        </div>
        <button className="primaer" onClick={() => { setMsg(null); setOffen(true); }}>Rezept hinzufügen</button>
      </div>

      {offen && (
        <form className="karte" onSubmit={speichern}>
          <h3>Neues Rezept</h3>
          <div className="felder">
            <label>Name des Getränks<input name="name" required /></label>
            <label>Verkaufspreis (€)<input name="preis" type="number" min="0" step="0.01" required /></label>
          </div>
          <p className="sub" style={{ margin: '10px 0 4px' }}>
            Rezept: Ohne mindestens eine Zutat aus dem Lagerbestand kann kein Rezept gespeichert werden.
            Die Einheit ist beim Lagerartikel festgelegt und kann hier nicht geändert werden.
          </p>
          {[1, 2, 3].map((i) => <ZutatZeile key={i} i={i} zutaten={data.zutaten} />)}
          <div className="zeile" style={{ marginTop: 10 }}>
            <button className="primaer">Rezept speichern</button>
            <button type="button" className="b" onClick={() => setOffen(false)}>Abbrechen</button>
          </div>
        </form>
      )}

      <div className="wrap">
        <table>
          <thead><tr><th>Getränk</th><th>Zutaten</th></tr></thead>
          <tbody>
            {data.rezepte.length ? data.rezepte.map((r) => (
              <tr key={r.id}>
                <td><strong>{r.getraenk.name}</strong></td>
                <td>{r.zutaten.map((z) => `${zahl(z.menge)} ${z.einheit} ${z.name}`).join(', ')}</td>
              </tr>
            )) : <tr><td colSpan={2} className="mu">Keine Rezepte hinterlegt.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
