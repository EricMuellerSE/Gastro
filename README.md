# Restaurantverwaltung

Umsetzung der vorgegebenen HTML-Oberfläche mit **Node.js + TypeScript (Express)** als Backend,
**MySQL/MariaDB** als Datenbank und **React + TanStack Router** im Frontend.
Aussehen (CSS) und Funktionen der Vorlage sind übernommen.

## Voraussetzungen

- Node.js 20 oder neuer
- MySQL 8 oder MariaDB 10.5+ (lokal laufend)

## Start

```bash
npm install
cp backend/.env.example backend/.env     # DB_USER / DB_PASSWORD anpassen
npm run db:init                          # Datenbank anlegen + Testdaten (löscht die DB "restaurant"!)
npm run dev                              # API: http://localhost:3001, Oberfläche: http://localhost:5173
```

Nur Schema ohne Testdaten: `npm run db:init -- --leer`

Produktion: `npm run build && npm start` – das Backend liefert dann auch die Oberfläche aus (http://localhost:3001).

## Aufbau

```
database/schema.sql       Tabellen (Diagramm + markierte Ergänzungen)
database/seed.sql         Testdaten (nur Getränke, Zutaten nur für die Bar)
backend/src/services/     Anwendungslogik je Bereich (Lager, Bestellungen, Mitarbeiter, ...)
backend/src/routes.ts     REST-API unter /api
frontend/src/router.tsx   TanStack Router: /:rolle/:reiter, Loader laden die Daten je Ansicht
frontend/src/views/       eine Komponente je Ansicht der Vorlage
```

Adressen der Oberfläche: `/admin/lager`, `/barkeeper/bar`, `/lager/bestand`, `/kunde/tablett` usw.

## Einheiten

Die Einheit einer Zutat steht in `zutat.mengeneinheit` (Datenbank-ENUM). Rezepte, Bestellungen und
Rechnungen übernehmen sie von dort. Im Rezeptformular wird sie nur angezeigt; das Backend ignoriert
Einheiten, die ein Client mitschickt. Nur beim **erstmaligen Anlegen** eines Lagerartikels wird die Einheit
einmalig aus der Liste der Datenbank gewählt; danach ist sie gesperrt.

## Abbildung der Vorlage auf die Datenbank

| Oberfläche | Datenbank |
|---|---|
| Lagerartikel (eine Zeile) | `lager` + `charge` + `zutat` (Zeile = Zutat + Charge) |
| Bestand / Mindestmenge | `lager.lagerbestand` / `lager.mindestlagerbestand` |
| Haltbar bis | `charge.mindesthalbarkeit` |
| Nachbestellmenge, Einkaufspreis (je Einheit) | `zutat.nachbestellmenge`, `zutat.einkaufspreis` (ergänzt) |
| Automatische Nachbestellung | neue Charge + `nachbestellung` (Rechnung/Protokoll) + `lagerbewegung` |
| Bestellung / Menge | `bestellung`, `bestellposition` (Spalte `menge` ergänzt) |
| Eigene Bestellung | `bestellung` mit `mitarbeiterID`, ohne Tisch |
| Tablet-Bestellung | `bestellung` mit `tischID`, ohne Mitarbeiter |
| „bezahlt“, Umsatz | `zahlung` mit Status `bezahlt` |
| Mitarbeiter löschen | `mitarbeiter.aktiv = FALSE` (Bestellungen bleiben erhalten) |

Automatische Überwachung (alle 5 s): Ist die Summe über alle Chargen einer Zutat ≤ Mindestmenge, wird die
Nachbestellmenge als neue Charge eingebucht. Abgelaufene Chargen werden als „Schwund“ ausgebucht und ersetzt.
Beim Bestellen werden Zutaten nach Haltbarkeit (früheste zuerst) aus den Chargen abgebucht.

## Abweichungen von der Vorlage

- **Mitarbeiter:** Die Datenbank kennt Vorname, Name, E-Mail, Eintrittsdatum und Passwort, aber keine
  Handynummer. Das Formular verwendet deshalb diese Felder.
- **Nachbestellmenge:** Zahlenfeld statt Auswahl 5–100, da Mengen jetzt in ml/g/Stück angegeben werden.
- **Tische:** Statt der Gästezahl wird die Anzahl der Sitzplätze angezeigt (`tisch.sitzplaetze`);
  „besetzt“ ergibt sich aus `tisch.status`.
- **Rollen:** Wie in der Vorlage gibt es einen Rollenumschalter, keine Anmeldung. Die gewählte Rolle wird als
  Header `X-Rolle` gesendet und serverseitig geprüft – das ist **keine echte Authentifizierung**.
