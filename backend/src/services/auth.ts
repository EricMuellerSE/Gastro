import { pool, q } from '../db';
import { pruefePasswort, hashPasswort } from '../passwort';
import { AppError, Rolle, ROLLEN } from '../util';

export interface Benutzer {
  id: number;
  name: string;
  rolle: Rolle;      // Schlüssel der Oberfläche (admin, barkeeper, lager)
  rolleName: string; // Name der Rolle aus der Datenbank
}

/** Rolle der Datenbank (rolle.name) -> Rolle der Oberfläche. „kunde“ ist keine Mitarbeiterrolle. */
const rolleAusName = (name: string): Rolle | null =>
  (Object.keys(ROLLEN) as Rolle[]).find((k) => k !== 'kunde' && ROLLEN[k] === name) ?? null;

/* Einfacher Schutz gegen Ausprobieren von Passwörtern: 5 Fehlversuche pro E-Mail -> 15 Minuten Sperre */
const MAX_FEHLER = 5;
const SPERRE_MS = 15 * 60 * 1000;
const fehlversuche = new Map<string, { n: number; bis: number }>();
const DUMMY_HASH = hashPasswort('kein-passwort'); // gleicht die Antwortzeit bei unbekannter E-Mail an

interface Zeile { id: number; vorname: string; name: string; passwort?: string; rolle: string }
const BENUTZER_SQL = `SELECT m.ID AS id, m.vorname, m.name, m.passwort, r.name AS rolle
                      FROM mitarbeiter m JOIN rolle r ON r.ID = m.rolleID`;

const alsBenutzer = (z: Zeile): Benutzer | null => {
  const rolle = rolleAusName(z.rolle);
  return rolle ? { id: z.id, name: `${z.vorname} ${z.name}`, rolle, rolleName: z.rolle } : null;
};

export async function anmelden(emailRoh: unknown, passwortRoh: unknown): Promise<Benutzer> {
  const email = String(emailRoh ?? '').trim().toLowerCase();
  const passwort = String(passwortRoh ?? '');
  if (!email || !passwort) throw new AppError('Bitte E-Mail und Passwort eingeben.');

  const f = fehlversuche.get(email);
  if (f && f.n >= MAX_FEHLER && f.bis > Date.now()) {
    throw new AppError('Zu viele Fehlversuche. Bitte versuche es in 15 Minuten erneut.', 429);
  }

  const [m] = await q<Zeile>(pool, `${BENUTZER_SQL} WHERE LOWER(m.email) = ? AND m.aktiv = TRUE`, [email]);
  const ok = pruefePasswort(passwort, m?.passwort ?? DUMMY_HASH) && !!m;
  if (!ok) {
    const jetzt = Date.now();
    const alt = f && f.bis > jetzt ? f : { n: 0, bis: 0 };
    fehlversuche.set(email, { n: alt.n + 1, bis: jetzt + SPERRE_MS });
    throw new AppError('E-Mail oder Passwort ist falsch.', 401);
  }
  const benutzer = alsBenutzer(m);
  if (!benutzer) throw new AppError('Für deine Rolle ist kein Zugriff eingerichtet.', 403);
  fehlversuche.delete(email);
  return benutzer;
}

/** Aktuellen Benutzer anhand der Mitarbeiter-ID laden (nur aktive Mitarbeiter). */
export async function benutzerLaden(id: number): Promise<Benutzer | null> {
  const [m] = await q<Zeile>(pool, `${BENUTZER_SQL} WHERE m.ID = ? AND m.aktiv = TRUE`, [id]);
  return m ? alsBenutzer(m) : null;
}
