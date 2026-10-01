/* Legt die Datenbank neu an (ACHTUNG: löscht die bestehende Datenbank) und spielt Schema + Testdaten ein.
 * Aufruf: npm run db:init            (mit Testdaten)
 *         npm run db:init -- --leer  (nur Schema)                                                      */
import fs from 'fs';
import mysql from 'mysql2/promise';
import path from 'path';
import { config } from '../config';

async function main() {
  const { database, ...verbindung } = config.db;
  const conn = await mysql.createConnection({ ...verbindung, charset: 'utf8mb4', multipleStatements: true });
  const dateien = ['schema.sql', ...(process.argv.includes('--leer') ? [] : ['seed.sql'])];
  await conn.query(`DROP DATABASE IF EXISTS \`${database}\``);
  await conn.query(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await conn.query(`USE \`${database}\``);
  for (const datei of dateien) {
    await conn.query(fs.readFileSync(path.resolve(__dirname, '../../../database', datei), 'utf8'));
    console.log(`${datei} eingespielt.`);
  }
  await conn.end();
  console.log(`Datenbank "${database}" ist bereit.`);
}

main().catch((e) => {
  console.error('Fehler:', e.message);
  process.exit(1);
});
