import { pool, q, run, tx } from "../db";
import { AppError, Rolle, darf, text, zahlWert } from "../util";

export async function liste(rolle: Rolle) {
  darf(rolle, "rezepte_lesen");
  const [speisen, zeilen, zutaten] = await Promise.all([
    q<{ ID: number; name: string; preis: number }>(
      pool,
      "SELECT ID, name, preis FROM speise ORDER BY ID",
    ),
    q<{ speiseID: number; name: string; menge: number; einheit: string }>(
      pool,
      `SELECT r.speiseID, z.name, r.menge, z.mengeneinheit AS einheit
       FROM rezept r JOIN zutat z ON z.ID = r.zutatID ORDER BY r.speiseID, z.name`,
    ),
    q(pool, "SELECT ID AS id, name, mengeneinheit AS einheit FROM zutat ORDER BY name"),
  ]);
  const rezepte = speisen
    .map((s) => ({
      id: s.ID,
      getraenk: { name: s.name, preis: s.preis },
      zutaten: zeilen
        .filter((z) => z.speiseID === s.ID)
        .map(({ name, menge, einheit }) => ({ name, menge, einheit })),
    }))
    .filter((r) => r.zutaten.length > 0);
  return { rezepte, zutaten };
}

/** Legt ein neues Getränk an – ein Rezept mit mindestens einer Zutat aus dem Lagerbestand ist Pflicht.
 *  Die Einheit wird nie vom Client übernommen, sondern kommt aus zutat.mengeneinheit. */
export async function erstelle(rolle: Rolle, d: Record<string, unknown>): Promise<void> {
  darf(rolle, "getraenke_verwalten");
  const name = text(d.name, "Getränkename");
  const preis = zahlWert(String(d.preis ?? ""), "Verkaufspreis");
  const zutaten = await q<{ ID: number; name: string }>(pool, "SELECT ID, name FROM zutat");
  const gewaehlt = new Map<number, number>();
  for (let i = 1; i <= 3; i++) {
    const zid = d["zutatArtikel" + i];
    if (!zid) continue;
    const z = zutaten.find((x) => x.ID === Number(zid));
    if (!z) throw new AppError("Unbekannte Zutat ausgewählt.");
    const menge = zahlWert(d["zutatMenge" + i], "Menge für " + z.name);
    if (menge <= 0) throw new AppError(`Menge für „${z.name}“ muss größer als 0 sein.`);
    if (gewaehlt.has(z.ID)) throw new AppError(`Die Zutat „${z.name}“ wurde mehrfach gewählt.`);
    gewaehlt.set(z.ID, menge);
  }
  if (!gewaehlt.size)
    throw new AppError(
      "Für ein neues Getränk muss mindestens eine Zutat aus dem Lagerbestand als Rezept angegeben werden.",
    );
  await tx(async (c) => {
    const s = await run(c, "INSERT INTO speise (name, preis) VALUES (?,?)", [name, preis]);
    for (const [zutatID, menge] of gewaehlt) {
      await run(c, "INSERT INTO rezept (zutatID, speiseID, menge) VALUES (?,?,?)", [
        zutatID,
        s.insertId,
        menge,
      ]);
    }
  });
}
