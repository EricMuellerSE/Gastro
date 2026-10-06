import { NextFunction, Request, Response, Router } from 'express';
import { AppError, Rolle, idWert, istRolle } from './util';
import * as mitarbeiter from './services/mitarbeiter';
import * as lager from './services/lager';
import * as rezepte from './services/rezepte';
import * as tische from './services/tische';
import * as berichte from './services/berichte';
import * as bestellungen from './services/bestellungen';
import * as auth from './services/auth';
import { erzeugeToken, loescheCookie, pruefeToken, setzeCookie, tokenAusRequest } from './session';

export const api = Router();

/* ---------- Anmeldung (öffentlich) ---------- */
api.post('/auth/login', async (req, res, next) => {
  try {
    const benutzer = await auth.anmelden(req.body?.email, req.body?.passwort);
    setzeCookie(res, erzeugeToken(benutzer.id));
    res.json({ benutzer });
  } catch (e) {
    next(e);
  }
});
api.post('/auth/logout', (_req, res) => {
  loescheCookie(res);
  res.json({ ok: true });
});
api.get('/auth/ich', async (req, res, next) => {
  try {
    const id = pruefeToken(tokenAusRequest(req));
    res.json({ benutzer: id ? await auth.benutzerLaden(id) : null });
  } catch (e) {
    next(e);
  }
});

/*
 * Rollenprüfung für alle übrigen Endpunkte: Der Header "X-Rolle" nennt die Ansicht, in der die Anfrage gestellt wird.
 *  - "kunde" (Tablet) ist ohne Anmeldung erlaubt.
 *  - Jede andere Rolle ist nur erlaubt, wenn der angemeldete Mitarbeiter genau diese Rolle hat.
 * Die einzelnen Funktionen prüfen anschließend ihre Rechte zusätzlich in der Anwendungslogik.
 */
api.use(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const gewuenscht = req.header('x-rolle');
    if (!istRolle(gewuenscht)) throw new AppError('Unbekannte oder fehlende Rolle.', 400);
    if (gewuenscht !== 'kunde') {
      const id = pruefeToken(tokenAusRequest(req));
      const benutzer = id ? await auth.benutzerLaden(id) : null;
      if (!benutzer) throw new AppError('Bitte melde dich an.', 401);
      if (benutzer.rolle !== gewuenscht) throw new AppError('Keine Berechtigung für diese Rolle.', 403);
    }
    res.locals.rolle = gewuenscht;
    next();
  } catch (e) {
    next(e);
  }
});

type Handler = (req: Request, rolle: Rolle) => Promise<unknown> | unknown;
const h = (fn: Handler) => (req: Request, res: Response, next: NextFunction) =>
  Promise.resolve()
    .then(() => fn(req, res.locals.rolle as Rolle))
    .then((ergebnis) => res.json(ergebnis ?? { ok: true }))
    .catch(next);

const ids = (req: Request) => ({ zutatID: idWert(req.params.zutatID), chargenID: idWert(req.params.chargenID) });
const body = (req: Request) => (req.body ?? {}) as Record<string, unknown>;

// Mitarbeiter
api.get('/mitarbeiter', h((_r, rolle) => mitarbeiter.liste(rolle)));
api.post('/mitarbeiter', h(async (req, rolle) => ({ nachbestellungen: await mitarbeiter.speichere(rolle, body(req)) })));
api.put('/mitarbeiter/:id', h(async (req, rolle) => ({ nachbestellungen: await mitarbeiter.speichere(rolle, body(req), idWert(req.params.id)) })));
api.delete('/mitarbeiter/:id', h(async (req, rolle) => ({ nachbestellungen: await mitarbeiter.loesche(rolle, idWert(req.params.id)) })));

// Lager
api.get('/lager', h((_r, rolle) => lager.liste(rolle)));
api.post('/lager', h(async (req, rolle) => ({ nachbestellungen: await lager.speichere(rolle, body(req)) })));
api.put('/lager/:zutatID/:chargenID', h(async (req, rolle) => ({ nachbestellungen: await lager.speichere(rolle, body(req), ids(req)) })));
api.delete('/lager/:zutatID/:chargenID', h(async (req, rolle) => {
  const { zutatID, chargenID } = ids(req);
  return { nachbestellungen: await lager.loesche(rolle, zutatID, chargenID) };
}));
api.post('/lager/:zutatID/:chargenID/nachbestellen', h(async (req, rolle) => {
  const { zutatID, chargenID } = ids(req);
  return { nachbestellungen: await lager.nachbestellen(rolle, zutatID, chargenID, body(req).anzahl) };
}));

// Rezepte / Getränke
api.get('/rezepte', h((_r, rolle) => rezepte.liste(rolle)));
api.post('/getraenke', h(async (req, rolle) => { await rezepte.erstelle(rolle, body(req)); }));

// Auswertungen
api.get('/tische', h((_r, rolle) => tische.liste(rolle)));
api.get('/umsatz', h((_r, rolle) => berichte.umsatzWoche(rolle)));
api.get('/rechnungen', h((_r, rolle) => berichte.rechnungen(rolle)));

// Bar
api.get('/bar', h((_r, rolle) => bestellungen.barListe(rolle)));
api.post('/bar/:id/fertig', h(async (req, rolle) => { await bestellungen.setzeFertig(rolle, idWert(req.params.id)); }));

// Bestellungen
api.get('/bestellformular', h((_r, rolle) => bestellungen.formular(rolle)));
api.post('/bestellungen/tisch', h(async (req, rolle) => {
  await bestellungen.bestelleAmTisch(rolle, Number(body(req).tisch), body(req).zeilen);
}));
api.post('/bestellungen/eigene', h(async (req, rolle) => {
  await bestellungen.bestelleEigene(rolle, Number(body(req).mitarbeiter), body(req).zeilen);
}));
