import { Pill } from '../components/ui';
import type { Tisch } from '../types';
import type { ViewProps } from './types';

const Besetzung = ({ t }: { t: Tisch }) =>
  t.status === 'besetzt' ? <><Pill art="warn">besetzt</Pill> {t.sitzplaetze} Plätze</>
  : t.status === 'frei' ? <Pill art="ok">frei</Pill>
  : <Pill>{t.status}</Pill>;

export function TischeView({ data }: ViewProps<Tisch[]>) {
  return (
    <>
      <h2>Tische</h2>
      <p className="sub">Aktueller Zustand aller Tische.</p>
      <div className="wrap">
        <table>
          <thead><tr><th>Tisch</th><th>Besetzung</th><th>Bestellung</th><th>Serviert</th><th>Bezahlung</th></tr></thead>
          <tbody>
            {data.map((t) => (
              <tr key={t.id}>
                <td><strong>Tisch {t.nummer}</strong></td>
                <td><Besetzung t={t} /></td>
                <td>{t.bestellt ? <Pill art="warn">aufgegeben</Pill> : <Pill>keine Bestellung</Pill>}</td>
                <td>{!t.bestellt ? '–' : t.serviert ? <Pill art="ok">serviert</Pill> : <Pill art="warn">noch nicht serviert</Pill>}</td>
                <td>{!t.bestellt ? '–' : t.bezahlt ? <Pill art="ok">bezahlt</Pill> : <Pill art="warn">offen</Pill>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
