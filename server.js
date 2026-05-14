const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static Files
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// Data File Path
const DATA_FILE = path.join(__dirname, 'data.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer Upload Config
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|mp4|webm|mov/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Nur Bilder (JPG, PNG, GIF) und Videos (MP4, WEBM, MOV) erlaubt!'));
    }
});

// ==================== HELPER FUNCTIONS ====================

function loadData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const raw = fs.readFileSync(DATA_FILE, 'utf8');
            return JSON.parse(raw);
        }
    } catch (e) {
        console.error('Fehler beim Laden von data.json:', e);
    }
    return getDefaultData();
}

function saveData(data) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (e) {
        console.error('Fehler beim Speichern:', e);
        return false;
    }
}

function getDefaultData() {
    const defaultProducts = [
        { id: 1, title: "Classic Burger", price: "8.90", image: "/public/assets/1.png", category: "burger", badge: "Bestseller", stockStatus: "available" },
        { id: 2, title: "Cheese Deluxe", price: "9.90", image: "/public/assets/2.png", category: "burger", badge: "", stockStatus: "available" },
        { id: 3, title: "BBQ Bacon", price: "10.90", image: "/public/assets/3.png", category: "burger", badge: "Neu", stockStatus: "available" },
        { id: 4, title: "Veggie Supreme", price: "8.50", image: "/public/assets/4.png", category: "burger", badge: "", stockStatus: "available" },
        { id: 5, title: "Chicken Wings", price: "7.90", image: "/public/assets/5.png", category: "sides", badge: "", stockStatus: "available" },
        { id: 6, title: "Crispy Fries", price: "3.90", image: "/public/assets/6.png", category: "sides", badge: "", stockStatus: "available" },
        { id: 7, title: "Onion Rings", price: "4.50", image: "/public/assets/7.png", category: "sides", badge: "", stockStatus: "available" },
        { id: 8, title: "Mozzarella Sticks", price: "5.90", image: "/public/assets/8.png", category: "sides", badge: "", stockStatus: "available" },
        { id: 9, title: "Coca Cola", price: "2.90", image: "/public/assets/9.png", category: "drinks", badge: "", stockStatus: "available" },
        { id: 10, title: "Sprite", price: "2.90", image: "/public/assets/10.png", category: "drinks", badge: "", stockStatus: "available" },
        { id: 11, title: "Fanta", price: "2.90", image: "/public/assets/11.png", category: "drinks", badge: "", stockStatus: "available" },
        { id: 12, title: "Iced Coffee", price: "3.50", image: "/public/assets/12.png", category: "drinks", badge: "", stockStatus: "available" },
        { id: 13, title: "Vanilla Shake", price: "4.90", image: "/public/assets/13.png", category: "dessert", badge: "", stockStatus: "available" },
        { id: 14, title: "Chocolate Shake", price: "4.90", image: "/public/assets/14.png", category: "dessert", badge: "", stockStatus: "available" },
        { id: 15, title: "Sundae", price: "3.90", image: "/public/assets/15.png", category: "dessert", badge: "", stockStatus: "available" },
        { id: 16, title: "Apple Pie", price: "3.50", image: "/public/assets/16.png", category: "dessert", badge: "", stockStatus: "available" }
    ];

    const defaultZones = [
        { id: "zone-menu", name: "Menü Zone", type: "menu", x: 2, y: 2, w: 60, h: 80, visible: true, productIds: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16], articleStyle: { showImage: true, showTitle: true, showPrice: true, showDescription: false, showBadge: true, showStock: true, pricePosition: 'bottom-right', priceStyle: 'badge-gold', imageSize: 'large', cardLayout: 'vertical', textAlign: 'left', columnsCount: 'auto' } },
        { id: "zone-media", name: "Media Zone", type: "media", x: 64, y: 2, w: 34, h: 40, visible: true, mediaSrc: "/uploads/promo1.jpg", mediaType: "image" },
        { id: "zone-ticker", name: "Ticker Zone", type: "ticker", x: 64, y: 44, w: 34, h: 8, visible: true, text: "🍔 TAGESANGEBOT: Classic Burger + Fries nur 10.90€! | 🥤 Getränke 2-für-1 ab 14 Uhr! | 🍦 Gratis Sundae bei Bestellung über 20€!" },
        { id: "zone-info", name: "Info Zone", type: "media", x: 64, y: 54, w: 34, h: 28, visible: true, mediaSrc: "/uploads/info.jpg", mediaType: "image" }
    ];

    return {
        version: "7.50",
        lastModified: new Date().toISOString(),
        settings: {
            theme: "dark",
            currency: "€",
            language: "de",
            font: "Inter",
            refreshInterval: 30,
            autoRotate: false,
            showBadges: true
        },
        products: defaultProducts,
        zones: defaultZones,
        ticker: {
            enabled: true,
            speed: 50,
            direction: "left",
            fontSize: 24,
            color: "#FFD700",
            backgroundColor: "#1a1a2e"
        },
        layout: {
            width: 1920,
            height: 1080,
            orientation: "landscape",
            snapGrid: 10,
            showGrid: true
        },
        templates: [
            { id: "split", name: "Split Screen", description: "Menü links, Media rechts", isDefault: true, zones: defaultZones },
            { id: "fullscreen-menu", name: "Full Screen Menü", description: "Nur Menü über gesamten Bildschirm", isDefault: true, zones: [
                { id: "zone-menu", name: "Menü Zone", type: "menu", x: 0, y: 0, w: 100, h: 92, visible: true, productIds: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16], articleStyle: { showImage: true, showTitle: true, showPrice: true, showDescription: false, showBadge: true, showStock: true, pricePosition: 'bottom-right', priceStyle: 'badge-gold', imageSize: 'large', cardLayout: 'vertical', textAlign: 'left', columnsCount: 'auto' } },
                { id: "zone-ticker", name: "Ticker Zone", type: "ticker", x: 0, y: 92, w: 100, h: 8, visible: true, text: "🍔 Willkommen!" }
            ]},
            { id: "menu-video", name: "Menü + Video", description: "Menü oben, Video unten", isDefault: true, zones: [
                { id: "zone-menu", name: "Menü Zone", type: "menu", x: 0, y: 0, w: 100, h: 55, visible: true, productIds: [1,2,3,4,5,6,7,8], articleStyle: { showImage: true, showTitle: true, showPrice: true, showDescription: false, showBadge: true, showStock: true, pricePosition: 'bottom-right', priceStyle: 'badge-gold', imageSize: 'large', cardLayout: 'vertical', textAlign: 'left', columnsCount: 'auto' } },
                { id: "zone-media", name: "Video Zone", type: "media", x: 0, y: 55, w: 100, h: 37, visible: true, mediaSrc: "/uploads/promo.mp4", mediaType: "video" },
                { id: "zone-ticker", name: "Ticker Zone", type: "ticker", x: 0, y: 92, w: 100, h: 8, visible: true, text: "🍔 Willkommen!" }
            ]},
            { id: "triple", name: "Triple Column", description: "3 Spalten Layout", isDefault: true, zones: [
                { id: "zone-menu-1", name: "Burger Zone", type: "menu", x: 0, y: 0, w: 33, h: 92, visible: true, productIds: [1,2,3,4], articleStyle: { showImage: true, showTitle: true, showPrice: true, showDescription: false, showBadge: true, showStock: true, pricePosition: 'bottom-right', priceStyle: 'badge-gold', imageSize: 'large', cardLayout: 'vertical', textAlign: 'left', columnsCount: 'auto' } },
                { id: "zone-menu-2", name: "Sides Zone", type: "menu", x: 33, y: 0, w: 34, h: 92, visible: true, productIds: [5,6,7,8], articleStyle: { showImage: true, showTitle: true, showPrice: true, showDescription: false, showBadge: true, showStock: true, pricePosition: 'bottom-right', priceStyle: 'badge-gold', imageSize: 'large', cardLayout: 'vertical', textAlign: 'left', columnsCount: 'auto' } },
                { id: "zone-menu-3", name: "Drinks Zone", type: "menu", x: 67, y: 0, w: 33, h: 92, visible: true, productIds: [9,10,11,12], articleStyle: { showImage: true, showTitle: true, showPrice: true, showDescription: false, showBadge: true, showStock: true, pricePosition: 'bottom-right', priceStyle: 'badge-gold', imageSize: 'large', cardLayout: 'vertical', textAlign: 'left', columnsCount: 'auto' } },
                { id: "zone-ticker", name: "Ticker Zone", type: "ticker", x: 0, y: 92, w: 100, h: 8, visible: true, text: "🍔 Willkommen!" }
            ]},
            { id: "promo-focus", name: "Promo Fokus", description: "Große Promo-Zone mit kleinem Menü", isDefault: true, zones: [
                { id: "zone-promo", name: "Promo Zone", type: "media", x: 0, y: 0, w: 65, h: 100, visible: true, mediaSrc: "/uploads/promo1.jpg", mediaType: "image" },
                { id: "zone-menu", name: "Menü Zone", type: "menu", x: 65, y: 0, w: 35, h: 85, visible: true, productIds: [1,2,3,4,5], articleStyle: { showImage: true, showTitle: true, showPrice: true, showDescription: false, showBadge: true, showStock: true, pricePosition: 'bottom-right', priceStyle: 'badge-gold', imageSize: 'medium', cardLayout: 'vertical', textAlign: 'left', columnsCount: 'auto' } },
                { id: "zone-ticker", name: "Ticker Zone", type: "ticker", x: 65, y: 85, w: 35, h: 15, visible: true, text: "🔥 TAGESANGEBOT!" }
            ]}
        ],
        displays: [
            { id: "display-main", name: "Hauptdisplay", slug: "main", description: "Hauptdisplay an der Theke", templateId: "split", playlist: [], active: true, createdAt: new Date().toISOString(), lastSeen: new Date().toISOString() },
            { id: "display-outdoor", name: "Außendisplay", slug: "outdoor", description: "Display am Eingang", templateId: "promo-focus", playlist: [], active: true, createdAt: new Date().toISOString(), lastSeen: new Date().toISOString() },
            { id: "display-kitchen", name: "Küchendisplay", slug: "kitchen", description: "Display in der Küche", templateId: "fullscreen-menu", playlist: [], active: true, createdAt: new Date().toISOString(), lastSeen: new Date().toISOString() }
        ],
        schedules: getDefaultSchedules(),
        weather: {
            enabled: true,
            latitude: '52.52',
            longitude: '13.41',
            showOnDisplay: true,
            showRecommendations: true,
            updateInterval: 300000 // 5 minutes
        },
        qrCodes: {
            enabled: true,
            baseUrl: '',
            showOnProducts: true,
            showOnDisplay: true
        },
        languages: {
            enabled: ['de', 'en'],
            default: 'de',
            showSelector: true
        },
        animations: {
            enabled: true,
            pageTransition: 'slide',
            productFadeIn: true,
            offerPulse: true,
            transitionDuration: 500
        }
    };
}

