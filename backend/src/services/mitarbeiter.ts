import { pool, q, run } from '../db';
import { hashPasswort } from '../passwort';
import { AppError, Rolle, darf, datumWert, idWert, text } from '../util';

export async function liste(rolle: Rolle) {
  darf(rolle, 'mitarbeiter');
  const [mitarbeiter, rollen] = await Promise.all([
    q(
      pool,
      `SELECT m.ID AS id, m.vorname, m.name, m.email, m.rolleID, r.name AS rolle,
              DATE_FORMAT(m.eintrittsdatum, '%Y-%m-%d') AS eintritt
       FROM mitarbeiter m JOIN rolle r ON r.ID = m.rolleID
       WHERE m.aktiv = TRUE ORDER BY m.ID`,
    ),
    q(pool, 'SELECT ID AS id, name FROM rolle ORDER BY ID'),
  ]);
  return { mitarbeiter, rollen };
}

export async function speichere(rolle: Rolle, d: Record<string, unknown>, id?: number): Promise<number> {
  darf(rolle, 'mitarbeiter');
  const rollen = await q<{ ID: number; name: string }>(pool, 'SELECT ID, name FROM rolle');
  const rolleID = Number(d.rolleID);
  if (!rollen.some((r) => r.ID === rolleID)) {
    throw new AppError('Ungültige Rolle. Erlaubt sind: ' + rollen.map((r) => r.name).join(', ') + '.');
  }
  const email = text(d.email, 'E-Mail').toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AppError('Ungültige E-Mail-Adresse.');
  const m = {
    vorname: text(d.vorname, 'Vorname'),
    name: text(d.name, 'Name'),
    email,
    rolleID,
    eintritt: datumWert(d.eintritt, 'Eintrittsdatum'),
  };
  const pw = String(d.passwort ?? '');
  if ((!id || pw) && pw.length < 8) throw new AppError('Das Passwort muss mindestens 8 Zeichen lang sein.');

  try {
    if (id) {
      const res = await run(
        pool,
        `UPDATE mitarbeiter SET vorname = ?, name = ?, email = ?, rolleID = ?, eintrittsdatum = ?
         ${pw ? ', passwort = ?' : ''} WHERE ID = ? AND aktiv = TRUE`,
        [m.vorname, m.name, m.email, m.rolleID, m.eintritt, ...(pw ? [hashPasswort(pw)] : []), id],
      );
      if (!res.affectedRows) throw new AppError('Datensatz nicht gefunden.', 404);
    } else {
      await run(
        pool,
        'INSERT INTO mitarbeiter (rolleID, vorname, name, email, passwort, eintrittsdatum, aktiv) VALUES (?,?,?,?,?,?,TRUE)',
        [m.rolleID, m.vorname, m.name, m.email, hashPasswort(pw), m.eintritt],
      );
    }
  } catch (e) {
    if ((e as { code?: string }).code === 'ER_DUP_ENTRY') throw new AppError('Diese E-Mail-Adresse wird bereits verwendet.');
    throw e;
  }
  return 0;
}

/** Mitarbeiter werden deaktiviert (aktiv = FALSE), damit Bestellungen und Lagerbuchungen erhalten bleiben. */
export async function loesche(rolle: Rolle, id: number): Promise<number> {
  darf(rolle, 'mitarbeiter');
  const res = await run(pool, 'UPDATE mitarbeiter SET aktiv = FALSE WHERE ID = ? AND aktiv = TRUE', [idWert(id)]);
  if (!res.affectedRows) throw new AppError('Datensatz nicht gefunden.', 404);
  return 0;
}
