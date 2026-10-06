-- =====================================================
-- Testdaten: nur Getränke, Zutaten nur für die Bar.
-- Datums-/Zeitangaben sind relativ zum Einspielzeitpunkt.
-- =====================================================

-- Rollen (entsprechen den Rollen der Oberfläche)
INSERT INTO rolle (ID, name, beschreibung) VALUES
(1, 'Admin',            'Vollzugriff auf alle Bereiche'),
(2, 'Barkeeper',        'Getränkezubereitung, Rezepte'),
(3, 'Lager / Bediener', 'Lagerverwaltung und Bestellungen');

-- Anmeldung mit E-Mail und Passwort "passwort123" (nur Testdaten!). Gespeichert wird ein scrypt-Hash.
INSERT INTO mitarbeiter (ID, rolleID, vorname, name, email, passwort, eintrittsdatum, aktiv) VALUES
(1, 1, 'Meric', 'Üller',   'meric@gastro.de',   'scrypt$a6bc4a8de536bf1cc7b6ca8ea5e206cc$ffeed56f117cbff596f8d97e5e518169cc5452477ed7381f1e79f24f27db79fe48842dedf87ce99b5895138544424d78baadfc03013ea51798ffc65bd351cf97', '2021-03-01', TRUE),
(2, 1, 'Werner', 'GPunkt',   'werner@gastro.de',   'scrypt$a6bc4a8de536bf1cc7b6ca8ea5e206cc$ffeed56f117cbff596f8d97e5e518169cc5452477ed7381f1e79f24f27db79fe48842dedf87ce99b5895138544424d78baadfc03013ea51798ffc65bd351cf97', '2021-03-01', TRUE),
(3, 1, 'Finn', 'Cock',   'finn@gastro.de',   'scrypt$a6bc4a8de536bf1cc7b6ca8ea5e206cc$ffeed56f117cbff596f8d97e5e518169cc5452477ed7381f1e79f24f27db79fe48842dedf87ce99b5895138544424d78baadfc03013ea51798ffc65bd351cf97', '2021-03-01', TRUE);

INSERT INTO tisch (ID, tischnummer, sitzplaetze, status) VALUES
(1, 1, 4, 'besetzt'), (2, 2, 2, 'besetzt'), (3, 3, 4, 'besetzt'), (4, 4, 2, 'besetzt'),
(5, 5, 2, 'besetzt'), (6, 6, 4, 'frei'),    (7, 7, 6, 'besetzt'), (8, 8, 4, 'frei');

-- Getränke
INSERT INTO speise (ID, name, preis) VALUES
(1,  'Cola 0,33 l',         3.50),
(2,  'Mineralwasser 0,5 l', 3.00),
(3,  'Pils vom Fass 0,3 l', 3.80),
(4,  'Weizenbier 0,5 l',    4.50),
(5,  'Rotwein 0,2 l',       5.50),
(6,  'Weißwein 0,2 l',      5.50),
(7,  'Mojito',              8.50),
(8,  'Gin Tonic',           9.00),
(9,  'Aperol Spritz',       7.50),
(10, 'Caipirinha',          8.50),
(11, 'Espresso',            2.80),
(12, 'Cuba Libre',          8.00);

-- Bar-Zutaten (Einheit, Einkaufspreis je Einheit, Nachbestellmenge)
INSERT INTO zutat (ID, name, mengeneinheit, einkaufspreis, nachbestellmenge) VALUES
(1,  'Weißer Rum',    'ml',    0.0250,  3000),
(2,  'Gin',           'ml',    0.0300,  3000),
(3,  'Cachaça',       'ml',    0.0200,  2000),
(4,  'Aperol',        'ml',    0.0200,  3000),
(5,  'Prosecco',      'ml',    0.0080,  9000),
(6,  'Tonic Water',   'ml',    0.0025, 12000),
(7,  'Sodawasser',    'ml',    0.0008, 15000),
(8,  'Cola',          'ml',    0.0020, 10000),
(9,  'Limette',       'Stück', 0.3000,    60),
(10, 'Frische Minze', 'g',     0.0300,   150),
(11, 'Rohrzucker',    'g',     0.0020,  2000),
(12, 'Orange',        'Stück', 0.3500,    30),
(13, 'Pils (Fass)',   'ml',    0.0015, 50000),
(14, 'Weizenbier',    'ml',    0.0018, 40000),
(15, 'Rotwein',       'ml',    0.0065,  8000),
(16, 'Weißwein',      'ml',    0.0060,  8000),
(17, 'Kaffeebohnen',  'g',     0.0180,  3000),
(18, 'Mineralwasser', 'ml',    0.0004, 30000);

-- Rezepte (zutatID, speiseID, menge in der Einheit der Zutat)
INSERT INTO rezept (zutatID, speiseID, menge) VALUES
(8, 1, 330),
(18, 2, 500),
(13, 3, 300),
(14, 4, 500),
(15, 5, 200),
(16, 6, 200),
(1, 7, 50), (9, 7, 1), (10, 7, 8), (11, 7, 10), (7, 7, 100),
(2, 8, 40), (6, 8, 150), (9, 8, 0.25),
(4, 9, 60), (5, 9, 90), (7, 9, 30), (12, 9, 0.25),
(3, 10, 50), (9, 10, 1), (11, 10, 15),
(17, 11, 8),
(1, 12, 50), (8, 12, 120), (9, 12, 0.25);

