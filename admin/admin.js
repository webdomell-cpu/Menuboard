/**
 * DIGITAL MENUBOARD v7.20 - ADMIN JS v2.1
 * Fixes: Image upload, Stock status, Font selection, Text toggle
 */

class MenuboardAdmin {
    constructor() {
        this.data = null;
        this.products = [];
        this.zones = [];
        this.templates = [];
        this.uploads = [];
        this.settings = {};
        this.displays = []; // v7.40: Multi-Display Support
        this.currentTab = 'dashboard';
        this.selectedZone = null;
        this.dragState = null;
        this.resizeState = null;
        this.history = [];
        this.historyIndex = -1;
        this.maxHistory = 50;
        this.canvasScale = 1;
        this.canvasZoom = 1;
        this.snapGrid = true;
        this.gridSize = 10;
        this.currentTool = 'select';
        this.editingTemplate = null; // v7.40: Template Editor State
        this.editingDisplay = null;  // v7.40: Display Editor State

        this.init();
    }

    async init() {
        await this.loadData();
        this.setupMobileSidebar();
        this.setupNavigation();
        this.setupEventListeners();
        this.renderAll();
        this.startAutoRefresh();
    }

    // ==================== MOBILE SIDEBAR ====================
    setupMobileSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('mobileOverlay');
        const toggle = document.getElementById('sidebarToggle');
        const close = document.getElementById('sidebarClose');

        const openSidebar = () => {
            sidebar.classList.add('open');
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        };

        const closeSidebar = () => {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        };

