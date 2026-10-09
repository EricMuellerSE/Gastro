import express, { NextFunction, Request, Response } from "express";
import fs from "fs";
import path from "path";
import { config } from "./config";
import { AppError } from "./util";
import { api } from "./routes";
import { pruefeAlle } from "./services/lager";

const app = express();
app.use(express.json());
app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api", api);
app.use("/api", (_req, res) => res.status(404).json({ fehler: "Unbekannter Endpunkt." }));

// Produktion: gebautes Frontend (frontend/dist) ausliefern, inkl. Fallback für den Client-Router
const dist = path.resolve(__dirname, "../../frontend/dist");
if (fs.existsSync(path.join(dist, "index.html"))) {
  app.use(express.static(dist));
  app.get("*", (_req, res) => res.sendFile(path.join(dist, "index.html")));
}

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const e = err as { type?: string; code?: string };
  if (err instanceof AppError) return void res.status(err.status).json({ fehler: err.message });
  if (e.type === "entity.parse.failed")
    return void res.status(400).json({ fehler: "Ungültige Anfrage." });
  if (e.code === "ER_DUP_ENTRY")
    return void res.status(400).json({ fehler: "Dieser Eintrag existiert bereits." });
  if (e.code === "ER_ROW_IS_REFERENCED_2")
    return void res
      .status(400)
      .json({ fehler: "Der Datensatz wird noch verwendet und kann nicht gelöscht werden." });
  if (e.code === "ECONNREFUSED")
    return void res.status(503).json({ fehler: "Die Datenbank ist nicht erreichbar." });
  console.error(err);
  res.status(500).json({ fehler: "Interner Serverfehler." });
});

app.listen(config.port, () => console.log(`Server läuft auf http://localhost:${config.port}`));

/* Automatische Lagerüberwachung: beim Start und danach alle 5 Sekunden */
let laeuft = false;
async function ueberwache() {
  if (laeuft) return;
  laeuft = true;
  try {
    const n = await pruefeAlle();
    if (n) console.log(`Automatische Nachbestellung ausgelöst (${n}).`);
  } catch (e) {
    console.error("Lagerprüfung fehlgeschlagen:", (e as Error).message);
  } finally {
    laeuft = false;
  }
}
void ueberwache();
setInterval(ueberwache, 5000);
