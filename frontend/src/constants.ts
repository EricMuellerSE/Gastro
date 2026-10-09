export const ROLLEN = {
  admin: "Admin",
  barkeeper: "Barkeeper",
  lager: "Lager / Bediener",
  kunde: "Kunde (Tablet)",
} as const;
export type Rolle = keyof typeof ROLLEN;
export const istRolle = (v: string): v is Rolle => v in ROLLEN;

/** Reiter je Rolle: [Pfadname, Beschriftung] – wie in der Vorlage */
export const TABS: Record<Rolle, [string, string][]> = {
  admin: [
    ["mitarbeiter", "Mitarbeiter"],
    ["lager", "Lager"],
    ["rezepte", "Rezepte"],
    ["tische", "Tische"],
    ["umsatz", "Umsatz"],
    ["eigene", "Eigene Bestellung"],
    ["rechnungen", "Rechnungen"],
  ],
  barkeeper: [
    ["bar", "Getränkebestellungen"],
    ["rezepte", "Rezepte"],
    ["eigene", "Eigene Bestellung"],
  ],
  lager: [
    ["bestand", "Lagerbestand"],
    ["eigene", "Eigene Bestellung"],
  ],
  kunde: [["tablett", "Bestellung am Tablet"]],
};
