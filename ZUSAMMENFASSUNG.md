# MENUBOARD v7.40 - KOMPLETTES PAKET MIT HTML
# Für nächsten Chat: Alle Infos hier kopieren

## 📁 KOMPLETTE DATEISTRUKTUR (12 Dateien)

```
menuboard_v740_complete/
├── server.js              # Express Backend + API
├── package.json           # Node.js Dependencies
├── .gitignore             # Git Ignore
├── README.md              # Dokumentation
├── data.json              # Wird automatisch erstellt
├── uploads/               # Hochgeladene Medien
│   └── .gitkeep
├── public/                # Display-Frontend
│   ├── index.html         # Display HTML
│   ├── css/
│   │   └── display.css    # Display Styles
│   ├── js/
│   │   └── display.js     # Display Logic
│   └── assets/            # Statische Assets
│       └── .gitkeep
└── admin/                 # Admin-Panel
    ├── index.html         # VOLLSTÄNDIGES Admin HTML
    ├── admin.css          # Admin Styles
    └── admin.js           # Admin Logic
```

---

## 🚀 STARTEN

```bash
cd menuboard_v740_complete
npm install
npm start
```

**URLs:**
- Admin: `http://localhost:3000/admin`
- Display: `http://localhost:3000/`
- Display (Haupt): `http://localhost:3000/display/main`
- Display (Außen): `http://localhost:3000/display/outdoor`
- Display (Küche): `http://localhost:3000/display/kitchen`

---

## ✅ ALLE FEATURES (v7.20 → v7.40)

### v7.20 Basis
- Produktverwaltung (CRUD)
- Zonen-Designer (Drag & Drop)
- Mediathek (Upload/Delete)
- Ticker
- Kategorien CRUD
- Sold-Out Overlay

### v7.30 Bugfixes
- Theme-Wechsel Fix (sauberes CSS-Reset + Live-Preview)
- Bild-Upload Fix (100% Abdeckung, Validierung, Clipboard-Paste)
- 12 Schriftarten (Inter, Roboto, Montserrat, Oswald, Playfair, Bebas, Poppins, Lato, Raleway, Open Sans, Nunito, Ubuntu)
- AED-Währung (Dirham)
- Version-Counter (/version Endpoint, Badge, Changelog)

### v7.40 NEU

#### Templates CRUD
- **5 Standard-Templates** (geschützt vor Löschung):
  1. Split Screen - Menü links, Media rechts
  2. Full Screen Menü - Nur Menü über gesamten Bildschirm
  3. Menü + Video - Menü oben, Video unten
  4. Triple Column - 3 Spalten Layout
  5. Promo Fokus - Große Promo-Zone mit kleinem Menü
- **Eigene Templates erstellen** - Modal mit Name, Beschreibung, Zonen-Editor
- **Templates bearbeiten** - Zonen-Positionen, Typen, Größen editierbar
- **Templates löschen** - Nur benutzerdefinierte (Standard-Templates geschützt)
- **Template-Vorschau** - Miniaturansicht mit Zonen-Icons, Meta-Infos
- **Template auf Display anwenden** - Direkte Zuweisung

#### Multi-Display Support
- **10+ Displays** - Unbegrenzte Anzahl
- **Eigene URLs** - `/display/:slug` (z.B. `/display/main`, `/display/outdoor`)
- **Eigenes Template pro Display** - Konfigurierbar im Admin
- **Online-Status** - Grün/Rot basierend auf Heartbeat (30s)
- **URL-Kopieren** - Ein-Klick Copy
- **Externer Link** - Direkte Vorschau
- **3 Default-Displays**:
  - Hauptdisplay (`main`) - Theke
  - Außendisplay (`outdoor`) - Eingang
  - Küchendisplay (`kitchen`) - Küche
- **Aktiv/Inaktiv** - Displays ein-/ausschalten
- **Heartbeat** - Automatische Status-Updates

---

## 🔧 API ENDPOINTS

### Templates
```
GET    /templates              # Alle Templates
GET    /templates/:id          # Einzelnes Template
POST   /templates              # Template erstellen
PUT    /templates/:id          # Template aktualisieren
DELETE /templates/:id          # Template löschen (nur non-default)
```

### Displays
```
GET    /displays               # Alle Displays
GET    /displays/:id           # Einzelnes Display
POST   /displays               # Display erstellen
PUT    /displays/:id           # Display aktualisieren
DELETE /displays/:id           # Display löschen
GET    /display/:slug          # Öffentliche Display-Ansicht
POST   /displays/:id/heartbeat # Heartbeat
POST   /apply-template-to-display # Template auf Display anwenden
```

---

## 📋 OFFENE FEATURES (für nächsten Chat)

### Priorität 1 (Empfohlen):
1. **Zeitgesteuerte Inhalte** - Frühstück (6-11h), Mittag (11-14h), Abend (14-22h)
2. **Wetter-Integration** - Temperaturbasierte Empfehlungen
3. **QR-Codes / Bestellung** - Direkte Bestellung per Scan

### Priorität 2:
4. **Mehrsprachigkeit** - DE/EN/AR parallel
5. **Animationen & Übergänge** - Slide/Fade zwischen Seiten
6. **Social Media Feed** - Instagram Posts

### Priorität 3:
7. **Analytics / Statistik** - Welche Produkte werden angezeigt?
8. **Fernsteuerung** - Alle Displays von Admin steuern
9. **API-Integration** - POS-System (Preise sync)

---

## 📎 DOWNLOAD

Komplettpaket: [menuboard_v740_complete.zip](sandbox:///mnt/agents/output/menuboard_v740_complete.zip)
