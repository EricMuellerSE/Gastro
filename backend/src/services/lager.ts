import { PoolConnection } from "mysql2/promise";
import { Db, pool, q, run, tx } from "../db";
import {
  AppError,
  Rolle,
  addTage,
  darf,
  datumWert,
  heuteStr,
  tageZwischen,
  text,
  zahlWert,
} from "../util";

/*
 * Ein „Artikel“ der Oberfläche entspricht einer Lagerposition (Zutat + Charge).
 *  - Name, Einheit, Einkaufspreis, Nachbestellmenge  -> zutat
 *  - Bestand, Mindestmenge                           -> lager
 *  - Haltbar bis                                     -> charge
 */
export interface LagerZeile {
  zutatID: number;
  chargenID: number;
  name: string;
  einheit: string;
  bestand: number;
  mindestmenge: number;
  nachbestellmenge: number;
  preis: number;
  mhd: string;
  eingang: string;
}

interface ZutatRow {
  ID: number;
  name: string;
  einkaufspreis: number;
  nachbestellmenge: number;
}
interface PosRow {
  chargenID: number;
  bestand: number;
  mindest: number;
  mhd: string;
  eingang: string;
}

const ZEILEN_SQL = `
  SELECT l.zutatID, l.chargenID, z.name, z.mengeneinheit AS einheit,
         l.lagerbestand AS bestand, l.mindestlagerbestand AS mindestmenge,
         z.nachbestellmenge, z.einkaufspreis AS preis,
         DATE_FORMAT(c.mindesthalbarkeit, '%Y-%m-%d') AS mhd,
         DATE_FORMAT(c.eingangsdatum, '%Y-%m-%d') AS eingang
  FROM lager l
  JOIN zutat z ON z.ID = l.zutatID
  JOIN charge c ON c.ID = l.chargenID`;

let letztePruefung: Date | null = null;
let einheitenCache: string[] | null = null;

/** Erlaubte Einheiten – werden aus der Spaltendefinition der Datenbank gelesen. */
export async function einheiten(): Promise<string[]> {
  if (einheitenCache) return einheitenCache;
  const rows = await q<{ t: string }>(
    pool,
    `SELECT COLUMN_TYPE AS t FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'zutat' AND COLUMN_NAME = 'mengeneinheit'`,
  );
  einheitenCache = [...(rows[0]?.t ?? "").matchAll(/'([^']+)'/g)].map((m) => m[1]);
  return einheitenCache;
}

export async function liste(rolle: Rolle) {
  darf(rolle, "artikel_lesen");
  const [zeilen, protokoll] = await Promise.all([
    q<LagerZeile>(pool, `${ZEILEN_SQL} ORDER BY z.name, c.mindesthalbarkeit, l.chargenID`),
    q(
      pool,
      `SELECT n.ID AS id, n.zeitpunkt AS zeit, n.artikelname AS artikel, n.grund, n.menge,
              z.mengeneinheit AS einheit, ROUND(n.menge * n.einzelpreis, 2) AS kosten
       FROM nachbestellung n LEFT JOIN zutat z ON z.ID = n.zutatID
       ORDER BY n.zeitpunkt DESC, n.ID DESC`,
    ),
  ]);
  return { zeilen, protokoll, einheiten: await einheiten(), letztePruefung };
}

/** Lagerbewegung buchen (mitarbeiterID = null: automatisch bzw. Tablet). */
export async function bewegung(
  db: Db,
  zutatID: number,
  art: string,
  menge: number,
  bemerkung: string,
  mitarbeiterID: number | null = null,
): Promise<void> {
  await run(
    db,
    "INSERT INTO lagerbewegung (zutatID, mitarbeiterID, bewegungsart, menge, zeitpunkt, bemerkung) VALUES (?,?,?,?,?,?)",
    [zutatID, mitarbeiterID, art, menge, new Date(), bemerkung],
  );
}

/** Neue Charge einbuchen, Nachbestellung/Rechnung schreiben. MHD = Haltbarkeitsdauer der Referenzcharge ab heute. */
async function wareneingang(
  c: PoolConnection,
  z: ZutatRow,
  ref: { eingang: string; mhd: string },
  menge: number,
  grund: string,
  mindest: number,
): Promise<void> {
  const heute = heuteStr();
  const tage = Math.max(1, tageZwischen(ref.eingang, ref.mhd));
  const charge = await run(
    c,
    "INSERT INTO charge (mindesthalbarkeit, restbestand, eingangsdatum) VALUES (?,?,?)",
    [addTage(heute, tage), menge, heute],
  );
  await run(
    c,
    "INSERT INTO lager (zutatID, chargenID, lagerbestand, mindestlagerbestand) VALUES (?,?,?,?)",
    [z.ID, charge.insertId, menge, mindest],
  );
  await run(
    c,
    "INSERT INTO nachbestellung (zutatID, artikelname, zeitpunkt, grund, menge, einzelpreis) VALUES (?,?,?,?,?,?)",
    [z.ID, z.name, new Date(), grund, menge, z.einkaufspreis],
  );
  await bewegung(c, z.ID, "Eingang", menge, `Nachbestellung: ${grund}`);
}

