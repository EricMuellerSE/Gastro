import dotenv from 'dotenv';
import { randomBytes } from 'crypto';
import path from 'path';

// backend/.env (funktioniert für src/ und dist/)
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const produktion = process.env.NODE_ENV === 'production';
if (produktion && !process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET muss in backend/.env gesetzt sein (lange, zufällige Zeichenfolge).');
}

export const config = {
  port: Number(process.env.PORT ?? 3001),
  // Ohne SESSION_SECRET wird bei jedem Start ein neues Geheimnis erzeugt (Entwicklung): Anmeldungen gelten dann nur bis zum Neustart.
  sessionSecret: process.env.SESSION_SECRET || randomBytes(32).toString('hex'),
  cookieSecure: process.env.COOKIE_SECURE === 'true', // bei HTTPS auf true setzen
  db: {
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME ?? 'restaurant',
  },
};
