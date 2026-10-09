import { pool, q, run, tx } from "../db";
import { AppError, RECHTE, Rolle, darf, heuteStr, runden } from "../util";
import { bewegung } from "./lager";

const fmt = (n: number) => n.toLocaleString("de-DE", { maximumFractionDigits: 2 });

/* ---------- Bestellformular (Karte, besetzte Tische, Mitarbeiter) ---------- */
export async function formular(rolle: Rolle) {
  const kunde = RECHTE[rolle].includes("kunde_bestellen");
  if (!kunde) darf(rolle, "eigene_bestellung");
  const karte = await q(pool, "SELECT ID AS id, name, preis FROM speise ORDER BY ID");
  const tische = kunde
    ? await q(
        pool,
        "SELECT ID AS id, tischnummer AS nummer FROM tisch WHERE status = 'besetzt' ORDER BY tischnummer",
      )
    : [];
  const mitarbeiter = RECHTE[rolle].includes("eigene_bestellung")
    ? await q(
        pool,
        "SELECT ID AS id, CONCAT(vorname, ' ', name) AS name FROM mitarbeiter WHERE aktiv = TRUE ORDER BY ID",
      )
    : [];
  return { karte, tische, mitarbeiter };
}

/* ---------- Bestellung anlegen ---------- */
async function anlegen(
  tischID: number | null,
  mitarbeiterID: number | null,
  zeilenRoh: unknown,
): Promise<void> {
  const roh = Array.isArray(zeilenRoh) ? (zeilenRoh as { id?: unknown; menge?: unknown }[]) : [];
  if (!roh.length)
    throw new AppError(
      "Die Bestellung ist leer. Gib bei mindestens einem Artikel eine Menge ab 1 ein.",
    );

  await tx(async (c) => {
    const karte = await q<{ ID: number; name: string; preis: number }>(
      c,
      "SELECT ID, name, preis FROM speise",
    );
    const menge = new Map<number, number>(); // speiseID -> Anzahl
    for (const z of roh) {
      const k = karte.find((x) => x.ID === Number(z.id));
      if (!k) throw new AppError("Unbekannter Artikel.");
      const m = Number(z.menge);
      if (!Number.isInteger(m) || m < 1)
        throw new AppError(`Die Menge für „${k.name}“ muss eine ganze Zahl ab 1 sein.`);
      menge.set(k.ID, (menge.get(k.ID) ?? 0) + m);
    }

    // Zutatenbedarf aus den Rezepten (Einheit je Zutat kommt aus der Datenbank)
    const rezepte = await q<{ speiseID: number; zutatID: number; menge: number }>(
      c,
      "SELECT speiseID, zutatID, menge FROM rezept WHERE speiseID IN (?)",
      [[...menge.keys()]],
    );
    const bedarf = new Map<number, number>();
    for (const r of rezepte)
      bedarf.set(
        r.zutatID,
        runden((bedarf.get(r.zutatID) ?? 0) + r.menge * menge.get(r.speiseID)!),
      );

    // Verfügbare (nicht abgelaufene) Chargen, früheste Haltbarkeit zuerst (FEFO)
    const zutatIDs = [...bedarf.keys()];
    const zutaten = zutatIDs.length
      ? await q<{ ID: number; name: string; einheit: string }>(
          c,
          "SELECT ID, name, mengeneinheit AS einheit FROM zutat WHERE ID IN (?)",
          [zutatIDs],
        )
      : [];
    const chargen = zutatIDs.length
      ? await q<{ zutatID: number; chargenID: number; bestand: number }>(
          c,
          `SELECT l.zutatID, l.chargenID, l.lagerbestand AS bestand
           FROM lager l JOIN charge ch ON ch.ID = l.chargenID
           WHERE l.zutatID IN (?) AND ch.mindesthalbarkeit > ? AND l.lagerbestand > 0
           ORDER BY l.zutatID, ch.mindesthalbarkeit, l.chargenID FOR UPDATE`,
          [zutatIDs, heuteStr()],
        )
      : [];

    const fehlend = zutaten
      .map((z) => {
        const noetig = bedarf.get(z.ID)!;
        const da = runden(
          chargen.filter((x) => x.zutatID === z.ID).reduce((s, x) => s + x.bestand, 0),
        );
        return da < noetig
          ? `${z.name} (benötigt ${fmt(noetig)} ${z.einheit}, vorhanden ${fmt(da)} ${z.einheit})`
          : null;
      })
      .filter(Boolean);
    if (fehlend.length)
      throw new AppError("Nicht genügend Zutaten vorrätig: " + fehlend.join("; ") + ".");

    // Bestellung speichern
    const gesamt = runden(
      [...menge].reduce((s, [id, m]) => s + m * karte.find((k) => k.ID === id)!.preis, 0),
    );
    const b = await run(
      c,
      "INSERT INTO bestellung (mitarbeiterID, tischID, bestellzeit, status, gesamtbetrag) VALUES (?,?,?,'in Bearbeitung',?)",
      [mitarbeiterID, tischID, new Date(), gesamt],
    );
    await run(c, "INSERT INTO bestellposition (bestellID, gerichtID, menge, status) VALUES ?", [
      [...menge].map(([id, m]) => [b.insertId, id, m, "in Bearbeitung"]),
    ]);

    // Zutaten aus den Chargen abbuchen
    for (const [zutatID, noetig] of bedarf) {
      let rest = noetig;
      for (const ch of chargen.filter((x) => x.zutatID === zutatID)) {
        if (rest <= 0) break;
        const nimm = Math.min(ch.bestand, rest);
        const neu = runden(ch.bestand - nimm);
        await run(c, "UPDATE lager SET lagerbestand = ? WHERE zutatID = ? AND chargenID = ?", [
          neu,
          zutatID,
          ch.chargenID,
        ]);
        await run(c, "UPDATE charge SET restbestand = ? WHERE ID = ?", [neu, ch.chargenID]);
        rest = runden(rest - nimm);
      }
      await bewegung(c, zutatID, "Verbrauch", noetig, `Bestellung ${b.insertId}`, mitarbeiterID);
    }
  });
}