const positionen = (c: Db, zutatID: number) =>
  q<PosRow>(
    c,
    `SELECT l.chargenID, l.lagerbestand AS bestand, l.mindestlagerbestand AS mindest,
            DATE_FORMAT(ch.mindesthalbarkeit, '%Y-%m-%d') AS mhd, DATE_FORMAT(ch.eingangsdatum, '%Y-%m-%d') AS eingang
     FROM lager l JOIN charge ch ON ch.ID = l.chargenID
     WHERE l.zutatID = ? ORDER BY ch.eingangsdatum, l.chargenID FOR UPDATE`,
    [zutatID],
  );

export async function nachbestellen(
  rolle: Rolle,
  zutatID: number,
  chargenID: number,
  anzahlRoh: unknown,
): Promise<number> {
  darf(rolle, "artikel_hinzufuegen");
  const anzahl = zahlWert(anzahlRoh, "Anzahl");
  if (anzahl <= 0) throw new AppError("Anzahl muss größer als 0 sein.");
  await tx(async (c) => {
    const [z] = await q<ZutatRow>(
      c,
      "SELECT ID, name, einkaufspreis, nachbestellmenge FROM zutat WHERE ID = ? FOR UPDATE",
      [zutatID],
    );
    const pos = z ? await positionen(c, zutatID) : [];
    const ref = pos.find((p) => p.chargenID === chargenID);
    if (!z || !ref) throw new AppError("Artikel nicht gefunden.", 404);
    await wareneingang(
      c,
      z,
      ref,
      anzahl,
      "Manuelle Nachbestellung",
      Math.max(...pos.map((p) => p.mindest)),
    );
  });
  return 1;
}

export async function speichere(
  rolle: Rolle,
  d: Record<string, unknown>,
  ids?: { zutatID: number; chargenID: number },
): Promise<number> {
  darf(rolle, ids ? "artikel_bearbeiten" : "artikel_hinzufuegen");
  const a = {
    name: text(d.name, "Artikelname"),
    bestand: zahlWert(d.bestand, "Bestand"),
    mindestmenge: zahlWert(d.mindestmenge, "Mindestmenge"),
    nachbestellmenge: zahlWert(d.nachbestellmenge, "Nachbestellmenge"),
    mhd: datumWert(d.mhd, "Mindesthaltbarkeitsdatum"),
    preis: zahlWert(d.preis, "Einkaufspreis", 4),
  };
  if (a.nachbestellmenge <= a.mindestmenge)
    throw new AppError("Die Nachbestellmenge muss größer als die Mindestmenge sein.");

  if (!ids) {
    // Die Einheit wird nur beim Anlegen festgelegt (aus der Liste der Datenbank) und ist danach fest.
    const einheit = text(d.einheit, "Einheit");
    if (!(await einheiten()).includes(einheit)) throw new AppError("Ungültige Einheit.");
    await tx(async (c) => {
      const z = await run(
        c,
        "INSERT INTO zutat (name, mengeneinheit, einkaufspreis, nachbestellmenge) VALUES (?,?,?,?)",
        [a.name, einheit, a.preis, a.nachbestellmenge],
      );
      const ch = await run(
        c,
        "INSERT INTO charge (mindesthalbarkeit, restbestand, eingangsdatum) VALUES (?,?,?)",
        [a.mhd, a.bestand, heuteStr()],
      );
      await run(
        c,
        "INSERT INTO lager (zutatID, chargenID, lagerbestand, mindestlagerbestand) VALUES (?,?,?,?)",
        [z.insertId, ch.insertId, a.bestand, a.mindestmenge],
      );
      if (a.bestand > 0)
        await bewegung(c, z.insertId, "Eingang", a.bestand, "Erstbestand beim Anlegen");
    });
  } else {
    await tx(async (c) => {
      const [alt] = await q<{ bestand: number }>(
        c,
        "SELECT lagerbestand AS bestand FROM lager WHERE zutatID = ? AND chargenID = ? FOR UPDATE",
        [ids.zutatID, ids.chargenID],
      );
      if (!alt) throw new AppError("Datensatz nicht gefunden.", 404);
      await run(
        c,
        "UPDATE zutat SET name = ?, einkaufspreis = ?, nachbestellmenge = ? WHERE ID = ?",
        [a.name, a.preis, a.nachbestellmenge, ids.zutatID],
      );
      await run(c, "UPDATE lager SET lagerbestand = ? WHERE zutatID = ? AND chargenID = ?", [
        a.bestand,
        ids.zutatID,
        ids.chargenID,
      ]);
      await run(c, "UPDATE lager SET mindestlagerbestand = ? WHERE zutatID = ?", [
        a.mindestmenge,
        ids.zutatID,
      ]); // gilt je Artikel
      await run(c, "UPDATE charge SET mindesthalbarkeit = ?, restbestand = ? WHERE ID = ?", [
        a.mhd,
        a.bestand,
        ids.chargenID,
      ]);
      const diff = Math.round((a.bestand - alt.bestand) * 100) / 100;
      if (diff !== 0) await bewegung(c, ids.zutatID, "Korrektur", diff, "Bestand manuell geändert");
    });
  }
  return pruefeAlle();
}

