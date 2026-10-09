import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

/** Format: scrypt$<Salt hex>$<Hash hex> */
export const hashPasswort = (pw: string): string => {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString("hex")}$${scryptSync(pw, salt, 64).toString("hex")}`;
};

export function pruefePasswort(pw: string, gespeichert: string): boolean {
  const [art, salt, hash] = gespeichert.split("$");
  if (art !== "scrypt" || !salt || !hash) return false;
  const soll = Buffer.from(hash, "hex");
  const ist = scryptSync(pw, Buffer.from(salt, "hex"), soll.length);
  return soll.length === ist.length && timingSafeEqual(soll, ist);
}