// Initialize data if not exists
if (!fs.existsSync(DATA_FILE)) {
    saveData(getDefaultData());
    console.log('✅ data.json mit Default-Daten erstellt');
}

// ==================== API ROUTES ====================

// GET /data - Alle Daten abrufen
app.get('/data', (req, res) => {
    const data = loadData();
    res.json(data);
});

// POST /save - Alle Daten speichern
app.post('/save', (req, res) => {
    const data = req.body;
    data.lastModified = new Date().toISOString();
    if (saveData(data)) {
        res.json({ success: true, message: 'Daten gespeichert' });
    } else {
        res.status(500).json({ success: false, message: 'Speichern fehlgeschlagen' });
    }
});

// GET /products - Produkte abrufen
app.get('/products', (req, res) => {
    const data = loadData();
    res.json(data.products);
});

// POST /products - Produkt erstellen
app.post('/products', (req, res) => {
    const data = loadData();
    const newProduct = req.body;
    newProduct.id = Date.now();
    data.products.push(newProduct);
    data.lastModified = new Date().toISOString();
    if (saveData(data)) {
        res.json({ success: true, product: newProduct });
    } else {
        res.status(500).json({ success: false });
    }
});

// PUT /products/:id - Produkt aktualisieren
app.put('/products/:id', (req, res) => {
    const data = loadData();
    const id = parseInt(req.params.id);
    const index = data.products.findIndex(p => p.id === id);
    if (index === -1) {
        return res.status(404).json({ success: false, message: 'Produkt nicht gefunden' });
    }
    data.products[index] = { ...data.products[index], ...req.body, id };
    data.lastModified = new Date().toISOString();
    if (saveData(data)) {
        res.json({ success: true, product: data.products[index] });
    } else {
        res.status(500).json({ success: false });
    }
});