export async function loesche(rolle: Rolle, zutatID: number, chargenID: number): Promise<number> {
  darf(rolle, "artikel_loeschen");
  await tx(async (c) => {
    const rows = await q<{ chargenID: number }>(
      c,
      "SELECT chargenID FROM lager WHERE zutatID = ? FOR UPDATE",
      [zutatID],
    );
    if (!rows.some((r) => r.chargenID === chargenID))
      throw new AppError("Datensatz nicht gefunden.", 404);
    const letzte = rows.length === 1;
    if (letzte) {
      const [{ n }] = await q<{ n: number }>(
        c,
        "SELECT COUNT(*) AS n FROM rezept WHERE zutatID = ?",
        [zutatID],
      );
      if (n > 0)
        throw new AppError(
          "Der Artikel wird in Rezepten verwendet und kann nicht gelöscht werden.",
        );
    }
    await run(c, "DELETE FROM lager WHERE zutatID = ? AND chargenID = ?", [zutatID, chargenID]);
    await run(c, "DELETE FROM charge WHERE ID = ?", [chargenID]);
    if (letzte) {
      await run(c, "DELETE FROM lagerbewegung WHERE zutatID = ?", [zutatID]);
      await run(c, "DELETE FROM zutat WHERE ID = ?", [zutatID]); // Nachbestellungen bleiben (zutatID -> NULL)
    }
  });
  return 0;
}

/* ---------- Automatische Überwachung: Mindesthaltbarkeitsdatum und Mindestbestand ---------- */
async function pruefeZutat(c: PoolConnection, zutatID: number, heute: string): Promise<number> {
  const [z] = await q<ZutatRow>(
    c,
    "SELECT ID, name, einkaufspreis, nachbestellmenge FROM zutat WHERE ID = ? FOR UPDATE",
    [zutatID],
  );
  if (!z || z.nachbestellmenge <= 0) return 0;
  const pos = await positionen(c, zutatID);
  if (!pos.length) return 0;

  const mindest = Math.max(...pos.map((p) => p.mindest));
  const neueste = pos[pos.length - 1]; // zuletzt eingegangene Charge dient als Referenz für die Haltbarkeit
  let n = 0;

  // 1) Abgelaufene Chargen ausbuchen (Schwund) und nachbestellen
  const abgelaufen = pos.filter((p) => p.mhd <= heute && p.bestand > 0);
  for (const p of abgelaufen) {
    await run(c, "UPDATE lager SET lagerbestand = 0 WHERE zutatID = ? AND chargenID = ?", [
      zutatID,
      p.chargenID,
    ]);
    await run(c, "UPDATE charge SET restbestand = 0 WHERE ID = ?", [p.chargenID]);
    await bewegung(
      c,
      zutatID,
      "Schwund",
      p.bestand,
      `Charge ${p.chargenID}: Mindesthaltbarkeitsdatum erreicht`,
    );
    p.bestand = 0;
  }
  let gesamt = pos.reduce((s, p) => s + p.bestand, 0);
  if (abgelaufen.length) {
    await wareneingang(
      c,
      z,
      neueste,
      z.nachbestellmenge,
      "Mindesthaltbarkeitsdatum erreicht",
      mindest,
    );
    gesamt += z.nachbestellmenge;
    n++;
  }

  // 2) Mindestmenge (Summe über alle Chargen) erreicht?
  if (gesamt <= mindest) {
    await wareneingang(c, z, neueste, z.nachbestellmenge, "Mindestmenge erreicht", mindest);
    n++;
  }
  return n;
}

export async function pruefeAlle(): Promise<number> {
  const heute = heuteStr();
  const kandidaten = await q<{ ID: number }>(
    pool,
    `SELECT z.ID FROM zutat z
     JOIN lager l ON l.zutatID = z.ID
     JOIN charge c ON c.ID = l.chargenID
     WHERE z.nachbestellmenge > 0
     GROUP BY z.ID
     HAVING SUM(l.lagerbestand) <= MAX(l.mindestlagerbestand)
         OR SUM(CASE WHEN c.mindesthalbarkeit <= ? AND l.lagerbestand > 0 THEN 1 ELSE 0 END) > 0`,
    [heute],
  );
  let anzahl = 0;
  for (const { ID } of kandidaten) anzahl += await tx((c) => pruefeZutat(c, ID, heute));
  letztePruefung = new Date();
  return anzahl;
}
