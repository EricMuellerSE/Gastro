import { createHmac, timingSafeEqual } from "crypto";
import { Request, Response } from "express";
import { config } from "./config";

/* Sitzung = signiertes Token im HttpOnly-Cookie. Es enthält nur die Mitarbeiter-ID und das Ablaufdatum;
 * Rolle und Aktiv-Status werden bei jeder Anfrage aus der Datenbank gelesen. */
const COOKIE = "restaurant_session";
const DAUER_MS = 8 * 60 * 60 * 1000; // 8 Stunden

const signiere = (daten: string) =>
  createHmac("sha256", config.sessionSecret).update(daten).digest("base64url");

export function erzeugeToken(mitarbeiterID: number): string {
  const daten = Buffer.from(
    JSON.stringify({ m: mitarbeiterID, e: Date.now() + DAUER_MS }),
  ).toString("base64url");
  return `${daten}.${signiere(daten)}`;
}

/** Liefert die Mitarbeiter-ID, wenn das Token echt und nicht abgelaufen ist, sonst null. */
export function pruefeToken(token: string | undefined): number | null {
  if (!token) return null;
  const [daten, sig] = token.split(".");
  if (!daten || !sig) return null;
  const soll = Buffer.from(signiere(daten));
  const ist = Buffer.from(sig);
  if (soll.length !== ist.length || !timingSafeEqual(soll, ist)) return null;
  try {
    const { m, e } = JSON.parse(Buffer.from(daten, "base64url").toString());
    return Number.isInteger(m) && e > Date.now() ? m : null;
  } catch {
    return null;
  }
}

export function tokenAusRequest(req: Request): string | undefined {
  for (const teil of (req.headers.cookie ?? "").split(";")) {
    const [name, ...wert] = teil.trim().split("=");
    if (name === COOKIE) return wert.join("=");
  }
  return undefined;
}

export const setzeCookie = (res: Response, token: string) =>
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: config.cookieSecure,
    maxAge: DAUER_MS,
    path: "/",
  });

export const loescheCookie = (res: Response) => res.clearCookie(COOKIE, { path: "/" });