// DELETE /products/:id - Produkt löschen
app.delete('/products/:id', (req, res) => {
    const data = loadData();
    const id = parseInt(req.params.id);
    data.products = data.products.filter(p => p.id !== id);
    data.lastModified = new Date().toISOString();
    if (saveData(data)) {
        res.json({ success: true });
    } else {
        res.status(500).json({ success: false });
    }
});

// GET /zones - Zonen abrufen
app.get('/zones', (req, res) => {
    const data = loadData();
    res.json(data.zones);
});

// POST /zones - Zone erstellen
app.post('/zones', (req, res) => {
    const data = loadData();
    const newZone = req.body;
    newZone.id = newZone.id || 'zone-' + Date.now();
    data.zones.push(newZone);
    data.lastModified = new Date().toISOString();
    if (saveData(data)) {
        res.json({ success: true, zone: newZone });
    } else {
        res.status(500).json({ success: false });
    }
});

// PUT /zones/:id - Zone aktualisieren
app.put('/zones/:id', (req, res) => {
    const data = loadData();
    const id = req.params.id;
    const index = data.zones.findIndex(z => z.id === id);
    if (index === -1) {
        return res.status(404).json({ success: false, message: 'Zone nicht gefunden' });
    }
    data.zones[index] = { ...data.zones[index], ...req.body, id };
    data.lastModified = new Date().toISOString();
    if (saveData(data)) {
        res.json({ success: true, zone: data.zones[index] });
    } else {
        res.status(500).json({ success: false });
    }
});