-- Chargen (mindesthalbarkeit, restbestand, eingangsdatum)
INSERT INTO charge (ID, mindesthalbarkeit, restbestand, eingangsdatum) VALUES
(1,  CURDATE() + INTERVAL 800 DAY,  5000, CURDATE() - INTERVAL 28 DAY),
(2,  CURDATE() + INTERVAL 800 DAY,  4000, CURDATE() - INTERVAL 28 DAY),
(3,  CURDATE() + INTERVAL 800 DAY,  2000, CURDATE() - INTERVAL 28 DAY),
(4,  CURDATE() + INTERVAL 600 DAY,  3000, CURDATE() - INTERVAL 28 DAY),
(5,  CURDATE() + INTERVAL 180 DAY,  9000, CURDATE() - INTERVAL 14 DAY),
(6,  CURDATE() + INTERVAL 240 DAY, 12000, CURDATE() - INTERVAL 14 DAY),
(7,  CURDATE() + INTERVAL 240 DAY, 15000, CURDATE() - INTERVAL 14 DAY),
(8,  CURDATE() + INTERVAL 150 DAY, 10000, CURDATE() - INTERVAL 19 DAY),
(9,  CURDATE() + INTERVAL 12 DAY,     20, CURDATE() - INTERVAL 7 DAY),
(10, CURDATE() + INTERVAL 4 DAY,      80, CURDATE() - INTERVAL 3 DAY),
(11, CURDATE() + INTERVAL 700 DAY,  2000, CURDATE() - INTERVAL 28 DAY),
(12, CURDATE() + INTERVAL 9 DAY,      30, CURDATE() - INTERVAL 5 DAY),
(13, CURDATE() + INTERVAL 110 DAY, 50000, CURDATE() - INTERVAL 9 DAY),
(14, CURDATE() + INTERVAL 120 DAY, 40000, CURDATE() - INTERVAL 9 DAY),
(15, CURDATE() + INTERVAL 700 DAY,  8000, CURDATE() - INTERVAL 24 DAY),
(16, CURDATE() + INTERVAL 400 DAY,  8000, CURDATE() - INTERVAL 24 DAY),
(17, CURDATE() + INTERVAL 170 DAY,  3000, CURDATE() - INTERVAL 17 DAY),
(18, CURDATE() + INTERVAL 340 DAY, 30000, CURDATE() - INTERVAL 14 DAY),
(19, CURDATE() + INTERVAL 21 DAY,     40, CURDATE() - INTERVAL 1 DAY),
(20, CURDATE() + INTERVAL 210 DAY, 10000, CURDATE() - INTERVAL 1 DAY);

-- Lager (zutatID, chargenID, lagerbestand, mindestlagerbestand)
-- Die Minze liegt unter dem Mindestbestand und löst beim Start eine automatische Nachbestellung aus.
INSERT INTO lager (zutatID, chargenID, lagerbestand, mindestlagerbestand) VALUES
(1,  1,   5000,  1000),
(2,  2,   4000,  1000),
(3,  3,   2000,   500),
(4,  4,   3000,   700),
(5,  5,   9000,  2000),
(6,  6,  12000,  3000),
(7,  7,  15000,  3000),
(8,  8,  10000,  5000),
(9,  9,     20,    30),
(10, 10,    80,   100),
(11, 11,  2000,   500),
(12, 12,    30,    10),
(13, 13, 50000, 10000),
(14, 14, 40000, 10000),
(15, 15,  8000,  2000),
(16, 16,  8000,  2000),
(17, 17,  3000,   500),
(18, 18, 30000,  6000),
(9,  19,    40,    30),
(8,  20, 10000,  5000);

INSERT INTO lagerbewegung (ID, zutatID, mitarbeiterID, bewegungsart, menge, zeitpunkt, bemerkung) VALUES
(1, 1,  1,    'Eingang',  6000,  NOW() - INTERVAL 28 DAY, 'Lieferung Getränkegroßhandel'),
(2, 13, 4,    'Eingang', 50000,  NOW() - INTERVAL 9 DAY,  'Fassbier-Lieferung'),
(3, 9,  1,    'Eingang',    40,  NOW() - INTERVAL 1 DAY,  'Nachbestellung Limetten'),
(4, 10, 2,    'Eingang',   150,  NOW() - INTERVAL 3 DAY,  'Frischelieferung Minze'),
(5, 10, 2,    'Schwund',    70,  NOW() - INTERVAL 1 DAY,  'Minze welk, entsorgt'),
(6, 17, 3,    'Korrektur', -50,  NOW() - INTERVAL 2 DAY,  'Inventur: Differenz Kaffeebohnen'),
(7, 8,  NULL, 'Eingang',  10000, NOW() - INTERVAL 1 DAY,  'Lieferung Cola');
