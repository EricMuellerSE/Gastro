import type { Rolle } from './constants';

/** Angemeldeter Mitarbeiter; rolle = Ansicht, die ihm zusteht (aus der Rolle in der Datenbank) */
export interface Benutzer { id: number; name: string; rolle: Rolle; rolleName: string }

export interface Mitarbeiter { id: number; vorname: string; name: string; email: string; rolleID: number; rolle: string; eintritt: string }
export interface MitarbeiterDaten { mitarbeiter: Mitarbeiter[]; rollen: { id: number; name: string }[] }

export interface LagerZeile {
  zutatID: number; chargenID: number; name: string; einheit: string;
  bestand: number; mindestmenge: number; nachbestellmenge: number; preis: number; mhd: string; eingang: string;
}
export interface Protokoll { id: number; zeit: string; artikel: string; grund: string; menge: number; einheit: string | null; kosten: number }
export interface LagerDaten { zeilen: LagerZeile[]; protokoll: Protokoll[]; einheiten: string[]; letztePruefung: string | null }

export interface Rezept { id: number; getraenk: { name: string; preis: number }; zutaten: { name: string; menge: number; einheit: string }[] }
export interface RezeptDaten { rezepte: Rezept[]; zutaten: { id: number; name: string; einheit: string }[] }

export interface Tisch { id: number; nummer: number; sitzplaetze: number; status: string; bestellt: boolean; serviert: boolean; bezahlt: boolean }

export interface UmsatzTag { datum: string; einnahmen: number; kosten: number; ergebnis: number }
export interface UmsatzDaten {
  von: string; bis: string; einnahmen: number; kosten: number; ergebnis: number;
  heute: UmsatzTag; tage: UmsatzTag[];
  liste: { zeit: string; betrag: number; tisch: number | null; mitarbeiter: string | null }[];
}

export interface Rechnung { id: number; nummer: string; zeit: string; artikel: string; grund: string; menge: number; einheit: string | null; einzelpreis: number; gesamt: number }

export interface BarBestellung {
  id: number; zeit: string; tisch: number | null; mitarbeiter: string | null; status: string;
  positionen: { name: string; menge: number }[];
}
export interface Bestellformular {
  karte: { id: number; name: string; preis: number }[];
  tische: { id: number; nummer: number }[];
  mitarbeiter: { id: number; name: string }[];
}