// DELETE /zones/:id - Zone löschen
app.delete('/zones/:id', (req, res) => {
    const data = loadData();
    const id = req.params.id;
    data.zones = data.zones.filter(z => z.id !== id);
    data.lastModified = new Date().toISOString();
    if (saveData(data)) {
        res.json({ success: true });
    } else {
        res.status(500).json({ success: false });
    }
});

// POST /upload - Datei-Upload
app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'Keine Datei hochgeladen' });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({
        success: true,
        file: {
            filename: req.file.filename,
            originalname: req.file.originalname,
            url: fileUrl,
            size: req.file.size,
            mimetype: req.file.mimetype
        }
    });
});

// POST /upload-multiple - Mehrere Dateien
app.post('/upload-multiple', upload.array('files', 10), (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ success: false, message: 'Keine Dateien hochgeladen' });
    }
    const files = req.files.map(f => ({
        filename: f.filename,
        originalname: f.originalname,
        url: `/uploads/${f.filename}`,
        size: f.size,
        mimetype: f.mimetype
    }));
    res.json({ success: true, files });
});

// GET /uploads - Liste aller Uploads
app.get('/uploads-list', (req, res) => {
    try {
        const files = fs.readdirSync(UPLOADS_DIR);
        const uploads = files.map(f => {
            const stats = fs.statSync(path.join(UPLOADS_DIR, f));
            return {
                filename: f,
                url: `/uploads/${f}`,
                size: stats.size,
                modified: stats.mtime
            };
        });
        res.json({ success: true, uploads });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// DELETE /uploads/:filename - Datei löschen
app.delete('/uploads/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(UPLOADS_DIR, filename);
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            res.json({ success: true });
        } else {
            res.status(404).json({ success: false, message: 'Datei nicht gefunden' });
        }
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// GET /templates - Templates abrufen
app.get('/templates', (req, res) => {
    const data = loadData();
    res.json(data.templates || []);
});

// POST /apply-template - Template anwenden
app.post('/apply-template', (req, res) => {
    const data = loadData();
    const templateId = req.body.templateId;
    const template = data.templates.find(t => t.id === templateId);
    if (!template) {
        return res.status(404).json({ success: false, message: 'Template nicht gefunden' });
    }
    data.zones = JSON.parse(JSON.stringify(template.zones));
    data.lastModified = new Date().toISOString();
    if (saveData(data)) {
        res.json({ success: true, zones: data.zones });
    } else {
        res.status(500).json({ success: false });
    }
});

// POST /apply-template-to-display - Template auf Display anwenden
app.post('/apply-template-to-display', (req, res) => {
    const data = loadData();
    const { displayId, templateId } = req.body;
    const display = (data.displays || []).find(d => d.id === displayId);
    const template = (data.templates || []).find(t => t.id === templateId);

    if (!display) {
        return res.status(404).json({ success: false, message: 'Display nicht gefunden' });
    }
    if (!template) {
        return res.status(404).json({ success: false, message: 'Template nicht gefunden' });
    }

    display.templateId = templateId;
    display.zones = JSON.parse(JSON.stringify(template.zones));
    display.lastModified = new Date().toISOString();
    data.lastModified = new Date().toISOString();

    if (saveData(data)) {
        res.json({ success: true, display });
    } else {
        res.status(500).json({ success: false });
    }
});

// GET /settings - Einstellungen abrufen
app.get('/settings', (req, res) => {
    const data = loadData();
    res.json(data.settings);
});

// POST /settings - Einstellungen speichern
app.post('/settings', (req, res) => {
    const data = loadData();
    data.settings = { ...data.settings, ...req.body };
    data.lastModified = new Date().toISOString();
    if (saveData(data)) {
        res.json({ success: true, settings: data.settings });
    } else {
        res.status(500).json({ success: false });
    }
});

// ═══════════════════ DISPLAYS (Multi-Display Support) ═══════════════════

// GET /displays - Alle Displays abrufen
app.get('/displays', (req, res) => {
    const data = loadData();
    res.json(data.displays || []);
});

// GET /displays/:id - Einzelnes Display abrufen
app.get('/displays/:id', (req, res) => {
    const data = loadData();
    const display = (data.displays || []).find(d => d.id === req.params.id);
    if (!display) {
        return res.status(404).json({ success: false, message: 'Display nicht gefunden' });
    }
    res.json(display);
});

// POST /displays - Display erstellen
app.post('/displays', (req, res) => {
    const data = loadData();
    if (!data.displays) data.displays = [];

    const newDisplay = {
        id: 'display-' + Date.now(),
        name: req.body.name || 'Neues Display',
        slug: req.body.slug || 'display-' + (data.displays.length + 1),
        description: req.body.description || '',
        templateId: req.body.templateId || 'split',
        playlist: req.body.playlist || [],
        zones: req.body.zones || [],
        settings: req.body.settings || {},
        active: req.body.active !== false,
        createdAt: new Date().toISOString(),
        lastSeen: new Date().toISOString()
    };

    data.displays.push(newDisplay);
    data.lastModified = new Date().toISOString();
    if (saveData(data)) {
        res.json({ success: true, display: newDisplay });
    } else {
        res.status(500).json({ success: false });
    }
});

// PUT /displays/:id - Display aktualisieren
app.put('/displays/:id', (req, res) => {
    const data = loadData();
    if (!data.displays) data.displays = [];

    const index = data.displays.findIndex(d => d.id === req.params.id);
    if (index === -1) {
        return res.status(404).json({ success: false, message: 'Display nicht gefunden' });
    }

    data.displays[index] = { 
        ...data.displays[index], 
        ...req.body, 
        id: req.params.id,
        lastModified: new Date().toISOString()
    };
    data.lastModified = new Date().toISOString();
    if (saveData(data)) {
        res.json({ success: true, display: data.displays[index] });
    } else {
        res.status(500).json({ success: false });
    }
});

// DELETE /displays/:id - Display löschen
app.delete('/displays/:id', (req, res) => {
    const data = loadData();
    if (!data.displays) data.displays = [];

    data.displays = data.displays.filter(d => d.id !== req.params.id);
    data.lastModified = new Date().toISOString();
    if (saveData(data)) {
        res.json({ success: true });
    } else {
        res.status(500).json({ success: false });
    }
});

// GET /display/:slug - Öffentliche Display-Ansicht (für TV/Monitor)
app.get('/display/:slug', (req, res) => {
    const data = loadData();
    const display = (data.displays || []).find(d => d.slug === req.params.slug && d.active !== false);

    if (!display) {
        return res.status(404).send(`
            <!DOCTYPE html>
            <html><head><title>Display nicht gefunden</title></head>
            <body style="background:#0a0a0f;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;font-family:sans-serif;">
                <div style="text-align:center;">
                    <h1>❌ Display nicht gefunden</h1>
                    <p>Slug: ${req.params.slug}</p>
                </div>
            </body></html>
        `);
    }

    // Update lastSeen
    display.lastSeen = new Date().toISOString();
    saveData(data);

    // Serve display HTML
    res.send(`
        <!DOCTYPE html>
        <html lang="de">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${display.name} - Digital Menuboard</title>
            <link rel="stylesheet" href="/public/css/display.css">
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
        </head>
        <body data-display-slug="${display.slug}">
            <div id="loadingScreen" class="loading-screen">
                <div class="loading-spinner"></div>
                <p>${display.name} wird geladen...</p>
            </div>
            <div id="displayContainer" class="display-container"></div>
            <script src="/public/js/display.js"></script>
            <script>
                window.DISPLAY_SLUG = '${display.slug}';
            </script>
        </body>
        </html>
    `);
});

// POST /displays/:id/heartbeat - Display heartbeat
app.post('/displays/:id/heartbeat', (req, res) => {
    const data = loadData();
    const display = (data.displays || []).find(d => d.id === req.params.id);
    if (display) {
        display.lastSeen = new Date().toISOString();
        saveData(data);
        res.json({ success: true, config: display });
    } else {
        res.status(404).json({ success: false });
    }
});

// ═══════════════════ TEMPLATES CRUD ═══════════════════

// GET /templates - Alle Templates (inkl. benutzerdefinierte)
app.get('/templates', (req, res) => {
    const data = loadData();
    res.json(data.templates || []);
});

// GET /templates/:id - Einzelnes Template
app.get('/templates/:id', (req, res) => {
    const data = loadData();
    const template = (data.templates || []).find(t => t.id === req.params.id);
    if (!template) {
        return res.status(404).json({ success: false, message: 'Template nicht gefunden' });
    }
    res.json(template);
});

// POST /templates - Template erstellen
app.post('/templates', (req, res) => {
    const data = loadData();
    if (!data.templates) data.templates = [];

    const newTemplate = {
        id: 'template-' + Date.now(),
        name: req.body.name || 'Neues Template',
        description: req.body.description || '',
        zones: req.body.zones || [],
        thumbnail: req.body.thumbnail || '',
        isDefault: false,
        createdAt: new Date().toISOString()
    };

    data.templates.push(newTemplate);
    data.lastModified = new Date().toISOString();
    if (saveData(data)) {
        res.json({ success: true, template: newTemplate });
    } else {
        res.status(500).json({ success: false });
    }
});

// PUT /templates/:id - Template aktualisieren
app.put('/templates/:id', (req, res) => {
    const data = loadData();
    if (!data.templates) data.templates = [];

    const index = data.templates.findIndex(t => t.id === req.params.id);
    if (index === -1) {
        return res.status(404).json({ success: false, message: 'Template nicht gefunden' });
    }

    // Don't allow editing default templates' isDefault flag
    const isDefault = data.templates[index].isDefault;

    data.templates[index] = { 
        ...data.templates[index], 
        ...req.body, 
        id: req.params.id,
        isDefault: isDefault, // Preserve default status
        updatedAt: new Date().toISOString()
    };
    data.lastModified = new Date().toISOString();
    if (saveData(data)) {
        res.json({ success: true, template: data.templates[index] });
    } else {
        res.status(500).json({ success: false });
    }
});

// DELETE /templates/:id - Template löschen
app.delete('/templates/:id', (req, res) => {
    const data = loadData();
    if (!data.templates) data.templates = [];

    const template = data.templates.find(t => t.id === req.params.id);
    if (template && template.isDefault) {
        return res.status(403).json({ success: false, message: 'Standard-Templates können nicht gelöscht werden' });
    }

    data.templates = data.templates.filter(t => t.id !== req.params.id);
    data.lastModified = new Date().toISOString();
    if (saveData(data)) {
        res.json({ success: true });
    } else {
        res.status(500).json({ success: false });
    }
});

// Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', version: '7.50', timestamp: new Date().toISOString() });
});

// Redirect root to admin
app.get('/', (req, res) => {
    res.redirect('/admin/index.html');
});

// Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ success: false, message: err.message || 'Server Error' });
});

// Start Server
app.listen(PORT, () => {
    console.log('╔══════════════════════════════════════════╗');
    console.log('║     DIGITAL MENUBOARD v7.50              ║');
    console.log('║     Server läuft auf Port ' + PORT + '            ║');
    console.log('╠══════════════════════════════════════════╣');
    console.log('║  Admin UI:  http://localhost:' + PORT + '/admin   ║');
    console.log('║  Display:   http://localhost:' + PORT + '/public  ║');
    console.log('║  API:       http://localhost:' + PORT + '/data    ║');
    console.log('╚══════════════════════════════════════════╝');
});

module.exports = app;
