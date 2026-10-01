import dotenv from 'dotenv';
import path from 'path';

// backend/.env (funktioniert für src/ und dist/)
dotenv.config({ path: path.resolve(__dirname, '../.env') });

export const config = {
  port: Number(process.env.PORT ?? 3001),
  db: {
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME ?? 'restaurant',
  },
};
