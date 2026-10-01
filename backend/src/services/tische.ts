import { pool, q } from '../db';
import { Rolle, darf } from '../util';

interface TischRow { id: number; nummer: number; sitzplaetze: number; status: string }

export async function liste(rolle: Rolle) {
  darf(rolle, 'tische');
  const heuteBeginn = new Date();
  heuteBeginn.setHours(0, 0, 0, 0);
  const tische = await q<TischRow>(pool, 'SELECT ID AS id, tischnummer AS nummer, sitzplaetze, status FROM tisch ORDER BY tischnummer');
  // „aktuell“ = nicht vor heute bezahlt
  const bestellungen = await q<{ tischID: number; status: string; bezahlt: number; alt: number }>(
    pool,
    `SELECT b.tischID, b.status,
            EXISTS (SELECT 1 FROM zahlung z WHERE z.bestellID = b.ID AND z.status = 'bezahlt') AS bezahlt,
            EXISTS (SELECT 1 FROM zahlung z WHERE z.bestellID = b.ID AND z.status = 'bezahlt' AND z.zahlungszeit < ?) AS alt
     FROM bestellung b WHERE b.tischID IS NOT NULL`,
    [heuteBeginn],
  );
  return tische.map((t) => {
    const o = bestellungen.filter((b) => b.tischID === t.id && !b.alt);
    return {
      ...t,
      bestellt: o.length > 0,
      serviert: o.length > 0 && o.every((b) => b.status === 'fertig'),
      bezahlt: o.length > 0 && o.every((b) => b.bezahlt === 1),
    };
  });
}
