import { FormEvent, useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { LoeschKnopf, Pill } from '../components/ui';
import { eur, heuteStr, zahl } from '../format';
import { useAktion, useMsg } from '../store';
import type { LagerDaten, LagerZeile } from '../types';
import type { ViewProps } from './types';

type Form = null | { typ: 'artikel'; zeile?: LagerZeile } | { typ: 'nachbestellen'; zeile: LagerZeile };
const schluessel = (z: LagerZeile) => `${z.zutatID}-${z.chargenID}`;
const meldeAuto = (n: number) => (n ? ` Automatische Nachbestellung ausgelöst (${n}).` : '');

function ArtikelForm({ zeile: w, einheiten, onSubmit, onCancel }: {
  zeile?: LagerZeile; einheiten: string[]; onSubmit: (e: FormEvent<HTMLFormElement>) => void; onCancel: () => void;
}) {
  return (
    <form className="karte" onSubmit={onSubmit}>
      <h3>{w ? 'Datensatz bearbeiten' : 'Neu hinzufügen'}</h3>
      <div className="felder">
        <label>Artikelname<input name="name" defaultValue={w?.name ?? ''} required /></label>
        <label>
          {w ? 'Einheit (in der Datenbank festgelegt)' : 'Einheit'}
          {w ? (
            <input value={w.einheit} disabled />
          ) : (
            <select name="einheit" required>
              <option value="">Bitte wählen</option>
              {einheiten.map((e) => <option key={e}>{e}</option>)}
            </select>
          )}
        </label>
        <label>Aktueller Bestand<input name="bestand" type="number" min="0" step="any" defaultValue={w?.bestand ?? ''} required /></label>
        <label>Mindestmenge<input name="mindestmenge" type="number" min="0" step="any" defaultValue={w?.mindestmenge ?? ''} required /></label>
        <label>Nachbestellmenge<input name="nachbestellmenge" type="number" min="0" step="any" defaultValue={w?.nachbestellmenge ?? ''} required /></label>
        <label>Mindesthaltbarkeitsdatum<input name="mhd" type="date" defaultValue={w?.mhd ?? ''} required /></label>
        <label>Einkaufspreis pro Einheit (€)<input name="preis" type="number" min="0" step="any" defaultValue={w?.preis ?? ''} required /></label>
      </div>
      <div className="zeile">
        <button className="primaer">Speichern</button>
        <button type="button" className="b" onClick={onCancel}>Abbrechen</button>
      </div>
    </form>
  );
}

function LagerAnsicht({ rolle, data, bearbeiten }: ViewProps<LagerDaten> & { bearbeiten: boolean }) {
  const aktion = useAktion();
  const { setMsg } = useMsg();
  const [form, setForm] = useState<Form>(null);
  const [bestaetige, setBestaetige] = useState<string | null>(null);
  const heute = heuteStr();
  const lp = data.letztePruefung ? new Date(data.letztePruefung) : null;

  // Meldung bei Nachbestellungen, die das System selbst (im Hintergrund) ausgelöst hat
  const auto = useRef<{ letzte: number | null; skip: number }>({ letzte: null, skip: 0 });
  useEffect(() => {
    const n = data.protokoll.length;
    const a = auto.current;
    if (a.letzte !== null && n > a.letzte) {
      const neu = n - a.letzte - a.skip;
      if (neu > 0) setMsg({ t: 'ok', x: `Automatische Nachbestellung ausgelöst (${neu}).` });
      a.skip = 0;
    }
    a.letzte = n;
  }, [data.protokoll.length, setMsg]);

  const oeffne = (f: Form) => { setMsg(null); setBestaetige(null); setForm(f); };

  const speichern = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const zeile = form?.typ === 'artikel' ? form.zeile : undefined;
    const ok = await aktion(async () => {
      const { nachbestellungen } = await api.lagerSpeichern(rolle, d, zeile);
      auto.current.skip += nachbestellungen;
      return 'Gespeichert.' + meldeAuto(nachbestellungen);
    });
    if (ok) setForm(null);
  };

  const nachbestellen = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (form?.typ !== 'nachbestellen') return;
    const anzahl = String(new FormData(e.currentTarget).get('anzahl'));
    const z = form.zeile;
    const ok = await aktion(async () => {
      const { nachbestellungen } = await api.nachbestellen(rolle, z, anzahl);
      auto.current.skip += nachbestellungen;
      return 'Nachbestellung ausgelöst.';
    });
    if (ok) setForm(null);
  };

  const loeschen = async (z: LagerZeile) => {
    if (bestaetige !== schluessel(z)) return setBestaetige(schluessel(z));
    setBestaetige(null);
    await aktion(async () => {
      await api.lagerLoeschen(rolle, z);
      return 'Gelöscht.';
    });
  };

  return (
    <>
      <div className="leiste">
        <div>
          <h2>{bearbeiten ? 'Lager' : 'Lagerbestand'}</h2>
          <p className="sub" style={{ margin: 0 }}>Alle Lagerartikel mit Bestand, Mindestmenge, Nachbestellmenge und Mindesthaltbarkeitsdatum.</p>
        </div>
        <button className="primaer" onClick={() => oeffne({ typ: 'artikel' })}>Artikel hinzufügen</button>
      </div>

      {form?.typ === 'artikel' && (
        <ArtikelForm key={form.zeile ? schluessel(form.zeile) : 'neu'} zeile={form.zeile} einheiten={data.einheiten} onSubmit={speichern} onCancel={() => setForm(null)} />
      )}
      {form?.typ === 'nachbestellen' && (
        <form className="karte" key={schluessel(form.zeile)} onSubmit={nachbestellen}>
          <h3>Nachbestellen: {form.zeile.name}</h3>
          <label style={{ maxWidth: 200 }}>
            Anzahl ({form.zeile.einheit})
            <input name="anzahl" type="number" min="0" step="any" defaultValue={form.zeile.nachbestellmenge} required />
          </label>
          <div className="zeile" style={{ marginTop: 10 }}>
            <button className="primaer">Jetzt nachbestellen</button>
            <button type="button" className="b" onClick={() => setForm(null)}>Abbrechen</button>
          </div>
        </form>
      )}

      <div className="wrap">
        <table>
          <thead>
            <tr><th>Artikel</th><th className="num">Bestand</th><th className="num">Mindestmenge</th><th className="num">Nachbestellmenge</th><th className="num">Einkaufspreis</th><th>Haltbar bis</th><th></th></tr>
          </thead>
          <tbody>
            {data.zeilen.length ? data.zeilen.map((a) => (
              <tr key={schluessel(a)}>
                <td>{a.name}<div className="mu klein">Charge {a.chargenID}</div></td>
                <td className="num">{zahl(a.bestand)} {a.einheit}</td>
                <td className="num">{zahl(a.mindestmenge)} {a.einheit}</td>
                <td className="num">{zahl(a.nachbestellmenge)} {a.einheit}</td>
                <td className="num">{eur(a.preis, 4)} / {a.einheit}</td>
                <td className={a.mhd <= heute ? 'rot' : ''}>{new Date(a.mhd + 'T00:00').toLocaleDateString('de-DE')}</td>
                <td className="zeile" style={{ justifyContent: 'flex-end' }}>
                  {bearbeiten && (
                    <>
                      <button className="b" onClick={() => oeffne({ typ: 'nachbestellen', zeile: a })}>Nachbestellen</button>
                      <button className="b" onClick={() => oeffne({ typ: 'artikel', zeile: a })}>Bearbeiten</button>
                    </>
                  )}
                  <LoeschKnopf bestaetigt={bestaetige === schluessel(a)} onClick={() => loeschen(a)} />
                </td>
              </tr>
            )) : <tr><td colSpan={7} className="mu">Das Lager ist leer. Füge einen Artikel hinzu.</td></tr>}
          </tbody>
        </table>
      </div>

      <h3>Automatische Lagerüberwachung</h3>
      <p className="sub">
        Das System prüft alle 5 Sekunden sowie nach jeder Änderung, ob die Mindestmenge oder das Mindesthaltbarkeitsdatum erreicht ist,
        und bestellt dann die Nachbestellmenge nach. Letzte Prüfung: {lp ? lp.toLocaleTimeString('de-DE') : 'noch nicht erfolgt'}.
      </p>
      <div className="wrap">
        <table>
          <thead><tr><th>Zeit</th><th>Artikel</th><th>Auslöser</th><th className="num">Nachbestellt</th><th className="num">Kosten</th></tr></thead>
          <tbody>
            {data.protokoll.length ? data.protokoll.map((p) => (
              <tr key={p.id}>
                <td>{new Date(p.zeit).toLocaleTimeString('de-DE')}</td>
                <td>{p.artikel}</td>
                <td><Pill art="warn">{p.grund}</Pill></td>
                <td className="num">{zahl(p.menge)} {p.einheit ?? ''}</td>
                <td className="num">{eur(p.kosten)}</td>
              </tr>
            )) : <tr><td colSpan={5} className="mu">Bisher wurde keine Nachbestellung ausgelöst.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}

export const LagerView = (p: ViewProps<LagerDaten>) => <LagerAnsicht {...p} bearbeiten />;
export const BestandView = (p: ViewProps<LagerDaten>) => <LagerAnsicht {...p} bearbeiten={false} />;
