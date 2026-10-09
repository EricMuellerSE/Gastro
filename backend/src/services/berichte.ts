import { pool, q } from "../db";
import { Rolle, darf, datumStr, rechnungsnummer, runden } from "../util";

export async function umsatzWoche(rolle: Rolle) {
  darf(rolle, "umsatz");
  const von = new Date();
  von.setHours(0, 0, 0, 0);
  von.setDate(von.getDate() - ((von.getDay() + 6) % 7)); // Montag
  const bis = new Date(von);
  bis.setDate(bis.getDate() + 7);

  const [liste, kostenZeilen] = await Promise.all([
    q<{ zeit: Date; betrag: number; tisch: number | null; mitarbeiter: string | null }>(
      pool,
      `SELECT z.zahlungszeit AS zeit, z.betrag, t.tischnummer AS tisch, CONCAT(m.vorname, ' ', m.name) AS mitarbeiter
       FROM zahlung z
       JOIN bestellung b ON b.ID = z.bestellID
       LEFT JOIN tisch t ON t.ID = b.tischID
       LEFT JOIN mitarbeiter m ON m.ID = b.mitarbeiterID
       WHERE z.status = 'bezahlt' AND z.zahlungszeit >= ? AND z.zahlungszeit < ?
       ORDER BY z.zahlungszeit DESC`,
      [von, bis],
    ),
    q<{ zeit: Date; gesamt: number }>(
      pool,
      "SELECT zeitpunkt AS zeit, ROUND(menge * einzelpreis, 2) AS gesamt FROM nachbestellung WHERE zeitpunkt >= ? AND zeitpunkt < ?",
      [von, bis],
    ),
  ]);

  const tage = [...Array(7)].map((_, i) => {
    const d = new Date(von);
    d.setDate(d.getDate() + i);
    const key = datumStr(d);
    const einnahmen = runden(
      liste.filter((b) => datumStr(b.zeit) === key).reduce((s, b) => s + b.betrag, 0),
    );
    const kosten = runden(
      kostenZeilen.filter((k) => datumStr(k.zeit) === key).reduce((s, k) => s + k.gesamt, 0),
    );
    return { datum: d, einnahmen, kosten, ergebnis: runden(einnahmen - kosten) };
  });
  const einnahmen = runden(tage.reduce((s, t) => s + t.einnahmen, 0));
  const kosten = runden(tage.reduce((s, t) => s + t.kosten, 0));
  const heute = tage.find((t) => datumStr(t.datum) === datumStr(new Date()))!;
  return { von, bis, liste, tage, heute, einnahmen, kosten, ergebnis: runden(einnahmen - kosten) };
}

export async function rechnungen(rolle: Rolle) {
  darf(rolle, "rechnungen");
  const rows = await q<{
    id: number;
    zeit: Date;
    artikel: string;
    grund: string;
    menge: number;
    einheit: string | null;
    einzelpreis: number;
    gesamt: number;
  }>(
    pool,
    `SELECT n.ID AS id, n.zeitpunkt AS zeit, n.artikelname AS artikel, n.grund, n.menge,
            z.mengeneinheit AS einheit, n.einzelpreis, ROUND(n.menge * n.einzelpreis, 2) AS gesamt
     FROM nachbestellung n LEFT JOIN zutat z ON z.ID = n.zutatID
     ORDER BY n.zeitpunkt DESC, n.ID DESC`,
  );
  return rows.map((r) => ({ ...r, nummer: rechnungsnummer(r.id) }));
}
