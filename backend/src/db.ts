import mysql, { Pool, PoolConnection, ResultSetHeader } from "mysql2/promise";
import { config } from "./config";

export const pool: Pool = mysql.createPool({
  ...config.db,
  charset: "utf8mb4",
  decimalNumbers: true, // DECIMAL-Spalten als Zahl statt als String liefern
  connectionLimit: 10,
});

export type Db = Pool | PoolConnection;

/** SELECT: liefert die Zeilen typisiert zurück. */
export async function q<T>(db: Db, sql: string, params: unknown[] = []): Promise<T[]> {
  const [rows] = await db.query(sql, params);
  return rows as unknown as T[];
}

/** INSERT / UPDATE / DELETE. */
export async function run(db: Db, sql: string, params: unknown[] = []): Promise<ResultSetHeader> {
  const [res] = await db.query(sql, params);
  return res as ResultSetHeader;
}

/** Führt fn in einer Transaktion aus (Rollback bei Fehler). */
export async function tx<T>(fn: (c: PoolConnection) => Promise<T>): Promise<T> {
  const c = await pool.getConnection();
  try {
    await c.beginTransaction();
    const ergebnis = await fn(c);
    await c.commit();
    return ergebnis;
  } catch (e) {
    await c.rollback().catch(() => undefined);
    throw e;
  } finally {
    c.release();
  }
}
