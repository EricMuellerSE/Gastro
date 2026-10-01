-- =====================================================
-- Restaurantverwaltung – Datenbankschema (MySQL 8 / MariaDB 10.5+)
-- Basis: relationales Datenbankmodell aus dem Diagramm.
-- Änderungen gegenüber dem Diagramm sind mit "ERGÄNZT" markiert.
-- Die Datenbank selbst wird von `npm run db:init` angelegt.
-- =====================================================

-- Mitarbeiter-Bereich
CREATE TABLE rolle (
    ID           INT AUTO_INCREMENT PRIMARY KEY,
    name         VARCHAR(50)  NOT NULL UNIQUE,
    beschreibung VARCHAR(255)
);

CREATE TABLE mitarbeiter (
    ID             INT AUTO_INCREMENT PRIMARY KEY,
    rolleID        INT          NOT NULL,
    vorname        VARCHAR(50)  NOT NULL,
    name           VARCHAR(50)  NOT NULL,
    email          VARCHAR(100) NOT NULL UNIQUE,
    passwort       VARCHAR(255) NOT NULL,   -- Passwort-Hash, kein Klartext
    eintrittsdatum DATE         NOT NULL,
    aktiv          BOOLEAN      NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_mitarbeiter_rolle FOREIGN KEY (rolleID) REFERENCES rolle(ID)
);

-- Getränke und Rezepte
CREATE TABLE speise (
    ID    INT AUTO_INCREMENT PRIMARY KEY,
    name  VARCHAR(100) NOT NULL,
    preis DECIMAL(8,2) NOT NULL CHECK (preis >= 0)
);

CREATE TABLE zutat (
    ID               INT AUTO_INCREMENT PRIMARY KEY,
    name             VARCHAR(100) NOT NULL,
    -- Die Einheit wird von der Datenbank vorgegeben (im Rezept nicht wählbar).
    mengeneinheit    ENUM('ml','cl','l','g','kg','Stück') NOT NULL,
    einkaufspreis    DECIMAL(10,4) NOT NULL DEFAULT 0 CHECK (einkaufspreis >= 0),     -- ERGÄNZT: Preis je Einheit
    nachbestellmenge DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (nachbestellmenge >= 0)   -- ERGÄNZT: Menge je Nachbestellung
);

CREATE TABLE rezept (
    zutatID  INT           NOT NULL,
    speiseID INT           NOT NULL,
    menge    DECIMAL(10,2) NOT NULL CHECK (menge > 0),
    PRIMARY KEY (zutatID, speiseID),
    CONSTRAINT fk_rezept_zutat  FOREIGN KEY (zutatID)  REFERENCES zutat(ID),
    CONSTRAINT fk_rezept_speise FOREIGN KEY (speiseID) REFERENCES speise(ID)
);

-- Service / Bestellung
CREATE TABLE tisch (
    ID          INT AUTO_INCREMENT PRIMARY KEY,
    tischnummer INT         NOT NULL UNIQUE,
    sitzplaetze INT         NOT NULL CHECK (sitzplaetze > 0),
    status      VARCHAR(20) NOT NULL DEFAULT 'frei'      -- frei | besetzt | reserviert
);

CREATE TABLE bestellung (
    ID            INT AUTO_INCREMENT PRIMARY KEY,
    mitarbeiterID INT NULL,   -- ERGÄNZT: NULL bei Tablet-Bestellung eines Gastes
    tischID       INT NULL,   -- ERGÄNZT: NULL bei „Eigener Bestellung“ eines Mitarbeiters
    bestellzeit   DATETIME      NOT NULL,
    status        VARCHAR(20)   NOT NULL DEFAULT 'in Bearbeitung',   -- in Bearbeitung | fertig
    gesamtbetrag  DECIMAL(10,2) NOT NULL DEFAULT 0,
    CONSTRAINT fk_bestellung_mitarbeiter FOREIGN KEY (mitarbeiterID) REFERENCES mitarbeiter(ID),
    CONSTRAINT fk_bestellung_tisch       FOREIGN KEY (tischID)       REFERENCES tisch(ID),
    CONSTRAINT ck_bestellung_besteller CHECK (mitarbeiterID IS NOT NULL OR tischID IS NOT NULL)
);

