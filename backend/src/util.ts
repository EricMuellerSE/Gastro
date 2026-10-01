/* Rollen, Rechte und Validierung – entspricht der Anwendungslogik der Vorlage */

export class AppError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export const ROLLEN = {
  admin: 'Admin',
  barkeeper: 'Barkeeper',
  lager: 'Lager / Bediener',
  kunde: 'Kunde (Tablet)',
} as const;
export type Rolle = keyof typeof ROLLEN;
export const istRolle = (v: unknown): v is Rolle => typeof v === 'string' && v in ROLLEN;

export const RECHTE: Record<Rolle, string[]> = {
  admin: ['mitarbeiter', 'artikel_lesen', 'artikel_hinzufuegen', 'artikel_bearbeiten', 'artikel_loeschen', 'tische', 'umsatz', 'eigene_bestellung', 'rechnungen', 'rezepte_lesen', 'getraenke_verwalten'],
  kunde: ['kunde_bestellen'],
  barkeeper: ['bar_lesen', 'bar_status', 'eigene_bestellung', 'rezepte_lesen', 'getraenke_verwalten'],
  lager: ['artikel_lesen', 'artikel_hinzufuegen', 'artikel_loeschen', 'eigene_bestellung'],
};

export function darf(rolle: Rolle, recht: string): void {
  if (!RECHTE[rolle].includes(recht)) {
    throw new AppError(`Keine Berechtigung: ${ROLLEN[rolle]} darf diese Funktion nicht ausführen.`, 403);
  }
}

/* ---------- Validierung ---------- */
export const text = (v: unknown, name: string): string => {
  const s = String(v ?? '').trim();
  if (!s) throw new AppError(`${name} darf nicht leer sein.`);
  return s;
};

/** Zahl ab 0 mit höchstens `stellen` Nachkommastellen (Komma oder Punkt). */
export const zahlWert = (v: unknown, name: string, stellen = 2): number => {
  const s = String(v ?? '').trim().replace(',', '.');
  const n = Number(s);
  if (s === '' || !Number.isFinite(n) || n < 0) throw new AppError(`${name} muss eine Zahl ab 0 sein.`);
  const f = 10 ** stellen;
  return Math.round(n * f) / f;
};

export const runden = (n: number, stellen = 2): number => {
  const f = 10 ** stellen;
  return Math.round(n * f) / f;
};

export const datumWert = (v: unknown, name: string): string => {
  const s = String(v ?? '').trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  const d = m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null;
  if (!m || !d || d.getUTCMonth() !== +m[2] - 1) throw new AppError(`${name} ist kein gültiges Datum.`);
  return s;
};

export const idWert = (v: unknown): number => {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1) throw new AppError('Ungültige ID.');
  return n;
};

/* ---------- Datum ---------- */
const pad = (n: number) => String(n).padStart(2, '0');
export const datumStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const heuteStr = () => datumStr(new Date());

const utc = (s: string) => {
  const [j, m, t] = s.split('-').map(Number);
  return Date.UTC(j, m - 1, t);
};
export const tageZwischen = (von: string, bis: string) => Math.round((utc(bis) - utc(von)) / 86400000);
export const addTage = (s: string, n: number) => new Date(utc(s) + n * 86400000).toISOString().slice(0, 10);

export const rechnungsnummer = (id: number) => 'R-' + String(id).padStart(4, '0');