/** Kunde bestellt am Tablet seines Tisches. */
export async function bestelleAmTisch(
  rolle: Rolle,
  tischNr: number,
  zeilen: unknown,
): Promise<void> {
  darf(rolle, "kunde_bestellen");
  const [tisch] = await q<{ ID: number; status: string }>(
    pool,
    "SELECT ID, status FROM tisch WHERE tischnummer = ?",
    [tischNr],
  );
  if (!tisch) throw new AppError("Bitte wähle die Tischnummer dieses Tablets aus.");
  if (tisch.status !== "besetzt") throw new AppError(`Tisch ${tischNr} ist nicht besetzt.`);
  await anlegen(tisch.ID, null, zeilen);
}

/** Mitarbeiter bestellt für sich selbst. */
export async function bestelleEigene(
  rolle: Rolle,
  mitarbeiterID: number,
  zeilen: unknown,
): Promise<void> {
  darf(rolle, "eigene_bestellung");
  const [m] = await q(pool, "SELECT ID FROM mitarbeiter WHERE ID = ? AND aktiv = TRUE", [
    mitarbeiterID,
  ]);
  if (!m) throw new AppError("Bitte wähle einen Mitarbeiter aus.");
  await anlegen(null, mitarbeiterID, zeilen);
}

/* ---------- Bar ---------- */
export async function barListe(rolle: Rolle) {
  darf(rolle, "bar_lesen");
  const [bestellungen, pos] = await Promise.all([
    q<{ id: number; zeit: Date; tisch: number | null; mitarbeiter: string | null; status: string }>(
      pool,
      `SELECT b.ID AS id, b.bestellzeit AS zeit, t.tischnummer AS tisch,
              CONCAT(m.vorname, ' ', m.name) AS mitarbeiter, b.status
       FROM bestellung b
       LEFT JOIN tisch t ON t.ID = b.tischID
       LEFT JOIN mitarbeiter m ON m.ID = b.mitarbeiterID
       ORDER BY b.ID`,
    ),
    q<{ bestellID: number; name: string; menge: number }>(
      pool,
      `SELECT p.bestellID, s.name, p.menge FROM bestellposition p JOIN speise s ON s.ID = p.gerichtID ORDER BY p.bestellID, s.name`,
    ),
  ]);
  return bestellungen.map((b) => ({
    ...b,
    positionen: pos.filter((p) => p.bestellID === b.id).map(({ name, menge }) => ({ name, menge })),
  }));
}

export async function setzeFertig(rolle: Rolle, id: number): Promise<void> {
  darf(rolle, "bar_status");
  await tx(async (c) => {
    const [b] = await q<{ status: string }>(
      c,
      "SELECT status FROM bestellung WHERE ID = ? FOR UPDATE",
      [id],
    );
    if (!b) throw new AppError("Getränkebestellung nicht gefunden.", 404);
    if (b.status !== "in Bearbeitung")
      throw new AppError("Nur Bestellungen „in Bearbeitung“ können auf „fertig“ gesetzt werden.");
    await run(c, "UPDATE bestellung SET status = 'fertig' WHERE ID = ?", [id]);
    await run(c, "UPDATE bestellposition SET status = 'fertig' WHERE bestellID = ?", [id]);
  });
}
