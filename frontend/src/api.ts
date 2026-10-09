import type { Rolle } from "./constants";
import type {
  Benutzer,
  Bestellformular,
  BarBestellung,
  LagerDaten,
  LagerZeile,
  MitarbeiterDaten,
  Rechnung,
  RezeptDaten,
  Tisch,
  UmsatzDaten,
} from "./types";

type Formular = Record<string, string>;
export interface Zeile {
  id: number;
  menge: number;
}

async function anfrage<T>(
  rolle: Rolle | null,
  methode: string,
  pfad: string,
  body?: unknown,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch("/api" + pfad, {
      method: methode,
      headers: { "Content-Type": "application/json", ...(rolle ? { "X-Rolle": rolle } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error("Der Server ist nicht erreichbar.");
  }
  const daten = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(daten.fehler ?? "Die Anfrage ist fehlgeschlagen.");
  return daten as T;
}

const lagerPfad = (z: LagerZeile) => `/lager/${z.zutatID}/${z.chargenID}`;
type Anzahl = { nachbestellungen: number };

export const api = {
  // Anmeldung (Sitzung läuft über ein HttpOnly-Cookie)
  ich: () => anfrage<{ benutzer: Benutzer | null }>(null, "GET", "/auth/ich"),
  login: (email: string, passwort: string) =>
    anfrage<{ benutzer: Benutzer }>(null, "POST", "/auth/login", { email, passwort }),
  logout: () => anfrage<unknown>(null, "POST", "/auth/logout"),

  mitarbeiter: (r: Rolle) => anfrage<MitarbeiterDaten>(r, "GET", "/mitarbeiter"),
  mitarbeiterSpeichern: (r: Rolle, d: Formular, id?: number) =>
    id
      ? anfrage<Anzahl>(r, "PUT", `/mitarbeiter/${id}`, d)
      : anfrage<Anzahl>(r, "POST", "/mitarbeiter", d),
  mitarbeiterLoeschen: (r: Rolle, id: number) => anfrage<Anzahl>(r, "DELETE", `/mitarbeiter/${id}`),

  lager: (r: Rolle) => anfrage<LagerDaten>(r, "GET", "/lager"),
  lagerSpeichern: (r: Rolle, d: Formular, z?: LagerZeile) =>
    z ? anfrage<Anzahl>(r, "PUT", lagerPfad(z), d) : anfrage<Anzahl>(r, "POST", "/lager", d),
  lagerLoeschen: (r: Rolle, z: LagerZeile) => anfrage<Anzahl>(r, "DELETE", lagerPfad(z)),
  nachbestellen: (r: Rolle, z: LagerZeile, anzahl: string) =>
    anfrage<Anzahl>(r, "POST", `${lagerPfad(z)}/nachbestellen`, { anzahl }),

  rezepte: (r: Rolle) => anfrage<RezeptDaten>(r, "GET", "/rezepte"),
  getraenkErstellen: (r: Rolle, d: Formular) => anfrage<unknown>(r, "POST", "/getraenke", d),

  tische: (r: Rolle) => anfrage<Tisch[]>(r, "GET", "/tische"),
  umsatz: (r: Rolle) => anfrage<UmsatzDaten>(r, "GET", "/umsatz"),
  rechnungen: (r: Rolle) => anfrage<Rechnung[]>(r, "GET", "/rechnungen"),

  bar: (r: Rolle) => anfrage<BarBestellung[]>(r, "GET", "/bar"),
  fertig: (r: Rolle, id: number) => anfrage<unknown>(r, "POST", `/bar/${id}/fertig`),

  bestellformular: (r: Rolle) => anfrage<Bestellformular>(r, "GET", "/bestellformular"),
  bestelleAmTisch: (r: Rolle, tisch: number, zeilen: Zeile[]) =>
    anfrage<unknown>(r, "POST", "/bestellungen/tisch", { tisch, zeilen }),
  bestelleEigene: (r: Rolle, mitarbeiter: number, zeilen: Zeile[]) =>
    anfrage<unknown>(r, "POST", "/bestellungen/eigene", { mitarbeiter, zeilen }),
  aufenthaltBeenden: (r: Rolle, tisch: number) =>
    anfrage<{ tisch: number; summe: number; anzahl: number }>(r, "POST", "/aufenthalt/beenden", {
      tisch,
    }),
};
