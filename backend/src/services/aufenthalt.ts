import { q, run, tx } from "../db";
import { AppError, Rolle, darf, runden } from "../util";

export interface AufenthaltErgebnis {
  tisch: number; // Tischnummer
  summe: number; // bezahlter Gesamtbetrag
  anzahl: number; // Anzahl der bezahlten Bestellungen
}

/**
 * Aufenthalt beenden (Kundenansicht):
 *  1. nur möglich, wenn der Tisch aktuell besetzt ist,
 *  2. alle noch nicht bezahlten Bestellungen des Tisches werden als bezahlt gebucht (mit Zahlungszeitpunkt),
 *  3. der Tisch wird freigegeben (Status „frei“).
 * Der Umsatz (Tag/Woche) liest die Zahlungen direkt aus der Datenbank und enthält den Betrag daher sofort.
 * Alles geschieht in einer Transaktion; die Sperre auf dem Tisch verhindert doppeltes Buchen bei zwei gleichzeitigen Klicks.
 */
export async function beenden(rolle: Rolle, tischNr: number): Promise<AufenthaltErgebnis> {
  darf(rolle, "aufenthalt_beenden");
  if (!Number.isInteger(tischNr)) throw new AppError("Bitte wähle einen Tisch aus.");

  return tx(async (c) => {
    const [tisch] = await q<{ ID: number; status: string }>(
      c,
      "SELECT ID, status FROM tisch WHERE tischnummer = ? FOR UPDATE",
      [tischNr],
    );
    if (!tisch) throw new AppError("Bitte wähle einen Tisch aus.");
    if (tisch.status !== "besetzt") throw new AppError(`Tisch ${tischNr} ist nicht besetzt.`);

    // Betrag je Bestellung aus den Positionen berechnet (Menge × Preis)
    const offen = await q<{ ID: number; betrag: number }>(
      c,
      `SELECT b.ID,
              ROUND(COALESCE((SELECT SUM(p.menge * s.preis) FROM bestellposition p JOIN speise s ON s.ID = p.gerichtID
                              WHERE p.bestellID = b.ID), 0), 2) AS betrag
       FROM bestellung b
       WHERE b.tischID = ?
         AND NOT EXISTS (SELECT 1 FROM zahlung z WHERE z.bestellID = b.ID AND z.status = 'bezahlt')
       FOR UPDATE`,
      [tisch.ID],
    );

    const jetzt = new Date();
    for (const b of offen) {
      await run(
        c,
        "INSERT INTO zahlung (bestellID, zahlungsart, betrag, zahlungszeit, status) VALUES (?,?,?,?,'bezahlt')",
        [b.ID, "Tablet", b.betrag, jetzt],
      );
    }
    await run(c, "UPDATE tisch SET status = 'frei' WHERE ID = ?", [tisch.ID]);

    return {
      tisch: tischNr,
      summe: runden(offen.reduce((s, b) => s + b.betrag, 0)),
      anzahl: offen.length,
    };
  });
}