CREATE TABLE bestellposition (
    bestellID INT         NOT NULL,
    gerichtID INT         NOT NULL,                                -- verweist auf speise.ID
    menge     INT         NOT NULL DEFAULT 1 CHECK (menge > 0),    -- ERGÄNZT: Anzahl je Getränk
    status    VARCHAR(20) NOT NULL DEFAULT 'in Bearbeitung',
    PRIMARY KEY (bestellID, gerichtID),
    CONSTRAINT fk_position_bestellung FOREIGN KEY (bestellID) REFERENCES bestellung(ID) ON DELETE CASCADE,
    CONSTRAINT fk_position_speise     FOREIGN KEY (gerichtID) REFERENCES speise(ID)
);

CREATE TABLE zahlung (
    ID           INT AUTO_INCREMENT PRIMARY KEY,
    bestellID    INT           NOT NULL,
    zahlungsart  VARCHAR(30)   NOT NULL,
    betrag       DECIMAL(10,2) NOT NULL CHECK (betrag >= 0),
    zahlungszeit DATETIME      NOT NULL,
    status       VARCHAR(20)   NOT NULL DEFAULT 'offen',   -- offen | bezahlt
    CONSTRAINT fk_zahlung_bestellung FOREIGN KEY (bestellID) REFERENCES bestellung(ID)
);

-- Lager
CREATE TABLE charge (
    ID                INT AUTO_INCREMENT PRIMARY KEY,
    mindesthalbarkeit DATE          NOT NULL,
    restbestand       DECIMAL(10,2) NOT NULL DEFAULT 0,
    eingangsdatum     DATE          NOT NULL
);

CREATE TABLE lager (
    zutatID             INT           NOT NULL,
    chargenID           INT           NOT NULL,
    lagerbestand        DECIMAL(10,2) NOT NULL DEFAULT 0,
    mindestlagerbestand DECIMAL(10,2) NOT NULL DEFAULT 0,
    PRIMARY KEY (zutatID, chargenID),
    CONSTRAINT fk_lager_zutat  FOREIGN KEY (zutatID)   REFERENCES zutat(ID),
    CONSTRAINT fk_lager_charge FOREIGN KEY (chargenID) REFERENCES charge(ID)
);

CREATE TABLE lagerbewegung (
    ID            INT AUTO_INCREMENT PRIMARY KEY,
    zutatID       INT           NOT NULL,
    mitarbeiterID INT NULL,     -- ERGÄNZT: NULL bei automatischen bzw. Tablet-Buchungen
    bewegungsart  VARCHAR(30)   NOT NULL,   -- Eingang | Verbrauch | Schwund | Korrektur
    menge         DECIMAL(10,2) NOT NULL,
    zeitpunkt     DATETIME      NOT NULL,
    bemerkung     VARCHAR(255),
    CONSTRAINT fk_bewegung_zutat       FOREIGN KEY (zutatID)       REFERENCES zutat(ID),
    CONSTRAINT fk_bewegung_mitarbeiter FOREIGN KEY (mitarbeiterID) REFERENCES mitarbeiter(ID)
);

-- ERGÄNZT: Nachbestellungen inkl. Rechnungsdaten (Protokoll der Lagerüberwachung und Rechnungen)
CREATE TABLE nachbestellung (
    ID          INT AUTO_INCREMENT PRIMARY KEY,
    zutatID     INT NULL,                    -- Rechnung bleibt erhalten, wenn der Artikel gelöscht wird
    artikelname VARCHAR(100)  NOT NULL,
    zeitpunkt   DATETIME      NOT NULL,
    grund       VARCHAR(60)   NOT NULL,      -- Mindestmenge erreicht | Mindesthaltbarkeitsdatum erreicht | Manuelle Nachbestellung
    menge       DECIMAL(10,2) NOT NULL CHECK (menge > 0),
    einzelpreis DECIMAL(10,4) NOT NULL,
    CONSTRAINT fk_nachbestellung_zutat FOREIGN KEY (zutatID) REFERENCES zutat(ID) ON DELETE SET NULL
);