        toggle.addEventListener('click', openSidebar);
        close.addEventListener('click', closeSidebar);
        overlay.addEventListener('click', closeSidebar);

        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                if (window.innerWidth <= 768) closeSidebar();
            });
        });

        let touchStartX = 0;
        sidebar.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
        });
        sidebar.addEventListener('touchmove', (e) => {
            const touchX = e.touches[0].clientX;
            if (touchX - touchStartX < -50) closeSidebar();
        });
    }

    // ==================== DATA LOADING ====================
    async loadData() {
        try {
            const res = await fetch('/data');
            this.data = await res.json();
            this.products = this.data.products || [];
            this.zones = this.data.zones || [];
            this.templates = this.data.templates || [];
            this.settings = this.data.settings || {};
            this.displays = this.data.displays || []; // v7.40
            this.updateSidebarCounts();
        } catch (e) {
            this.showToast('Fehler beim Laden der Daten', 'error');
            console.error(e);
        }
    }

    async saveData() {
        try {
            this.data.products = this.products;
            this.data.zones = this.zones;
            this.data.settings = this.settings;
            this.data.templates = this.templates; // v7.40
            this.data.displays = this.displays;   // v7.40
            this.data.lastModified = new Date().toISOString();
            if (!this.data.version) this.data.version = '7.40';

            const res = await fetch('/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.data)
            });
            const result = await res.json();
            if (result.success) {
                this.showToast('Gespeichert!', 'success');
                this.updateSidebarCounts();
                this.refreshPreview();
                return true;
            }
        } catch (e) {
            this.showToast('Speichern fehlgeschlagen', 'error');
        }
        return false;
    }

    // ==================== NAVIGATION ====================
    setupNavigation() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const tab = item.dataset.tab;
                this.switchTab(tab);
            });
        });

        document.querySelectorAll('.quick-action').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const tab = item.dataset.tab;
                this.switchTab(tab);
            });
        });
    }

    switchTab(tab) {
        this.currentTab = tab;
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.tab === tab);
        });
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `tab-${tab}`);
        });

        const titles = {
            dashboard: 'Dashboard',
            products: 'Produkte',
            zones: 'Zonen',
            designer: 'Designer',
            templates: 'Templates',
            displays: 'Displays',
            media: 'Mediathek',
            schedules: 'Zeitpläne',
            features: 'Features',
            settings: 'Einstellungen'
        };
        document.getElementById('pageTitle').textContent = titles[tab] || tab;

        if (tab === 'designer') {
            setTimeout(() => this.renderDesigner(), 50);
        } else if (tab === 'media') {
            this.loadMedia();
        } else if (tab === 'schedules') {
            this.loadSchedules();
        } else if (tab === 'features') {
            this.renderWeatherSettings();
            this.renderQRSettings();
            this.renderLanguageSettings();
            this.renderAnimationSettings();
        }
    }

    // ==================== EVENT LISTENERS ====================
    setupEventListeners() {
        document.getElementById('saveAllBtn').addEventListener('click', () => this.saveData());

        document.getElementById('productSearch').addEventListener('input', () => this.renderProducts());
        document.getElementById('categoryFilter').addEventListener('change', () => this.renderProducts());

        document.getElementById('addProductBtn').addEventListener('click', () => this.openProductModal());
        document.getElementById('saveProductBtn').addEventListener('click', () => this.saveProduct());

        // FIX: Better image upload handling - use the file input directly
        const productImageUpload = document.getElementById('productImageUpload');
        const productImageFile = document.getElementById('productImageFile');

        if (productImageUpload && productImageFile) {
            productImageUpload.addEventListener('click', (e) => {
                // Only trigger if not clicking the URL input
                if (e.target.id !== 'productImageUrl') {
                    productImageFile.click();
                }
            });

            productImageFile.addEventListener('change', (e) => {
                if (e.target.files && e.target.files[0]) {
                    this.handleProductImageUpload(e);
                }
            });
        }

        document.getElementById('addZoneBtn').addEventListener('click', () => this.openZoneModal());
        document.getElementById('saveZoneBtn').addEventListener('click', () => this.saveZone());
        document.getElementById('deleteZoneBtn').addEventListener('click', () => this.deleteZone());

        document.getElementById('zoneType').addEventListener('change', (e) => this.updateZoneFormFields(e.target.value));

        // Designer tools
        document.getElementById('toolSelect').addEventListener('click', () => this.setTool('select'));
        document.getElementById('toolAddMenu').addEventListener('click', () => this.addZoneFromTool('menu'));
        document.getElementById('toolAddMedia').addEventListener('click', () => this.addZoneFromTool('media'));
        document.getElementById('toolAddTicker').addEventListener('click', () => this.addZoneFromTool('ticker'));
        document.getElementById('toolAddText').addEventListener('click', () => this.addZoneFromTool('text'));
        document.getElementById('toolAddClock').addEventListener('click', () => this.addZoneFromTool('clock'));

        document.getElementById('saveLayoutBtn').addEventListener('click', () => this.saveLayout());
        document.getElementById('undoBtn').addEventListener('click', () => this.undo());
        document.getElementById('redoBtn').addEventListener('click', () => this.redo());

        // Zoom controls
        document.getElementById('zoomIn').addEventListener('click', () => this.zoomCanvas(0.1));
        document.getElementById('zoomOut').addEventListener('click', () => this.zoomCanvas(-0.1));
        document.getElementById('zoomFit').addEventListener('click', () => this.fitCanvas());

        // Grid controls
        document.getElementById('showGrid').addEventListener('change', (e) => {
            document.getElementById('designerCanvas').classList.toggle('show-grid', e.target.checked);
        });
        document.getElementById('snapGrid').addEventListener('change', (e) => {
            this.snapGrid = e.target.checked;
        });
        document.getElementById('gridSize').addEventListener('change', (e) => {
            this.gridSize = parseInt(e.target.value) || 10;
        });

        // Media
        document.getElementById('mediaUpload').addEventListener('change', (e) => this.handleMediaUpload(e));

        // Settings
        document.getElementById('saveSettingsBtn').addEventListener('click', () => this.saveSettings());
        document.getElementById('resetSettingsBtn').addEventListener('click', () => this.resetSettings());
        document.getElementById('settingTickerSpeed').addEventListener('input', (e) => {
            e.target.nextElementSibling.textContent = e.target.value;
        });

        // Schedules
        document.getElementById('addScheduleBtn').addEventListener('click', () => this.openScheduleModal());
        document.getElementById('saveScheduleBtn').addEventListener('click', () => this.saveSchedule());

        // Features
        document.getElementById('saveFeaturesBtn').addEventListener('click', () => this.saveFeatures());

        // Modal close
        document.querySelectorAll('.modal-close, .modal-cancel, .modal-overlay').forEach(el => {
            el.addEventListener('click', () => this.closeAllModals());
        });

        // Keyboard
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'z') { e.preventDefault(); this.undo(); }
            if (e.ctrlKey && e.key === 'y') { e.preventDefault(); this.redo(); }
            if (e.key === 'Delete' && this.selectedZone) { this.deleteSelectedZone(); }
        });

        // Window resize
        window.addEventListener('resize', () => {
            if (this.currentTab === 'designer') {
                setTimeout(() => this.renderDesignerCanvas(), 100);
            }
        });
    }

    // ==================== RENDERING ====================
    renderAll() {
        this.renderDashboard();
        this.renderProducts();
        this.renderZones();
        this.renderTemplates();
        this.renderSettings();
    }

    renderDashboard() {
        document.getElementById('dash-product-count').textContent = this.products.length;
        document.getElementById('dash-zone-count').textContent = this.zones.length;
        document.getElementById('dash-template-count').textContent = this.templates.length;
        document.getElementById('last-modified').textContent = this.data?.lastModified 
            ? new Date(this.data.lastModified).toLocaleString('de-DE')
            : '-';
        const themeNames = { dark: 'Dark Mode', light: 'Light Mode', burger: 'Burger Theme', coffee: 'Coffee Theme' };
        document.getElementById('current-theme').textContent = themeNames[this.settings?.theme] || 'Dark Mode';
    }

    renderProducts() {
        const grid = document.getElementById('productsGrid');
        const search = document.getElementById('productSearch').value.toLowerCase();
        const category = document.getElementById('categoryFilter').value;

        let filtered = this.products;
        if (search) {
            filtered = filtered.filter(p => 
                p.title.toLowerCase().includes(search) || 
                p.category.toLowerCase().includes(search)
            );
        }
        if (category) filtered = filtered.filter(p => p.category === category);

        const currency = this.settings.currency || '€';

        grid.innerHTML = filtered.map(product => {
            const stockBadge = product.stockStatus === 'soldout' ? '<span class="product-badge stock-soldout">AUSVERKAUFT</span>' :
                               product.stockStatus === 'low' ? '<span class="product-badge stock-low">WENIG</span>' : '';

            return `
            <div class="product-card" data-id="${product.id}">
                <div class="product-image">
                    ${product.image ? 
                        `<img src="${product.image}" alt="${product.title}" onerror="this.parentElement.innerHTML='<div class=\'placeholder\'><i class=\'fas fa-utensils\'></i></div>'">` :
                        `<div class="placeholder"><i class="fas fa-utensils"></i></div>`
                    }
                    ${product.badge && product.stockStatus !== 'soldout' ? `<span class="product-badge ${product.badge.toLowerCase()}">${product.badge}</span>` : ''}
                    ${stockBadge}
                </div>
                <div class="product-info">
                    <div class="product-category">${product.category}</div>
                    <div class="product-title">${product.title}</div>
                    <div class="product-price">${product.stockStatus === 'soldout' ? '—' : product.price + currency}</div>
                </div>
                <div class="product-actions">
                    <button class="btn btn-outline btn-sm" onclick="admin.editProduct(${product.id})">
                        <i class="fas fa-edit"></i> <span class="btn-text">Bearbeiten</span>
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="admin.deleteProduct(${product.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `}).join('');

        if (filtered.length === 0) {
            grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 50px; color: var(--text-muted);">
                <i class="fas fa-search" style="font-size: 36px; margin-bottom: 12px;"></i>
                <p>Keine Produkte gefunden</p>
            </div>`;
        }
    }

    renderZones() {
        const list = document.getElementById('zonesList');
        const iconMap = { menu: 'utensils', media: 'image', ticker: 'scroll', text: 'font', clock: 'clock' };

        list.innerHTML = this.zones.map(zone => `
            <div class="zone-item" data-id="${zone.id}">
                <div class="zone-icon ${zone.type}">
                    <i class="fas fa-${iconMap[zone.type] || 'square'}"></i>
                </div>
                <div class="zone-details">
                    <h4>${zone.name}</h4>
                    <p>${zone.type === 'menu' ? 'Menü Zone' : zone.type === 'media' ? 'Media Zone' : zone.type === 'ticker' ? 'Ticker Zone' : zone.type === 'text' ? 'Text Zone' : 'Uhr Zone'}</p>
                    <div class="zone-meta">
                        <span><i class="fas fa-arrows-alt"></i> ${zone.x}%, ${zone.y}%</span>
                        <span><i class="fas fa-expand"></i> ${zone.w}x${zone.h}</span>
                    </div>
                </div>
                <div class="zone-actions">
                    <div class="zone-toggle ${zone.visible !== false ? 'active' : ''}" onclick="admin.toggleZoneVisibility('${zone.id}')"></div>
                    <button class="btn btn-outline btn-sm" onclick="admin.editZone('${zone.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    renderTemplates() {
        const grid = document.getElementById('templatesGrid');
        grid.innerHTML = this.templates.map(template => `
            <div class="template-card" onclick="admin.applyTemplate('${template.id}')">
                <div class="template-preview">
                    ${template.zones.map(z => `
                        <div class="mini-zone" style="left:${z.x}%;top:${z.y}%;width:${z.w}%;height:${z.h}%;">
                            ${z.type === 'menu' ? '🍔' : z.type === 'media' ? '🖼️' : z.type === 'ticker' ? '📜' : z.type === 'text' ? '📝' : '🕐'}
                        </div>
                    `).join('')}
                </div>
                <div class="template-info">
                    <h4>${template.name}</h4>
                    <p>${template.description}</p>
                </div>
            </div>
        `).join('');
    }

    renderSettings() {
        const s = this.settings;
        document.getElementById('settingTheme').value = s.theme || 'dark';
        document.getElementById('settingCurrency').value = s.currency || '€';
        document.getElementById('settingLanguage').value = s.language || 'de';
        document.getElementById('settingRefresh').value = s.refreshInterval || 30;
        document.getElementById('settingAutoRotate').checked = s.autoRotate || false;
        document.getElementById('settingShowBadges').checked = s.showBadges !== false;

        // Font setting
        const fontSelect = document.getElementById('settingFont');
        if (fontSelect) fontSelect.value = s.font || 'Inter';

        const ticker = this.data?.ticker || {};
        document.getElementById('settingTickerEnabled').checked = ticker.enabled !== false;
        document.getElementById('settingTickerSpeed').value = ticker.speed || 50;
        document.getElementById('settingTickerSpeed').nextElementSibling.textContent = ticker.speed || 50;
        document.getElementById('settingTickerColor').value = ticker.color || '#FFD700';
        document.getElementById('settingTickerBg').value = ticker.backgroundColor || '#1a1a2e';
    }

    // ==================== PRODUCT MANAGEMENT ====================
    openProductModal(product = null) {
        const modal = document.getElementById('productModal');
        const title = document.getElementById('productModalTitle');

        if (product) {
            title.textContent = 'Produkt bearbeiten';
            document.getElementById('productId').value = product.id;
            document.getElementById('productTitle').value = product.title;
            document.getElementById('productPrice').value = product.price;
            document.getElementById('productCategory').value = product.category;
            document.getElementById('productBadge').value = product.badge || '';
            document.getElementById('productDescription').value = product.description || '';
            document.getElementById('productImageUrl').value = product.image || '';

            // Stock status
            const stockSelect = document.getElementById('productStock');
            if (stockSelect) stockSelect.value = product.stockStatus || 'available';

            const preview = document.getElementById('productImagePreview');
            if (product.image) {
                preview.innerHTML = `<img src="${product.image}" alt="${product.title}">`;
            }
        } else {
            title.textContent = 'Neues Produkt';
            document.getElementById('productForm').reset();
            document.getElementById('productId').value = '';
            document.getElementById('productImagePreview').innerHTML = `
                <i class="fas fa-image"></i>
                <p>Bild hochladen oder URL eingeben</p>
            `;
            const stockSelect = document.getElementById('productStock');
            if (stockSelect) stockSelect.value = 'available';
        }

        modal.classList.add('active');
    }

    editProduct(id) {
        const product = this.products.find(p => p.id === id);
        if (product) this.openProductModal(product);
    }

    async saveProduct() {
        const id = document.getElementById('productId').value;
        const product = {
            id: id ? parseInt(id) : Date.now(),
            title: document.getElementById('productTitle').value,
            price: document.getElementById('productPrice').value,
            category: document.getElementById('productCategory').value,
            badge: document.getElementById('productBadge').value,
            description: document.getElementById('productDescription').value,
            image: document.getElementById('productImageUrl').value || '/public/assets/placeholder.png',
            stockStatus: document.getElementById('productStock')?.value || 'available'
        };

        if (id) {
            const index = this.products.findIndex(p => p.id === parseInt(id));
            if (index !== -1) this.products[index] = product;
        } else {
            this.products.push(product);
        }

        this.closeAllModals();
        this.renderProducts();
        this.saveData();
    }

    async deleteProduct(id) {
        if (!confirm('Produkt wirklich löschen?')) return;
        this.products = this.products.filter(p => p.id !== id);
        this.renderProducts();
        this.saveData();
    }

    async handleProductImageUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        // Show preview immediately
        const preview = document.getElementById('productImagePreview');
        const reader = new FileReader();
        reader.onload = (event) => {
            preview.innerHTML = `<img src="${event.target.result}" alt="Preview">`;
        };
        reader.readAsDataURL(file);

        const formData = new FormData();
        formData.append('file', file);

        try {
            this.showToast('Bild wird hochgeladen...', 'info');
            const res = await fetch('/upload', { method: 'POST', body: formData });
            const result = await res.json();
            if (result.success) {
                document.getElementById('productImageUrl').value = result.file.url;
                preview.innerHTML = `<img src="${result.file.url}" alt="Preview">`;
                this.showToast('Bild erfolgreich hochgeladen!', 'success');
            } else {
                this.showToast('Upload fehlgeschlagen: ' + (result.message || 'Unbekannter Fehler'), 'error');
            }
        } catch (err) {
            this.showToast('Upload fehlgeschlagen: ' + err.message, 'error');
            console.error('Upload error:', err);
        }
    }

    // ==================== ZONE MANAGEMENT ====================
    openZoneModal(zone = null) {
        const modal = document.getElementById('zoneModal');
        const title = document.getElementById('zoneModalTitle');

        if (zone) {
            title.textContent = 'Zone bearbeiten';
            document.getElementById('zoneId').value = zone.id;
            document.getElementById('zoneName').value = zone.name;
            document.getElementById('zoneType').value = zone.type;
            document.getElementById('zoneX').value = zone.x;
            document.getElementById('zoneY').value = zone.y;
            document.getElementById('zoneW').value = zone.w;
            document.getElementById('zoneH').value = zone.h;
            document.getElementById('zoneVisible').checked = zone.visible !== false;
            document.getElementById('zoneMediaSrc').value = zone.mediaSrc || '';
            document.getElementById('zoneMediaType').value = zone.mediaType || 'image';
            document.getElementById('zoneTickerText').value = zone.text || '';
            document.getElementById('zoneTextContent').value = zone.text || '';
            document.getElementById('zoneTextSize').value = zone.textSize || 24;
            document.getElementById('zoneTextColor').value = zone.textColor || '#ffffff';
            document.getElementById('zoneTextAlign').value = zone.textAlign || 'left';

            this.updateZoneFormFields(zone.type);

            // Artikel-Builder
            if (zone.articleStyle) {
                const s = zone.articleStyle;
                this.setToggleState('showImage', s.showImage !== false);
                this.setToggleState('showTitle', s.showTitle !== false);
                this.setToggleState('showPrice', s.showPrice !== false);
                this.setToggleState('showDescription', s.showDescription || false);
                this.setToggleState('showBadge', s.showBadge !== false);
                this.setToggleState('showStock', s.showStock !== false);
                document.getElementById('pricePosition').value = s.pricePosition || 'bottom-right';
                document.getElementById('priceStyle').value = s.priceStyle || 'badge-gold';
                document.getElementById('imageSize').value = s.imageSize || 'large';
                document.getElementById('cardLayout').value = s.cardLayout || 'vertical';
                document.getElementById('textAlign').value = s.textAlign || 'left';
                document.getElementById('columnsCount').value = s.columnsCount || 'auto';
            } else {
                // Defaults
                this.setToggleState('showImage', true);
                this.setToggleState('showTitle', true);
                this.setToggleState('showPrice', true);
                this.setToggleState('showDescription', false);
                this.setToggleState('showBadge', true);
                this.setToggleState('showStock', true);
                document.getElementById('pricePosition').value = 'bottom-right';
                document.getElementById('priceStyle').value = 'badge-gold';
                document.getElementById('imageSize').value = 'large';
                document.getElementById('cardLayout').value = 'vertical';
                document.getElementById('textAlign').value = 'left';
                document.getElementById('columnsCount').value = 'auto';
            }

            this.renderZoneProductSelector(zone.productIds || []);
        } else {
            title.textContent = 'Neue Zone';
            document.getElementById('zoneForm').reset();
            document.getElementById('zoneId').value = '';
            document.getElementById('zoneType').value = 'menu';
            this.updateZoneFormFields('menu');
            this.setToggleState('showImage', true);
            this.setToggleState('showTitle', true);
            this.setToggleState('showPrice', true);
            this.setToggleState('showDescription', false);
            this.setToggleState('showBadge', true);
            this.setToggleState('showStock', true);
            this.renderZoneProductSelector([]);
        }

        modal.classList.add('active');
    }

    // Helper to set toggle state visually
    setToggleState(id, checked) {
        const checkbox = document.getElementById(id);
        if (checkbox) checkbox.checked = checked;
    }

    editZone(id) {
        const zone = this.zones.find(z => z.id === id);
        if (zone) this.openZoneModal(zone);
    }

    updateZoneFormFields(type) {
        const groups = ['zoneArticlesGroup', 'zoneMediaGroup', 'zoneTickerGroup', 'zoneTextGroup'];
        groups.forEach(g => document.getElementById(g).style.display = 'none');

        if (type === 'menu') document.getElementById('zoneArticlesGroup').style.display = 'block';
        else if (type === 'media') document.getElementById('zoneMediaGroup').style.display = 'block';
        else if (type === 'ticker') document.getElementById('zoneTickerGroup').style.display = 'block';
        else if (type === 'text') document.getElementById('zoneTextGroup').style.display = 'block';
    }

    renderZoneProductSelector(selectedIds = []) {
        const container = document.getElementById('zoneProductSelector');
        container.innerHTML = this.products.map(p => `
            <label class="zone-product-item">
                <input type="checkbox" value="${p.id}" ${selectedIds.includes(p.id) ? 'checked' : ''}>
                <span>${p.title}</span>
            </label>
        `).join('');
    }

    async saveZone() {
        const id = document.getElementById('zoneId').value;
        const type = document.getElementById('zoneType').value;

        const zone = {
            id: id || 'zone-' + Date.now(),
            name: document.getElementById('zoneName').value,
            type: type,
            x: parseFloat(document.getElementById('zoneX').value) || 0,
            y: parseFloat(document.getElementById('zoneY').value) || 0,
            w: parseFloat(document.getElementById('zoneW').value) || 20,
            h: parseFloat(document.getElementById('zoneH').value) || 20,
            visible: document.getElementById('zoneVisible').checked
        };

        if (type === 'menu') {
            const checkboxes = document.querySelectorAll('#zoneProductSelector input:checked');
            zone.productIds = Array.from(checkboxes).map(cb => parseInt(cb.value));

            // Artikel-Builder Settings
            zone.articleStyle = {
                showImage: document.getElementById('showImage').checked,
                showTitle: document.getElementById('showTitle').checked,
                showPrice: document.getElementById('showPrice').checked,
                showDescription: document.getElementById('showDescription').checked,
                showBadge: document.getElementById('showBadge').checked,
                showStock: document.getElementById('showStock').checked,
                pricePosition: document.getElementById('pricePosition').value,
                priceStyle: document.getElementById('priceStyle').value,
                imageSize: document.getElementById('imageSize').value,
                cardLayout: document.getElementById('cardLayout').value,
                textAlign: document.getElementById('textAlign').value,
                columnsCount: document.getElementById('columnsCount').value
            };
        } else if (type === 'media') {
            zone.mediaSrc = document.getElementById('zoneMediaSrc').value;
            zone.mediaType = document.getElementById('zoneMediaType').value;
        } else if (type === 'ticker') {
            zone.text = document.getElementById('zoneTickerText').value;
        } else if (type === 'text') {
            zone.text = document.getElementById('zoneTextContent').value;
            zone.textSize = parseInt(document.getElementById('zoneTextSize').value) || 24;
            zone.textColor = document.getElementById('zoneTextColor').value;
            zone.textAlign = document.getElementById('zoneTextAlign').value;
        }

        if (id) {
            const index = this.zones.findIndex(z => z.id === id);
            if (index !== -1) this.zones[index] = zone;
        } else {
            this.zones.push(zone);
        }

        this.closeAllModals();
        this.renderZones();
        this.saveData();
        if (this.currentTab === 'designer') this.renderDesignerCanvas();
    }

    async deleteZone() {
        const id = document.getElementById('zoneId').value;
        if (!id || !confirm('Zone wirklich löschen?')) return;
        this.zones = this.zones.filter(z => z.id !== id);
        this.closeAllModals();
        this.renderZones();
        this.saveData();
        if (this.currentTab === 'designer') this.renderDesignerCanvas();
    }

    async toggleZoneVisibility(id) {
        const zone = this.zones.find(z => z.id === id);
        if (zone) {
            zone.visible = zone.visible === false ? true : false;
            this.renderZones();
            this.saveData();
        }
    }

    // ==================== DESIGNER ====================
    renderDesigner() {
        this.renderDesignerCanvas();
        this.renderTemplateButtons();
        this.setupDesignerEvents();
        this.fitCanvas();
    }

    renderDesignerCanvas() {
        const canvas = document.getElementById('designerCanvas');
        const layout = this.data?.layout || { width: 1920, height: 1080 };

        canvas.style.width = layout.width + 'px';
        canvas.style.height = layout.height + 'px';

        canvas.innerHTML = '';

        const iconMap = { menu: 'utensils', media: 'image', ticker: 'scroll', text: 'font', clock: 'clock' };
        const previewMap = { menu: 'Menü', media: 'Media', ticker: 'Ticker', text: 'Text', clock: 'Uhr' };

        this.zones.forEach((zone, index) => {
            const el = document.createElement('div');
            el.className = `canvas-zone ${zone.visible === false ? 'hidden' : ''} ${this.selectedZone === zone.id ? 'selected' : ''}`;
            el.dataset.id = zone.id;
            el.style.left = zone.x + '%';
            el.style.top = zone.y + '%';
            el.style.width = zone.w + '%';
            el.style.height = zone.h + '%';

            el.innerHTML = `
                <div class="zone-header">
                    <span>${zone.name}</span>
                    <i class="fas fa-${iconMap[zone.type] || 'square'}"></i>
                </div>
                <div class="zone-content">
                    <div class="zone-preview-text">
                        <i class="fas fa-${iconMap[zone.type] || 'square'} zone-type-icon"></i><br>
                        ${previewMap[zone.type] || 'Zone'}
                    </div>
                </div>
                <div class="resize-handle nw" data-handle="nw"></div>
                <div class="resize-handle ne" data-handle="ne"></div>
                <div class="resize-handle sw" data-handle="sw"></div>
                <div class="resize-handle se" data-handle="se"></div>
                <div class="resize-handle n" data-handle="n"></div>
                <div class="resize-handle s" data-handle="s"></div>
                <div class="resize-handle w" data-handle="w"></div>
                <div class="resize-handle e" data-handle="e"></div>
            `;

            canvas.appendChild(el);
        });

        document.getElementById('canvasSize').textContent = `${layout.width} x ${layout.height}`;
    }

    renderTemplateButtons() {
        const container = document.getElementById('templateButtons');
        container.innerHTML = this.templates.map(t => `
            <button class="template-btn" onclick="admin.applyTemplate('${t.id}')">
                <i class="fas fa-magic"></i>
                <span>${t.name}</span>
            </button>
        `).join('');
    }

    // Canvas Zoom
    zoomCanvas(delta) {
        this.canvasZoom = Math.max(0.2, Math.min(3, this.canvasZoom + delta));
        this.applyZoom();
    }

    fitCanvas() {
        const canvas = document.getElementById('designerCanvas');
        const wrapper = document.querySelector('.designer-canvas-outer');
        const layout = this.data?.layout || { width: 1920, height: 1080 };

        const padding = 40;
        const availableW = wrapper.clientWidth - padding;
        const availableH = wrapper.clientHeight - padding;

        const scaleX = availableW / layout.width;
        const scaleY = availableH / layout.height;
        this.canvasZoom = Math.min(scaleX, scaleY, 1);

        this.applyZoom();
    }

    applyZoom() {
        const canvas = document.getElementById('designerCanvas');
        canvas.style.transform = `scale(${this.canvasZoom})`;
        document.getElementById('zoomLevel').textContent = Math.round(this.canvasZoom * 100) + '%';
    }

    setupDesignerEvents() {
        const canvas = document.getElementById('designerCanvas');

        canvas.addEventListener('mousedown', (e) => {
            const zoneEl = e.target.closest('.canvas-zone');
            const handle = e.target.closest('.resize-handle');

            if (handle) {
                const zoneId = handle.closest('.canvas-zone').dataset.id;
                this.startResize(e, zoneId, handle.dataset.handle);
            } else if (zoneEl) {
                this.selectZone(zoneEl.dataset.id);
                this.startDrag(e, zoneEl.dataset.id);
            } else {
                this.selectedZone = null;
                this.renderDesignerCanvas();
                this.updatePropertiesPanel();
            }
        });

        canvas.addEventListener('touchstart', (e) => {
            const touch = e.touches[0];
            const zoneEl = document.elementFromPoint(touch.clientX, touch.clientY)?.closest('.canvas-zone');
            if (zoneEl) {
                this.selectZone(zoneEl.dataset.id);
                this.startDrag({ clientX: touch.clientX, clientY: touch.clientY }, zoneEl.dataset.id);
            }
        }, { passive: false });

        document.addEventListener('mousemove', (e) => {
            if (this.dragState) this.handleDrag(e);
            if (this.resizeState) this.handleResize(e);
        });

        document.addEventListener('touchmove', (e) => {
            if (this.dragState) {
                const touch = e.touches[0];
                this.handleDrag({ clientX: touch.clientX, clientY: touch.clientY });
            }
        }, { passive: false });

        document.addEventListener('mouseup', () => this.endInteraction());
        document.addEventListener('touchend', () => this.endInteraction());
    }

    endInteraction() {
        if (this.dragState || this.resizeState) {
            this.pushHistory();
        }
        this.dragState = null;
        this.resizeState = null;
    }

    selectZone(id) {
        this.selectedZone = id;
        this.renderDesignerCanvas();
        this.updatePropertiesPanel();

        const zone = this.zones.find(z => z.id === id);
        document.getElementById('selectedZone').textContent = zone 
            ? `${zone.name} (${zone.x}%, ${zone.y}% / ${zone.w}x${zone.h})` 
            : 'Keine Zone ausgewählt';
    }

    updatePropertiesPanel() {
        const panel = document.getElementById('propertiesPanel');
        const zone = this.zones.find(z => z.id === this.selectedZone);

        if (!zone) {
            panel.innerHTML = '<p class="properties-empty">Wähle eine Zone aus</p>';
            return;
        }

        panel.innerHTML = `
            <div class="prop-row">
                <label>Name</label>
                <input type="text" value="${zone.name}" onchange="admin.updateZoneProp('${zone.id}', 'name', this.value)">
            </div>
            <div class="prop-row">
                <label>Typ</label>
                <select onchange="admin.updateZoneProp('${zone.id}', 'type', this.value)">
                    <option value="menu" ${zone.type === 'menu' ? 'selected' : ''}>Menü</option>
                    <option value="media" ${zone.type === 'media' ? 'selected' : ''}>Media</option>
                    <option value="ticker" ${zone.type === 'ticker' ? 'selected' : ''}>Ticker</option>
                    <option value="text" ${zone.type === 'text' ? 'selected' : ''}>Text</option>
                    <option value="clock" ${zone.type === 'clock' ? 'selected' : ''}>Uhr</option>
                </select>
            </div>
            <div class="prop-row">
                <label>Position X (%)</label>
                <input type="number" step="0.1" value="${zone.x}" onchange="admin.updateZoneProp('${zone.id}', 'x', parseFloat(this.value))">
            </div>
            <div class="prop-row">
                <label>Position Y (%)</label>
                <input type="number" step="0.1" value="${zone.y}" onchange="admin.updateZoneProp('${zone.id}', 'y', parseFloat(this.value))">
            </div>
            <div class="prop-row">
                <label>Breite (%)</label>
                <input type="number" step="0.1" value="${zone.w}" onchange="admin.updateZoneProp('${zone.id}', 'w', parseFloat(this.value))">
            </div>
            <div class="prop-row">
                <label>Höhe (%)</label>
                <input type="number" step="0.1" value="${zone.h}" onchange="admin.updateZoneProp('${zone.id}', 'h', parseFloat(this.value))">
            </div>
            <div class="prop-row">
                <label class="toggle-switch">
                    <input type="checkbox" ${zone.visible !== false ? 'checked' : ''} onchange="admin.updateZoneProp('${zone.id}', 'visible', this.checked)">
                    <span class="toggle-slider"></span>
                    <span class="toggle-label">Sichtbar</span>
                </label>
            </div>
            <button class="btn btn-danger btn-sm btn-block" onclick="admin.deleteSelectedZone()" style="margin-top:8px;">
                <i class="fas fa-trash"></i> Zone löschen
            </button>
        `;
    }

    updateZoneProp(id, prop, value) {
        const zone = this.zones.find(z => z.id === id);
        if (zone) {
            zone[prop] = value;
            this.renderDesignerCanvas();
            this.updatePropertiesPanel();
        }
    }

    startDrag(e, zoneId) {
        const zone = this.zones.find(z => z.id === zoneId);
        if (!zone) return;

        const canvas = document.getElementById('designerCanvas');
        const rect = canvas.getBoundingClientRect();

        this.dragState = {
            zoneId,
            startX: e.clientX,
            startY: e.clientY,
            startZoneX: zone.x,
            startZoneY: zone.y,
            canvasW: rect.width / this.canvasZoom,
            canvasH: rect.height / this.canvasZoom
        };
    }

    handleDrag(e) {
        if (!this.dragState) return;

        const ds = this.dragState;
        const dx = ((e.clientX - ds.startX) / this.canvasZoom) / ds.canvasW * 100;
        const dy = ((e.clientY - ds.startY) / this.canvasZoom) / ds.canvasH * 100;

        let newX = ds.startZoneX + dx;
        let newY = ds.startZoneY + dy;

        const zone = this.zones.find(z => z.id === ds.zoneId);
        if (!zone) return;

        if (this.snapGrid) {
            const gridSize = this.gridSize || 10;
            newX = Math.round(newX / gridSize) * gridSize;
            newY = Math.round(newY / gridSize) * gridSize;
        }

        newX = Math.max(0, Math.min(100 - zone.w, newX));
        newY = Math.max(0, Math.min(100 - zone.h, newY));

        zone.x = parseFloat(newX.toFixed(1));
        zone.y = parseFloat(newY.toFixed(1));

        this.renderDesignerCanvas();
        this.updatePropertiesPanel();
    }

    startResize(e, zoneId, handle) {
        const zone = this.zones.find(z => z.id === zoneId);
        if (!zone) return;

        const canvas = document.getElementById('designerCanvas');
        const rect = canvas.getBoundingClientRect();

        this.resizeState = {
            zoneId,
            handle,
            startX: e.clientX,
            startY: e.clientY,
            startX_pct: zone.x,
            startY_pct: zone.y,
            startW: zone.w,
            startH: zone.h,
            canvasW: rect.width / this.canvasZoom,
            canvasH: rect.height / this.canvasZoom
        };
    }

    handleResize(e) {
        if (!this.resizeState) return;

        const rs = this.resizeState;
        const dx = ((e.clientX - rs.startX) / this.canvasZoom) / rs.canvasW * 100;
        const dy = ((e.clientY - rs.startY) / this.canvasZoom) / rs.canvasH * 100;

        const zone = this.zones.find(z => z.id === rs.zoneId);
        if (!zone) return;

        const gridSize = this.gridSize || 10;

        switch (rs.handle) {
            case 'se':
                zone.w = Math.max(5, Math.min(100 - zone.x, Math.round((rs.startW + dx) / gridSize) * gridSize));
                zone.h = Math.max(5, Math.min(100 - zone.y, Math.round((rs.startH + dy) / gridSize) * gridSize));
                break;
            case 'nw':
                zone.x = Math.max(0, Math.min(rs.startX_pct + rs.startW - 5, Math.round((rs.startX_pct + dx) / gridSize) * gridSize));
                zone.y = Math.max(0, Math.min(rs.startY_pct + rs.startH - 5, Math.round((rs.startY_pct + dy) / gridSize) * gridSize));
                zone.w = Math.max(5, Math.round((rs.startW - dx) / gridSize) * gridSize);
                zone.h = Math.max(5, Math.round((rs.startH - dy) / gridSize) * gridSize);
                break;
            case 'ne':
                zone.y = Math.max(0, Math.min(rs.startY_pct + rs.startH - 5, Math.round((rs.startY_pct + dy) / gridSize) * gridSize));
                zone.w = Math.max(5, Math.min(100 - zone.x, Math.round((rs.startW + dx) / gridSize) * gridSize));
                zone.h = Math.max(5, Math.round((rs.startH - dy) / gridSize) * gridSize);
                break;
            case 'sw':
                zone.x = Math.max(0, Math.min(rs.startX_pct + rs.startW - 5, Math.round((rs.startX_pct + dx) / gridSize) * gridSize));
                zone.w = Math.max(5, Math.round((rs.startW - dx) / gridSize) * gridSize);
                zone.h = Math.max(5, Math.min(100 - zone.y, Math.round((rs.startH + dy) / gridSize) * gridSize));
                break;
            case 'e':
                zone.w = Math.max(5, Math.min(100 - zone.x, Math.round((rs.startW + dx) / gridSize) * gridSize));
                break;
            case 'w':
                zone.x = Math.max(0, Math.min(rs.startX_pct + rs.startW - 5, Math.round((rs.startX_pct + dx) / gridSize) * gridSize));
                zone.w = Math.max(5, Math.round((rs.startW - dx) / gridSize) * gridSize);
                break;
            case 's':
                zone.h = Math.max(5, Math.min(100 - zone.y, Math.round((rs.startH + dy) / gridSize) * gridSize));
                break;
            case 'n':
                zone.y = Math.max(0, Math.min(rs.startY_pct + rs.startH - 5, Math.round((rs.startY_pct + dy) / gridSize) * gridSize));
                zone.h = Math.max(5, Math.round((rs.startH - dy) / gridSize) * gridSize);
                break;
        }

        this.renderDesignerCanvas();
        this.updatePropertiesPanel();
    }

    setTool(tool) {
        this.currentTool = tool;
        document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`tool${tool.charAt(0).toUpperCase() + tool.slice(1)}`)?.classList.add('active');
    }

    addZoneFromTool(type) {
        this.pushHistory();

        const names = { menu: 'Menü Zone', media: 'Media Zone', ticker: 'Ticker Zone', text: 'Text Zone', clock: 'Uhr Zone' };
        const newZone = {
            id: 'zone-' + Date.now(),
            name: names[type] + ' ' + (this.zones.filter(z => z.type === type).length + 1),
            type: type,
            x: 10,
            y: 10,
            w: 30,
            h: 30,
            visible: true
        };

        if (type === 'menu') {
            newZone.productIds = this.products.slice(0, 4).map(p => p.id);
            newZone.articleStyle = {
                showImage: true, showTitle: true, showPrice: true,
                showDescription: false, showBadge: true, showStock: true,
                pricePosition: 'bottom-right', priceStyle: 'badge-gold',
                imageSize: 'large', cardLayout: 'vertical',
                textAlign: 'left', columnsCount: 'auto'
            };
        } else if (type === 'media') {
            newZone.mediaSrc = '/uploads/promo1.jpg';
            newZone.mediaType = 'image';
        } else if (type === 'ticker') {
            newZone.text = '🍔 Willkommen!';
        } else if (type === 'text') {
            newZone.text = 'Neuer Text';
            newZone.textSize = 24;
            newZone.textColor = '#ffffff';
            newZone.textAlign = 'left';
        }

        this.zones.push(newZone);
        this.selectZone(newZone.id);
        this.renderZones();
    }

    deleteSelectedZone() {
        if (!this.selectedZone || !confirm('Zone wirklich löschen?')) return;
        this.zones = this.zones.filter(z => z.id !== this.selectedZone);
        this.selectedZone = null;
        this.renderDesignerCanvas();
        this.updatePropertiesPanel();
        this.renderZones();
    }

    async applyTemplate(templateId) {
        if (!confirm('Aktuelles Layout überschreiben?')) return;

        try {
            const res = await fetch('/apply-template', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ templateId })
            });
            const result = await res.json();
            if (result.success) {
                this.zones = result.zones;
                this.pushHistory();
                this.renderDesignerCanvas();
                this.renderZones();
                this.showToast('Template angewendet!', 'success');
            }
        } catch (e) {
            this.showToast('Template konnte nicht angewendet werden', 'error');
        }
    }

    async saveLayout() {
        await this.saveData();
    }

    // ==================== HISTORY ====================
    pushHistory() {
        const snapshot = JSON.stringify(this.zones);
        if (this.historyIndex >= 0 && this.history[this.historyIndex] === snapshot) return;

        this.history = this.history.slice(0, this.historyIndex + 1);
        this.history.push(snapshot);
        if (this.history.length > this.maxHistory) this.history.shift();
        this.historyIndex = this.history.length - 1;
    }

    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.zones = JSON.parse(this.history[this.historyIndex]);
            this.renderDesignerCanvas();
            this.renderZones();
            this.showToast('Rückgängig', 'info');
        }
    }

    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.zones = JSON.parse(this.history[this.historyIndex]);
            this.renderDesignerCanvas();
            this.renderZones();
            this.showToast('Wiederholt', 'info');
        }
    }

    // ==================== MEDIA ====================
    async loadMedia() {
        try {
            const res = await fetch('/uploads-list');
            const result = await res.json();
            if (result.success) {
                this.uploads = result.uploads;
                this.renderMedia();
                document.getElementById('dash-media-count').textContent = this.uploads.length;
            }
        } catch (e) {
            console.error('Media load error:', e);
        }
    }

    renderMedia() {
        const grid = document.getElementById('mediaGrid');

        grid.innerHTML = this.uploads.map(file => {
            const isVideo = /\.(mp4|webm|mov)$/i.test(file.filename);
            const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(file.filename);

            return `
                <div class="media-item">
                    <div class="media-thumb">
                        ${isImage ? `<img src="${file.url}" alt="${file.filename}">` :
                          isVideo ? `<video src="${file.url}" muted></video>` :
                          `<i class="fas fa-file media-icon"></i>`}
                    </div>
                    <div class="media-info">
                        <p>${file.filename}</p>
                        <span>${this.formatBytes(file.size)}</span>
                    </div>
                    <button class="media-delete" onclick="admin.deleteMedia('${file.filename}')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
        }).join('');

        if (this.uploads.length === 0) {
            grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 50px; color: var(--text-muted);">
                <i class="fas fa-images" style="font-size: 36px; margin-bottom: 12px;"></i>
                <p>Noch keine Medien hochgeladen</p>
            </div>`;
        }
    }

    async handleMediaUpload(e) {
        const files = e.target.files;
        if (!files.length) return;

        const formData = new FormData();
        for (let file of files) {
            formData.append('files', file);
        }

        try {
            const res = await fetch('/upload-multiple', { method: 'POST', body: formData });
            const result = await res.json();
            if (result.success) {
                this.showToast(`${result.files.length} Dateien hochgeladen`, 'success');
                this.loadMedia();
            }
        } catch (err) {
            this.showToast('Upload fehlgeschlagen', 'error');
        }
    }

    async deleteMedia(filename) {
        if (!confirm('Datei wirklich löschen?')) return;
        try {
            const res = await fetch(`/uploads/${filename}`, { method: 'DELETE' });
            const result = await res.json();
            if (result.success) {
                this.showToast('Datei gelöscht', 'success');
                this.loadMedia();
            }
        } catch (e) {
            this.showToast('Löschen fehlgeschlagen', 'error');
        }
    }

    // ==================== SETTINGS ====================
    async saveSettings() {
        this.settings.theme = document.getElementById('settingTheme').value;
        this.settings.currency = document.getElementById('settingCurrency').value;
        this.settings.language = document.getElementById('settingLanguage').value;
        this.settings.refreshInterval = parseInt(document.getElementById('settingRefresh').value);
        this.settings.autoRotate = document.getElementById('settingAutoRotate').checked;
        this.settings.showBadges = document.getElementById('settingShowBadges').checked;

        // Font setting
        const fontSelect = document.getElementById('settingFont');
        if (fontSelect) this.settings.font = fontSelect.value;

        this.data.ticker = {
            enabled: document.getElementById('settingTickerEnabled').checked,
            speed: parseInt(document.getElementById('settingTickerSpeed').value),
            direction: 'left',
            fontSize: 24,
            color: document.getElementById('settingTickerColor').value,
            backgroundColor: document.getElementById('settingTickerBg').value
        };

        const resVal = document.getElementById('settingResolution').value;
        const [w, h] = resVal.split('x').map(Number);
        this.data.layout = { ...this.data.layout, width: w, height: h };

        await this.saveData();
        this.renderDashboard();
    }

    resetSettings() {
        if (!confirm('Alle Einstellungen auf Standard zurücksetzen?')) return;
        this.settings = {
            theme: 'dark', currency: '€', language: 'de',
            refreshInterval: 30, autoRotate: false, showBadges: true,
            font: 'Inter'
        };
        this.data.ticker = {
            enabled: true, speed: 50, direction: 'left',
            fontSize: 24, color: '#FFD700', backgroundColor: '#1a1a2e'
        };
        this.renderSettings();
        this.saveData();
    }

    // ==================== UTILITIES ====================
    updateSidebarCounts() {
        document.getElementById('product-count').textContent = this.products.length;
        document.getElementById('zone-count').textContent = this.zones.length;
    }

    refreshPreview() {
        const iframe = document.getElementById('livePreview');
        if (iframe) iframe.src = iframe.src;
    }

    startAutoRefresh() {
        setInterval(() => {
            if (this.currentTab === 'dashboard') this.refreshPreview();
        }, 30000);
    }

    closeAllModals() {
        document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        const icons = { success: 'check-circle', error: 'exclamation-circle', warning: 'exclamation-triangle', info: 'info-circle' };
        toast.innerHTML = `<i class="fas fa-${icons[type]}"></i><span>${message}</span>`;

        container.appendChild(toast);
        setTimeout(() => toast.remove(), 3300);
    }


    // ==================== TEMPLATES CRUD (v7.40) ====================

    async loadTemplates() {
        try {
            const res = await fetch('/templates');
            this.templates = await res.json();
            this.renderTemplates();
            document.getElementById('dash-template-count').textContent = this.templates.length;
        } catch (e) {
            console.error('Template load error:', e);
        }
    }

    renderTemplates() {
        const grid = document.getElementById('templatesGrid');
        if (!grid) return;

        grid.innerHTML = this.templates.map(template => {
            const isDefault = template.isDefault;
            const zoneCount = template.zones?.length || 0;

            return `
            <div class="template-card ${isDefault ? 'template-default' : 'template-custom'}" data-id="${template.id}">
                <div class="template-preview">
                    ${template.zones?.map(z => `
                        <div class="mini-zone" style="left:${z.x}%;top:${z.y}%;width:${z.w}%;height:${z.h}%;">
                            ${z.type === 'menu' ? '🍔' : z.type === 'media' ? '🖼️' : z.type === 'ticker' ? '📜' : z.type === 'text' ? '📝' : '🕐'}
                        </div>
                    `).join('') || ''}
                    ${isDefault ? '<span class="template-default-badge">Standard</span>' : ''}
                </div>
                <div class="template-info">
                    <h4>${template.name}</h4>
                    <p>${template.description || ''}</p>
                    <div class="template-meta">
                        <span><i class="fas fa-th"></i> ${zoneCount} Zonen</span>
                        <span><i class="fas fa-clock"></i> ${template.createdAt ? new Date(template.createdAt).toLocaleDateString('de-DE') : 'Standard'}</span>
                    </div>
                </div>
                <div class="template-actions">
                    <button class="btn btn-primary btn-sm" onclick="admin.applyTemplate('${template.id}')">
                        <i class="fas fa-check"></i> Anwenden
                    </button>
                    <button class="btn btn-outline btn-sm" onclick="admin.editTemplate('${template.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    ${!isDefault ? `<button class="btn btn-danger btn-sm" onclick="admin.deleteTemplate('${template.id}')"><i class="fas fa-trash"></i></button>` : ''}
                </div>
            </div>
        `}).join('');

        if (this.templates.length === 0) {
            grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 50px; color: var(--text-muted);">
                <i class="fas fa-layer-group" style="font-size: 36px; margin-bottom: 12px;"></i>
                <p>Keine Templates vorhanden</p>
            </div>`;
        }
    }

    openTemplateModal(template = null) {
        const modal = document.getElementById('templateModal');
        const title = document.getElementById('templateModalTitle');

        this.editingTemplate = template;

        if (template) {
            title.textContent = 'Template bearbeiten';
            document.getElementById('templateId').value = template.id;
            document.getElementById('templateName').value = template.name;
            document.getElementById('templateDescription').value = template.description || '';
            this.renderTemplateZoneEditor(template.zones || []);
        } else {
            title.textContent = 'Neues Template';
            document.getElementById('templateForm').reset();
            document.getElementById('templateId').value = '';
            this.renderTemplateZoneEditor([]);
        }

        modal.classList.add('active');
    }

    editTemplate(id) {
        const template = this.templates.find(t => t.id === id);
        if (template) this.openTemplateModal(template);
    }

    async saveTemplate() {
        const id = document.getElementById('templateId').value;
        const template = {
            id: id || 'template-' + Date.now(),
            name: document.getElementById('templateName').value,
            description: document.getElementById('templateDescription').value,
            zones: this.getTemplateZonesFromEditor(),
            isDefault: false
        };

        try {
            if (id) {
                // Update existing
                const res = await fetch(`/templates/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(template)
                });
                const result = await res.json();
                if (result.success) {
                    const idx = this.templates.findIndex(t => t.id === id);
                    if (idx !== -1) this.templates[idx] = result.template;
                    this.showToast('Template aktualisiert!', 'success');
                }
            } else {
                // Create new
                const res = await fetch('/templates', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(template)
                });
                const result = await res.json();
                if (result.success) {
                    this.templates.push(result.template);
                    this.showToast('Template erstellt!', 'success');
                }
            }
            this.closeAllModals();
            this.renderTemplates();
            this.saveData();
        } catch (e) {
            this.showToast('Fehler beim Speichern des Templates', 'error');
        }
    }

    async deleteTemplate(id) {
        const template = this.templates.find(t => t.id === id);
        if (template?.isDefault) {
            this.showToast('Standard-Templates können nicht gelöscht werden', 'warning');
            return;
        }
        if (!confirm('Template wirklich löschen?')) return;

        try {
            const res = await fetch(`/templates/${id}`, { method: 'DELETE' });
            const result = await res.json();
            if (result.success) {
                this.templates = this.templates.filter(t => t.id !== id);
                this.renderTemplates();
                this.showToast('Template gelöscht', 'success');
            }
        } catch (e) {
            this.showToast('Löschen fehlgeschlagen', 'error');
        }
    }

    renderTemplateZoneEditor(zones) {
        const container = document.getElementById('templateZoneEditor');
        if (!container) return;

        container.innerHTML = zones.map((z, i) => `
            <div class="template-zone-item" data-index="${i}">
                <div class="form-row">
                    <div class="form-group">
                        <label>Name</label>
                        <input type="text" class="tz-name" value="${z.name}" placeholder="Zonen-Name">
                    </div>
                    <div class="form-group">
                        <label>Typ</label>
                        <select class="tz-type">
                            <option value="menu" ${z.type === 'menu' ? 'selected' : ''}>Menü</option>
                            <option value="media" ${z.type === 'media' ? 'selected' : ''}>Media</option>
                            <option value="ticker" ${z.type === 'ticker' ? 'selected' : ''}>Ticker</option>
                            <option value="text" ${z.type === 'text' ? 'selected' : ''}>Text</option>
                            <option value="clock" ${z.type === 'clock' ? 'selected' : ''}>Uhr</option>
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>X (%)</label>
                        <input type="number" class="tz-x" value="${z.x}" step="0.1">
                    </div>
                    <div class="form-group">
                        <label>Y (%)</label>
                        <input type="number" class="tz-y" value="${z.y}" step="0.1">
                    </div>
                    <div class="form-group">
                        <label>W (%)</label>
                        <input type="number" class="tz-w" value="${z.w}" step="0.1">
                    </div>
                    <div class="form-group">
                        <label>H (%)</label>
                        <input type="number" class="tz-h" value="${z.h}" step="0.1">
                    </div>
                </div>
                <button type="button" class="btn btn-danger btn-sm" onclick="this.closest('.template-zone-item').remove()">
                    <i class="fas fa-trash"></i> Zone entfernen
                </button>
            </div>
        `).join('');
    }

    getTemplateZonesFromEditor() {
        const items = document.querySelectorAll('#templateZoneEditor .template-zone-item');
        return Array.from(items).map(item => ({
            id: 'zone-' + Math.random().toString(36).substr(2, 9),
            name: item.querySelector('.tz-name').value || 'Zone',
            type: item.querySelector('.tz-type').value,
            x: parseFloat(item.querySelector('.tz-x').value) || 0,
            y: parseFloat(item.querySelector('.tz-y').value) || 0,
            w: parseFloat(item.querySelector('.tz-w').value) || 20,
            h: parseFloat(item.querySelector('.tz-h').value) || 20,
            visible: true
        }));
    }

    addTemplateZone() {
        const container = document.getElementById('templateZoneEditor');
        const index = container.querySelectorAll('.template-zone-item').length;
        const div = document.createElement('div');
        div.className = 'template-zone-item';
        div.dataset.index = index;
        div.innerHTML = `
            <div class="form-row">
                <div class="form-group">
                    <label>Name</label>
                    <input type="text" class="tz-name" value="Neue Zone" placeholder="Zonen-Name">
                </div>
                <div class="form-group">
                    <label>Typ</label>
                    <select class="tz-type">
                        <option value="menu">Menü</option>
                        <option value="media">Media</option>
                        <option value="ticker">Ticker</option>
                        <option value="text">Text</option>
                        <option value="clock">Uhr</option>
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>X (%)</label><input type="number" class="tz-x" value="10" step="0.1"></div>
                <div class="form-group"><label>Y (%)</label><input type="number" class="tz-y" value="10" step="0.1"></div>
                <div class="form-group"><label>W (%)</label><input type="number" class="tz-w" value="30" step="0.1"></div>
                <div class="form-group"><label>H (%)</label><input type="number" class="tz-h" value="30" step="0.1"></div>
            </div>
            <button type="button" class="btn btn-danger btn-sm" onclick="this.closest('.template-zone-item').remove()">
                <i class="fas fa-trash"></i> Zone entfernen
            </button>
        `;
        container.appendChild(div);
    }

    // ==================== MULTI-DISPLAY (v7.40) ====================

    async loadDisplays() {
        try {
            const res = await fetch('/displays');
            this.displays = await res.json();
            this.renderDisplays();
        } catch (e) {
            console.error('Display load error:', e);
        }
    }

    renderDisplays() {
        const container = document.getElementById('displaysList');
        if (!container) return;

        container.innerHTML = this.displays.map(display => {
            const template = this.templates.find(t => t.id === display.templateId);
            const isOnline = display.lastSeen && (new Date() - new Date(display.lastSeen)) < 60000;

            return `
            <div class="display-card ${display.active ? '' : 'display-inactive'}" data-id="${display.id}">
                <div class="display-header">
                    <div class="display-status ${isOnline ? 'online' : 'offline'}"></div>
                    <h4>${display.name}</h4>
                    <span class="display-slug">/${display.slug}</span>
                </div>
                <div class="display-body">
                    <p class="display-desc">${display.description || 'Keine Beschreibung'}</p>
                    <div class="display-meta">
                        <span><i class="fas fa-layer-group"></i> ${template?.name || 'Kein Template'}</span>
                        <span><i class="fas fa-power-off"></i> ${display.active ? 'Aktiv' : 'Inaktiv'}</span>
                    </div>
                    <div class="display-url">
                        <code>${window.location.origin}/display/${display.slug}</code>
                        <button class="btn btn-sm btn-outline" onclick="admin.copyDisplayUrl('${display.slug}')">
                            <i class="fas fa-copy"></i>
                        </button>
                        <a href="/display/${display.slug}" target="_blank" class="btn btn-sm btn-outline">
                            <i class="fas fa-external-link-alt"></i>
                        </a>
                    </div>
                </div>
                <div class="display-actions">
                    <button class="btn btn-outline btn-sm" onclick="admin.editDisplay('${display.id}')">
                        <i class="fas fa-edit"></i> Bearbeiten
                    </button>
                    <button class="btn btn-outline btn-sm" onclick="admin.toggleDisplay('${display.id}')">
                        <i class="fas fa-${display.active ? 'pause' : 'play'}"></i> ${display.active ? 'Deaktivieren' : 'Aktivieren'}
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="admin.deleteDisplay('${display.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `}).join('');

        if (this.displays.length === 0) {
            container.innerHTML = `<div style="text-align: center; padding: 50px; color: var(--text-muted);">
                <i class="fas fa-tv" style="font-size: 36px; margin-bottom: 12px;"></i>
                <p>Keine Displays konfiguriert</p>
            </div>`;
        }

        // Update dashboard count
        const dashCount = document.getElementById('dash-display-count');
        if (dashCount) dashCount.textContent = this.displays.length;
    }

    openDisplayModal(display = null) {
        const modal = document.getElementById('displayModal');
        const title = document.getElementById('displayModalTitle');

        this.editingDisplay = display;

        // Populate template select
        const templateSelect = document.getElementById('displayTemplate');
        if (templateSelect) {
            templateSelect.innerHTML = this.templates.map(t => 
                `<option value="${t.id}" ${display?.templateId === t.id ? 'selected' : ''}>${t.name}</option>`
            ).join('');
        }

        if (display) {
            title.textContent = 'Display bearbeiten';
            document.getElementById('displayId').value = display.id;
            document.getElementById('displayName').value = display.name;
            document.getElementById('displaySlug').value = display.slug;
            document.getElementById('displayDescription').value = display.description || '';
            document.getElementById('displayActive').checked = display.active !== false;
        } else {
            title.textContent = 'Neues Display';
            document.getElementById('displayForm').reset();
            document.getElementById('displayId').value = '';
            document.getElementById('displaySlug').value = 'display-' + (this.displays.length + 1);
            document.getElementById('displayActive').checked = true;
        }

        modal.classList.add('active');
    }

    editDisplay(id) {
        const display = this.displays.find(d => d.id === id);
        if (display) this.openDisplayModal(display);
    }

    async saveDisplay() {
        const id = document.getElementById('displayId').value;
        const display = {
            id: id || 'display-' + Date.now(),
            name: document.getElementById('displayName').value,
            slug: document.getElementById('displaySlug').value.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
            description: document.getElementById('displayDescription').value,
            templateId: document.getElementById('displayTemplate').value,
            active: document.getElementById('displayActive').checked,
            playlist: [],
            zones: [],
            settings: {},
            lastSeen: new Date().toISOString()
        };

        // Check slug uniqueness
        const existing = this.displays.find(d => d.slug === display.slug && d.id !== id);
        if (existing) {
            this.showToast('Slug bereits vergeben!', 'error');
            return;
        }

        try {
            if (id) {
                const res = await fetch(`/displays/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(display)
                });
                const result = await res.json();
                if (result.success) {
                    const idx = this.displays.findIndex(d => d.id === id);
                    if (idx !== -1) this.displays[idx] = result.display;
                    this.showToast('Display aktualisiert!', 'success');
                }
            } else {
                const res = await fetch('/displays', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(display)
                });
                const result = await res.json();
                if (result.success) {
                    this.displays.push(result.display);
                    this.showToast('Display erstellt!', 'success');
                }
            }
            this.closeAllModals();
            this.renderDisplays();
            this.saveData();
        } catch (e) {
            this.showToast('Fehler beim Speichern des Displays', 'error');
        }
    }

    async deleteDisplay(id) {
        if (!confirm('Display wirklich löschen?')) return;
        try {
            const res = await fetch(`/displays/${id}`, { method: 'DELETE' });
            const result = await res.json();
            if (result.success) {
                this.displays = this.displays.filter(d => d.id !== id);
                this.renderDisplays();
                this.showToast('Display gelöscht', 'success');
            }
        } catch (e) {
            this.showToast('Löschen fehlgeschlagen', 'error');
        }
    }

    async toggleDisplay(id) {
        const display = this.displays.find(d => d.id === id);
        if (!display) return;

        display.active = !display.active;
        try {
            const res = await fetch(`/displays/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(display)
            });
            const result = await res.json();
            if (result.success) {
                this.renderDisplays();
                this.showToast(display.active ? 'Display aktiviert' : 'Display deaktiviert', 'success');
            }
        } catch (e) {
            this.showToast('Fehler', 'error');
        }
    }

    copyDisplayUrl(slug) {
        const url = `${window.location.origin}/display/${slug}`;
        navigator.clipboard.writeText(url).then(() => {
            this.showToast('URL kopiert!', 'success');
        }).catch(() => {
            this.showToast('Kopieren fehlgeschlagen', 'error');
        });
    }

    // ==================== DASHBOARD UPDATE (v7.40) ====================

    renderDashboard() {
        document.getElementById('dash-product-count').textContent = this.products.length;
        document.getElementById('dash-zone-count').textContent = this.zones.length;
        document.getElementById('dash-template-count').textContent = this.templates.length;
        const dashDisplayCount = document.getElementById('dash-display-count');
        if (dashDisplayCount) dashDisplayCount.textContent = this.displays.length;
        document.getElementById('last-modified').textContent = this.data?.lastModified 
            ? new Date(this.data.lastModified).toLocaleString('de-DE')
            : '-';
        const themeNames = { dark: 'Dark Mode', light: 'Light Mode', burger: 'Burger Theme', coffee: 'Coffee Theme' };
        document.getElementById('current-theme').textContent = themeNames[this.settings?.theme] || 'Dark Mode';

        const versionEl = document.getElementById('dash-version');
        if (versionEl) versionEl.textContent = this.data?.version || '7.40';
    }

    // ==================== FEATURE ADMIN UI (v7.50) ====================

    // --- 1. TIME-BASED CONTENT ADMIN ---

    async loadSchedules() {
        try {
            const res = await fetch('/schedule');
            const data = await res.json();
            this.schedules = data.allSchedules || [];
            this.renderSchedules();
        } catch (e) {
            console.error('Schedule load error:', e);
        }
    }

    renderSchedules() {
        const container = document.getElementById('schedulesList');
        if (!container) return;

        container.innerHTML = this.schedules.map(s => {
            const days = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
            const activeDays = s.days?.map(d => days[d]).join(', ') || 'Alle';
            const isActive = s.active !== false;

            return `
            <div class="schedule-card ${isActive ? 'schedule-active' : 'schedule-inactive'}">
                <div class="schedule-header">
                    <h4>${s.name}</h4>
                    <span class="schedule-badge">${s.badge || 'Plan'}</span>
                </div>
                <p class="schedule-desc">${s.description || ''}</p>
                <div class="schedule-meta">
                    <span><i class="fas fa-clock"></i> ${s.startTime} - ${s.endTime}</span>
                    <span><i class="fas fa-calendar"></i> ${activeDays}</span>
                    <span><i class="fas fa-layer-group"></i> ${s.templateId || 'Standard'}</span>
                </div>
                <div class="schedule-actions">
                    <button class="btn btn-outline btn-sm" onclick="admin.editSchedule('${s.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-outline btn-sm" onclick="admin.toggleSchedule('${s.id}')">
                        <i class="fas fa-${isActive ? 'pause' : 'play'}"></i>
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="admin.deleteSchedule('${s.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `}).join('');
    }

    openScheduleModal(schedule = null) {
        const modal = document.getElementById('scheduleModal');
        const title = document.getElementById('scheduleModalTitle');

        this.editingSchedule = schedule;

        if (schedule) {
            title.textContent = 'Zeitplan bearbeiten';
            document.getElementById('scheduleId').value = schedule.id;
            document.getElementById('scheduleName').value = schedule.name;
            document.getElementById('scheduleDescription').value = schedule.description || '';
            document.getElementById('scheduleStart').value = schedule.startTime || '06:00';
            document.getElementById('scheduleEnd').value = schedule.endTime || '11:00';
            document.getElementById('scheduleTemplate').value = schedule.templateId || 'split';
            document.getElementById('scheduleTicker').value = schedule.tickerText || '';
            document.getElementById('scheduleTheme').value = schedule.theme || 'dark';
            document.getElementById('scheduleBadge').value = schedule.badge || '';

            // Check days
            const dayCheckboxes = document.querySelectorAll('.schedule-day-check');
            dayCheckboxes.forEach(cb => {
                cb.checked = schedule.days?.includes(parseInt(cb.value)) || false;
            });
        } else {
            title.textContent = 'Neuer Zeitplan';
            document.getElementById('scheduleForm').reset();
            document.getElementById('scheduleId').value = '';
            document.getElementById('scheduleStart').value = '06:00';
            document.getElementById('scheduleEnd').value = '11:00';
        }

        modal.classList.add('active');
    }

    async saveSchedule() {
        const id = document.getElementById('scheduleId').value;
        const dayCheckboxes = document.querySelectorAll('.schedule-day-check:checked');
        const days = Array.from(dayCheckboxes).map(cb => parseInt(cb.value));

        const schedule = {
            id: id || 'schedule-' + Date.now(),
            name: document.getElementById('scheduleName').value,
            description: document.getElementById('scheduleDescription').value,
            startTime: document.getElementById('scheduleStart').value,
            endTime: document.getElementById('scheduleEnd').value,
            days: days.length > 0 ? days : [0,1,2,3,4,5,6],
            templateId: document.getElementById('scheduleTemplate').value,
            tickerText: document.getElementById('scheduleTicker').value,
            theme: document.getElementById('scheduleTheme').value,
            badge: document.getElementById('scheduleBadge').value,
            active: true
        };

        try {
            const res = await fetch('/schedules', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ schedules: this.schedules.map(s => s.id === (id || schedule.id) ? schedule : s) })
            });
            const result = await res.json();
            if (result.success) {
                this.schedules = result.schedules;
                this.renderSchedules();
                this.showToast('Zeitplan gespeichert!', 'success');
                this.closeAllModals();
            }
        } catch (e) {
            this.showToast('Fehler beim Speichern', 'error');
        }
    }

    async toggleSchedule(id) {
        const schedule = this.schedules.find(s => s.id === id);
        if (!schedule) return;
        schedule.active = !schedule.active;
        await this.saveAllSchedules();
    }

    async deleteSchedule(id) {
        if (!confirm('Zeitplan wirklich löschen?')) return;
        this.schedules = this.schedules.filter(s => s.id !== id);
        await this.saveAllSchedules();
    }

    async saveAllSchedules() {
        try {
            const res = await fetch('/schedules', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ schedules: this.schedules })
            });
            const result = await res.json();
            if (result.success) {
                this.schedules = result.schedules;
                this.renderSchedules();
                this.showToast('Zeitpläne aktualisiert!', 'success');
            }
        } catch (e) {
            this.showToast('Fehler', 'error');
        }
    }

    // --- 2. WEATHER SETTINGS ---

    renderWeatherSettings() {
        const weather = this.data?.weather || {};
        const container = document.getElementById('weatherSettings');
        if (!container) return;

        container.innerHTML = `
            <div class="setting-row">
                <label>Wetter anzeigen</label>
                <label class="toggle-switch">
                    <input type="checkbox" id="weatherEnabled" ${weather.enabled !== false ? 'checked' : ''}>
                    <span class="toggle-slider"></span>
                </label>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Breitengrad</label>
                    <input type="text" id="weatherLat" value="${weather.latitude || '52.52'}">
                </div>
                <div class="form-group">
                    <label>Längengrad</label>
                    <input type="text" id="weatherLon" value="${weather.longitude || '13.41'}">
                </div>
            </div>
            <div class="setting-row">
                <label>Empfehlungen anzeigen</label>
                <label class="toggle-switch">
                    <input type="checkbox" id="weatherRecommendations" ${weather.showRecommendations !== false ? 'checked' : ''}>
                    <span class="toggle-slider"></span>
                </label>
            </div>
        `;
    }

    // --- 3. QR CODE SETTINGS ---

    renderQRSettings() {
        const qr = this.data?.qrCodes || {};
        const container = document.getElementById('qrSettings');
        if (!container) return;

        container.innerHTML = `
            <div class="setting-row">
                <label>QR-Codes aktiv</label>
                <label class="toggle-switch">
                    <input type="checkbox" id="qrEnabled" ${qr.enabled !== false ? 'checked' : ''}>
                    <span class="toggle-slider"></span>
                </label>
            </div>
            <div class="form-group">
                <label>Basis-URL</label>
                <input type="text" id="qrBaseUrl" value="${qr.baseUrl || ''}" placeholder="https://dein-shop.com">
            </div>
            <div class="setting-row">
                <label>Auf Produkten</label>
                <label class="toggle-switch">
                    <input type="checkbox" id="qrOnProducts" ${qr.showOnProducts !== false ? 'checked' : ''}>
                    <span class="toggle-slider"></span>
                </label>
            </div>
            <div class="setting-row">
                <label>Auf Display</label>
                <label class="toggle-switch">
                    <input type="checkbox" id="qrOnDisplay" ${qr.showOnDisplay !== false ? 'checked' : ''}>
                    <span class="toggle-slider"></span>
                </label>
            </div>
        `;
    }

    // --- 4. LANGUAGE SETTINGS ---

    renderLanguageSettings() {
        const langs = this.data?.languages || {};
        const container = document.getElementById('languageSettings');
        if (!container) return;

        const enabled = langs.enabled || ['de'];
        const allLangs = [
            { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
            { code: 'en', name: 'English', flag: '🇬🇧' },
            { code: 'ar', name: 'العربية', flag: '🇸🇦' }
        ];

        container.innerHTML = `
            <div class="setting-row">
                <label>Sprachauswahl anzeigen</label>
                <label class="toggle-switch">
                    <input type="checkbox" id="langSelector" ${langs.showSelector !== false ? 'checked' : ''}>
                    <span class="toggle-slider"></span>
                </label>
            </div>
            <div class="form-group">
                <label>Aktive Sprachen</label>
                <div class="language-checkboxes">
                    ${allLangs.map(l => `
                        <label class="checkbox-label">
                            <input type="checkbox" class="lang-check" value="${l.code}" ${enabled.includes(l.code) ? 'checked' : ''}>
                            <span>${l.flag} ${l.name}</span>
                        </label>
                    `).join('')}
                </div>
            </div>
            <div class="form-group">
                <label>Standardsprache</label>
                <select id="defaultLang">
                    ${allLangs.filter(l => enabled.includes(l.code)).map(l => `
                        <option value="${l.code}" ${langs.default === l.code ? 'selected' : ''}>${l.flag} ${l.name}</option>
                    `).join('')}
                </select>
            </div>
        `;
    }

    // --- 5. ANIMATION SETTINGS ---

    renderAnimationSettings() {
        const anims = this.data?.animations || {};
        const container = document.getElementById('animationSettings');
        if (!container) return;

        container.innerHTML = `
            <div class="setting-row">
                <label>Animationen aktiv</label>
                <label class="toggle-switch">
                    <input type="checkbox" id="animEnabled" ${anims.enabled !== false ? 'checked' : ''}>
                    <span class="toggle-slider"></span>
                </label>
            </div>
            <div class="form-group">
                <label>Seitenübergang</label>
                <select id="animTransition">
                    <option value="slide" ${anims.pageTransition === 'slide' ? 'selected' : ''}>Slide</option>
                    <option value="fade" ${anims.pageTransition === 'fade' ? 'selected' : ''}>Fade</option>
                    <option value="scale" ${anims.pageTransition === 'scale' ? 'selected' : ''}>Scale</option>
                    <option value="none" ${anims.pageTransition === 'none' ? 'selected' : ''}>Keine</option>
                </select>
            </div>
            <div class="setting-row">
                <label>Produkte Fade-In</label>
                <label class="toggle-switch">
                    <input type="checkbox" id="animFadeIn" ${anims.productFadeIn !== false ? 'checked' : ''}>
                    <span class="toggle-slider"></span>
                </label>
            </div>
            <div class="setting-row">
                <label>Angebote Pulse</label>
                <label class="toggle-switch">
                    <input type="checkbox" id="animPulse" ${anims.offerPulse !== false ? 'checked' : ''}>
                    <span class="toggle-slider"></span>
                </label>
            </div>
            <div class="form-group">
                <label>Übergangsdauer (ms)</label>
                <input type="number" id="animDuration" value="${anims.transitionDuration || 500}" min="100" max="2000" step="100">
            </div>
        `;
    }
    async testWeather() {
        const lat = document.getElementById('weatherLat')?.value || '52.52';
        const lon = document.getElementById('weatherLon')?.value || '13.41';
        const result = document.getElementById('weatherTestResult');
        if (result) result.textContent = '⏳ Lädt Wetterdaten...';
        try {
            const res = await fetch(`/weather?lat=${lat}&lon=${lon}`);
            if (!res.ok) throw new Error('Wetter-API nicht erreichbar');
            const w = await res.json();
            if (result) result.textContent = `${w.icon} ${w.temperature}°C | 💨 ${w.windspeed} km/h${w.recommendation ? ' | ' + w.recommendation : ''}`;
        } catch (e) {
            if (result) result.textContent = '❌ Fehler: ' + e.message;
        }
    }

    async saveFeatures() {
        // Weather
        const weather = {
            enabled: document.getElementById('weatherEnabled')?.checked !== false,
            latitude: document.getElementById('weatherLat')?.value || '52.52',
            longitude: document.getElementById('weatherLon')?.value || '13.41',
            showOnDisplay: true,
            showRecommendations: document.getElementById('weatherRecommendations')?.checked !== false,
            updateInterval: 300000
        };

        // QR
        const qrCodes = {
            enabled: document.getElementById('qrEnabled')?.checked !== false,
            baseUrl: document.getElementById('qrBaseUrl')?.value || '',
            showOnProducts: document.getElementById('qrOnProducts')?.checked !== false,
            showOnDisplay: document.getElementById('qrOnDisplay')?.checked !== false
        };

        // Languages
        const langChecks = document.querySelectorAll('.lang-check:checked');
        const languages = {
            enabled: Array.from(langChecks).map(cb => cb.value),
            default: document.getElementById('defaultLang')?.value || 'de',
            showSelector: document.getElementById('langSelector')?.checked !== false
        };

        // Animations
        const animations = {
            enabled: document.getElementById('animEnabled')?.checked !== false,
            pageTransition: document.getElementById('animTransition')?.value || 'slide',
            productFadeIn: document.getElementById('animFadeIn')?.checked !== false,
            offerPulse: document.getElementById('animPulse')?.checked !== false,
            transitionDuration: parseInt(document.getElementById('animDuration')?.value || '500')
        };

        this.data.weather = weather;
        this.data.qrCodes = qrCodes;
        this.data.languages = languages;
        this.data.animations = animations;

        await this.saveData();
        this.showToast('Features gespeichert!', 'success');
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
}

const admin = new MenuboardAdmin();
