/**
 * DIGITAL MENUBOARD v8.0 — ADMIN JS
 * Fixes: Theme picker, Currency picker, Font selector, Display/Template add buttons
 * New: Analytics, Playlists, Remote Control
 */
'use strict';

class MenuboardAdmin {
    constructor() {
        this.data = null;
        this.products = [];
        this.zones = [];
        this.templates = [];
        this.uploads = [];
        this.displays = [];
        this.playlists = [];
        this.settings = {};
        this.currentTab = 'dashboard';
        this.selectedZone = null;
        this.dragState = null;
        this.resizeState = null;
        this.history = [];
        this.historyIndex = -1;
        this.canvasZoom = 1;
        this.snapGrid = true;
        this.gridSize = 10;
        this.editingTemplate = null;
        this.editingDisplay = null;
        this.editingPlaylist = null;
        this.playlistItems = [];
        this.analyticsData = null;
        this.init();
    }

    async init() {
        await this.loadData();
        this.setupEventListeners();
        this.setupClock();
        this.renderAll();
        this.switchTab('dashboard');
        this.loadAnalytics();
    }

    // ═══ DATA ═══
    async loadData() {
        try {
            const res = await fetch('/data');
            this.data = await res.json();
            this.products = this.data.products || [];
            this.zones = this.data.zones || [];
            this.templates = this.data.templates || [];
            this.displays = this.data.displays || [];
            this.playlists = this.data.playlists || [];
            this.settings = this.data.settings || {};
        } catch (e) {
            this.showToast('Verbindungsfehler', 'error');
        }
    }

    async saveData() {
        if (!this.data) return;
        this.data.products = this.products;
        this.data.zones = this.zones;
        this.data.templates = this.templates;
        this.data.displays = this.displays;
        this.data.playlists = this.playlists;
        this.data.settings = this.settings;
        try {
            const res = await fetch('/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(this.data) });
            const result = await res.json();
            if (result.success) { this.showToast('Gespeichert!', 'success'); this.renderDashboard(); }
            else this.showToast('Speicherfehler', 'error');
        } catch (e) { this.showToast('Speicherfehler', 'error'); }
    }

    // ═══ EVENT LISTENERS ═══
    setupEventListeners() {
        // Save
        document.getElementById('saveAllBtn').addEventListener('click', () => this.saveData());

        // Nav tabs
        document.querySelectorAll('.nav-item[data-tab]').forEach(el => {
            el.addEventListener('click', e => { e.preventDefault(); this.switchTab(el.dataset.tab); });
        });
        document.getElementById('sidebarToggle').addEventListener('click', () => {
            document.querySelector('.sidebar').classList.toggle('collapsed');
        });

        // Products
        document.getElementById('productSearch').addEventListener('input', () => this.renderProducts());
        document.getElementById('categoryFilter').addEventListener('change', () => this.renderProducts());
        document.getElementById('addProductBtn').addEventListener('click', () => this.openProductModal());
        document.getElementById('saveProductBtn').addEventListener('click', () => this.saveProduct());
        const imgUpload = document.getElementById('productImageUpload');
        const imgFile = document.getElementById('productImageFile');
        if (imgUpload && imgFile) {
            imgUpload.addEventListener('click', e => { if (e.target.id !== 'productImageUrl') imgFile.click(); });
            imgFile.addEventListener('change', e => {
                if (e.target.files?.[0]) {
                    const reader = new FileReader();
                    reader.onload = r => {
                        document.getElementById('productImageUrl').value = '';
                        document.getElementById('productImagePreview').innerHTML = `<img src="${r.target.result}">`;
                        this.uploadImage(e.target.files[0]);
                    };
                    reader.readAsDataURL(e.target.files[0]);
                }
            });
            document.getElementById('productImageUrl').addEventListener('input', e => {
                if (e.target.value) document.getElementById('productImagePreview').innerHTML = `<img src="${e.target.value}" onerror="this.style.display='none'">`;
            });
        }

        // Displays
        document.getElementById('addDisplayBtn').addEventListener('click', () => this.openDisplayModal());
        document.getElementById('saveDisplayBtn').addEventListener('click', () => this.saveDisplay());

        // Templates
        document.getElementById('addTemplateBtn').addEventListener('click', () => this.openTemplateModal());
        document.getElementById('saveTemplateBtn').addEventListener('click', () => this.saveTemplate());

        // Designer
        ['zoomIn','zoomOut','zoomFit'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('click', () => {
                if (id === 'zoomIn') this.zoomCanvas(0.1);
                else if (id === 'zoomOut') this.zoomCanvas(-0.1);
                else this.fitCanvas();
            });
        });
        document.getElementById('showGrid')?.addEventListener('change', e => {
            document.getElementById('designerCanvas').classList.toggle('show-grid', e.target.checked);
        });
        document.getElementById('snapGrid')?.addEventListener('change', e => { this.snapGrid = e.target.checked; });
        document.getElementById('gridSize')?.addEventListener('change', e => { this.gridSize = parseInt(e.target.value) || 10; });
        document.getElementById('saveLayoutBtn')?.addEventListener('click', () => this.saveData());
        document.getElementById('undoBtn')?.addEventListener('click', () => this.undo());
        document.getElementById('redoBtn')?.addEventListener('click', () => this.redo());
        ['toolSelect','toolAddMenu','toolAddMedia','toolAddTicker','toolAddText','toolAddClock'].forEach(id => {
            document.getElementById(id)?.addEventListener('click', () => this.selectTool(id));
        });

        // Zone modal
        document.getElementById('saveZoneBtn')?.addEventListener('click', () => this.saveZone());
        document.getElementById('deleteZoneBtn')?.addEventListener('click', () => this.deleteSelectedZone());
        document.getElementById('zoneType')?.addEventListener('change', e => this.updateZoneTypeUI(e.target.value));

        // Media
        document.getElementById('mediaUpload')?.addEventListener('change', e => this.handleMediaUpload(e));

        // Schedules
        document.getElementById('addScheduleBtn').addEventListener('click', () => this.openScheduleModal());
        document.getElementById('saveScheduleBtn').addEventListener('click', () => this.saveSchedule());

        // Playlists
        document.getElementById('addPlaylistBtn').addEventListener('click', () => this.openPlaylistModal());
        document.getElementById('savePlaylistBtn').addEventListener('click', () => this.savePlaylist());

        // Features
        document.getElementById('saveFeaturesBtn').addEventListener('click', () => this.saveFeatures());

        // Settings
        document.getElementById('saveSettingsBtn').addEventListener('click', () => this.saveSettings());
        document.getElementById('resetSettingsBtn').addEventListener('click', () => this.resetSettings());
        document.getElementById('settingTickerSpeed')?.addEventListener('input', e => {
            const v = document.getElementById('tickerSpeedVal');
            if (v) v.textContent = e.target.value;
        });

        // Theme picker
        document.querySelectorAll('.theme-pill').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.theme-pill').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                document.getElementById('settingTheme').value = btn.dataset.theme;
                document.getElementById('customThemeEditor').style.display = btn.dataset.theme === 'custom' ? 'block' : 'none';
            });
        });

        // Color pickers live update
        ['bgPrimary','bgSecondary','bgCard','accentPrimary','accentSecondary','textPrimary','textSecondary','priceColor','borderColor'].forEach(key => {
            const inp = document.getElementById('ct-' + key);
            const span = document.getElementById('ct-' + key + '-val');
            if (inp && span) inp.addEventListener('input', () => { span.textContent = inp.value; });
        });

        // Font selector
        this.renderFontSelector();

        // Currency picker
        this.renderCurrencyPicker();

        // Modal close
        document.querySelectorAll('.modal-close, .modal-cancel, .modal-backdrop').forEach(el => {
            el.addEventListener('click', () => this.closeAllModals());
        });
        document.querySelectorAll('.modal').forEach(m => {
            m.addEventListener('click', e => { if (e.target === m) this.closeAllModals(); });
        });
    }

    // ═══ TAB SWITCHING ═══
    switchTab(tab) {
        document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.tab === tab));
        document.querySelectorAll('.tab-pane').forEach(p => p.classList.toggle('active', p.id === 'tab-' + tab));
        this.currentTab = tab;
        const titles = { dashboard:'Dashboard', products:'Produkte', media:'Mediathek', displays:'Displays', templates:'Templates', designer:'Designer', playlists:'Playlisten', remote:'Fernsteuerung', schedules:'Zeitpläne', analytics:'Analytics', features:'Features', settings:'Einstellungen' };
        document.getElementById('pageTitle').textContent = titles[tab] || tab;
        if (tab === 'designer') setTimeout(() => this.renderDesignerCanvas(), 50);
        else if (tab === 'media') this.loadMedia();
        else if (tab === 'schedules') this.loadSchedules();
        else if (tab === 'analytics') this.loadAnalytics();
        else if (tab === 'remote') this.renderRemoteControl();
        else if (tab === 'features') this.renderFeatureSettings();
        else if (tab === 'settings') this.renderSettings();
        else if (tab === 'playlists') this.renderPlaylists();
        else if (tab === 'dashboard') this.renderDashboard();
    }

    renderAll() {
        this.renderProducts();
        this.renderDisplays();
        this.renderTemplates();
        this.renderPlaylists();
        this.updateNavBadges();
    }

    updateNavBadges() {
        const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        set('nb-products', this.products.length);
        set('nb-displays', this.displays.length);
        set('nb-templates', this.templates.length);
        set('nb-playlists', this.playlists.length);
    }

    setupClock() {
        const update = () => {
            const now = new Date();
            const el = document.getElementById('topbarTime');
            if (el) el.textContent = now.toLocaleTimeString('de-DE');
        };
        update();
        setInterval(update, 1000);
    }

    // ═══ DASHBOARD ═══
    renderDashboard() {
        // Stat counts
        const s = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
        s('ds-products', this.products.length);
        s('ds-displays', this.displays.length);
        s('ds-templates', this.templates.length);
        s('ds-playlists', this.playlists.length);
        const onlineCount = this.displays.filter(d => {
            if (!d.lastSeen) return false;
            return (Date.now() - new Date(d.lastSeen).getTime()) < 5 * 60 * 1000;
        }).length;
        s('ds-online', onlineCount);
        s('ds-views', this.analyticsData?.totalProductViews || '—');
        s('ds-saved', this.data?.lastModified ? new Date(this.data.lastModified).toLocaleString('de-DE') : '—');
        s('ds-theme', this.settings.theme || 'dark');
        s('ds-currency', this.settings.currency || '€');
        s('ds-lang', this.settings.language || 'de');

        // Display status list
        const dl = document.getElementById('ds-display-list');
        if (dl) {
            if (!this.displays.length) { dl.innerHTML = '<div class="empty-state" style="padding:20px"><i class="fas fa-desktop"></i><p>Keine Displays</p></div>'; }
            else dl.innerHTML = this.displays.map(d => {
                const online = d.lastSeen && (Date.now() - new Date(d.lastSeen).getTime()) < 5 * 60 * 1000;
                const ago = d.lastSeen ? this.timeAgo(d.lastSeen) : 'Nie';
                return `<div class="display-status-row">
                    <span class="display-status-name"><i class="fas fa-circle" style="color:${online?'var(--green)':'var(--border)'}; font-size:8px; margin-right:6px;"></i>${d.name}</span>
                    <span class="display-status-time">${ago}</span>
                    <span class="display-online-badge ${online?'badge-online':'badge-offline'}">${online?'Online':'Offline'}</span>
                </div>`;
            }).join('');
        }

        // Top products
        const tp = document.getElementById('ds-top-products');
        if (tp) {
            const top = (this.analyticsData?.productRanking || []).slice(0, 5);
            if (!top.length) { tp.innerHTML = '<div class="empty-state" style="padding:20px"><i class="fas fa-chart-bar"></i><p>Noch keine Daten</p></div>'; }
            else {
                const maxV = top[0]?.views || 1;
                tp.innerHTML = top.map((p, i) => `<div class="top-product-row">
                    <span class="top-rank">${i+1}</span>
                    <span class="top-name">${p.name}</span>
                    <div class="top-bar" style="width:60px"><div class="top-bar-fill" style="width:${Math.round(p.views/maxV*100)}%"></div></div>
                    <span class="top-views">${p.views}</span>
                </div>`).join('');
            }
        }

        // Preview display select
        const pds = document.getElementById('previewDisplaySelect');
        if (pds) {
            const current = pds.value;
            pds.innerHTML = this.displays.map(d => `<option value="${d.slug}" ${d.slug === current ? 'selected' : ''}>${d.name}</option>`).join('');
        }
    }

    refreshPreview() {
        const iframe = document.getElementById('livePreview');
        if (iframe) iframe.src = iframe.src;
    }

    updatePreview() {
        const slug = document.getElementById('previewDisplaySelect').value;
        const iframe = document.getElementById('livePreview');
        if (iframe && slug) iframe.src = `/display/${slug}`;
    }

    timeAgo(ts) {
        const sec = Math.round((Date.now() - new Date(ts).getTime()) / 1000);
        if (sec < 60) return 'Gerade eben';
        if (sec < 3600) return `vor ${Math.floor(sec/60)} Min.`;
        if (sec < 86400) return `vor ${Math.floor(sec/3600)} Std.`;
        return `vor ${Math.floor(sec/86400)} Tagen`;
    }

    // ═══ SETTINGS ═══
    renderSettings() {
        const s = this.settings;
        // Theme
        document.querySelectorAll('.theme-pill').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.theme === (s.theme || 'dark'));
        });
        document.getElementById('settingTheme').value = s.theme || 'dark';
        if (s.theme === 'custom') document.getElementById('customThemeEditor').style.display = 'block';
        if (s.customTheme) {
            Object.entries(s.customTheme).forEach(([k, v]) => {
                const inp = document.getElementById('ct-' + k);
                const span = document.getElementById('ct-' + k + '-val');
                if (inp) inp.value = v;
                if (span) span.textContent = v;
            });
        }
        // Font
        this.renderFontSelector(s.font || 'Inter');
        document.getElementById('settingFont').value = s.font || 'Inter';
        // Currency
        this.renderCurrencyPicker(s.currency || '€');
        document.getElementById('settingCurrency').value = s.currency || '€';
        document.getElementById('settingCurrencyPosition').value = s.currencyPosition || 'after';
        // General
        document.getElementById('settingLanguage').value = s.language || 'de';
        document.getElementById('settingRefresh').value = s.refreshInterval || 30;
        document.getElementById('settingAutoRotate').checked = s.autoRotate || false;
        document.getElementById('settingShowBadges').checked = s.showBadges !== false;
        // Ticker
        const t = this.data?.ticker || {};
        document.getElementById('settingTickerEnabled').checked = t.enabled !== false;
        document.getElementById('settingTickerSpeed').value = t.speed || 50;
        const sv = document.getElementById('tickerSpeedVal'); if (sv) sv.textContent = t.speed || 50;
        document.getElementById('settingTickerColor').value = t.color || '#FFD700';
        document.getElementById('settingTickerBg').value = t.backgroundColor || '#1a1a2e';
    }

    renderFontSelector(current = 'Inter') {
        const fonts = [
            { name: 'Inter', label: 'Inter (Modern)' },
            { name: 'DM Sans', label: 'DM Sans (Clean)' },
            { name: 'Roboto', label: 'Roboto (Google)' },
            { name: 'Poppins', label: 'Poppins (Rund)' },
            { name: 'Oswald', label: 'Oswald (Kondensiert)' },
            { name: 'Playfair Display', label: 'Playfair (Elegant)' },
            { name: 'Montserrat', label: 'Montserrat (Geometrisch)' },
            { name: 'Raleway', label: 'Raleway (Leicht)' },
            { name: 'Lato', label: 'Lato (Neutral)' },
            { name: 'Nunito', label: 'Nunito (Freundlich)' }
        ];
        const el = document.getElementById('fontSelector');
        if (!el) return;
        el.innerHTML = fonts.map(f => `<div class="font-option ${f.name === current ? 'active' : ''}" data-font="${f.name}" style="font-family:'${f.name}',sans-serif">${f.label}</div>`).join('');
        el.querySelectorAll('.font-option').forEach(opt => {
            opt.addEventListener('click', () => {
                el.querySelectorAll('.font-option').forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
                document.getElementById('settingFont').value = opt.dataset.font;
                const prev = document.getElementById('fontPreview');
                if (prev) prev.style.fontFamily = `'${opt.dataset.font}', sans-serif`;
            });
        });
        const prev = document.getElementById('fontPreview');
        if (prev) prev.style.fontFamily = `'${current}', sans-serif`;
    }

    renderCurrencyPicker(current = '€') {
        const currencies = [
            { symbol: '€', name: 'Euro' }, { symbol: '$', name: 'Dollar' },
            { symbol: '£', name: 'Pfund' }, { symbol: '¥', name: 'Yen' },
            { symbol: '₺', name: 'Lira' }, { symbol: 'CHF', name: 'Franken' },
            { symbol: 'kr', name: 'Krone' }, { symbol: 'zł', name: 'Zloty' },
            { symbol: 'Ft', name: 'Forint' }
        ];
        const el = document.getElementById('currencyPicker');
        if (!el) return;
        el.innerHTML = currencies.map(c => `<div class="currency-option ${c.symbol === current ? 'active' : ''}" data-currency="${c.symbol}">
            <span class="curr-symbol">${c.symbol}</span><span class="curr-name">${c.name}</span>
        </div>`).join('');
        el.querySelectorAll('.currency-option').forEach(opt => {
            opt.addEventListener('click', () => {
                el.querySelectorAll('.currency-option').forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
                document.getElementById('settingCurrency').value = opt.dataset.currency;
            });
        });
    }

    saveSettings() {
        const s = this.settings;
        s.theme = document.getElementById('settingTheme').value;
        s.font = document.getElementById('settingFont').value;
        s.currency = document.getElementById('settingCurrency').value;
        s.currencyPosition = document.getElementById('settingCurrencyPosition').value;
        s.language = document.getElementById('settingLanguage').value;
        s.refreshInterval = parseInt(document.getElementById('settingRefresh').value) || 30;
        s.autoRotate = document.getElementById('settingAutoRotate').checked;
        s.showBadges = document.getElementById('settingShowBadges').checked;
        // Custom theme colors
        if (s.theme === 'custom') {
            s.customTheme = {};
            ['bgPrimary','bgSecondary','bgCard','accentPrimary','accentSecondary','textPrimary','textSecondary','priceColor','borderColor'].forEach(k => {
                const inp = document.getElementById('ct-' + k);
                if (inp) s.customTheme[k] = inp.value;
            });
        }
        // Ticker
        if (!this.data.ticker) this.data.ticker = {};
        this.data.ticker.enabled = document.getElementById('settingTickerEnabled').checked;
        this.data.ticker.speed = parseInt(document.getElementById('settingTickerSpeed').value) || 50;
        this.data.ticker.color = document.getElementById('settingTickerColor').value;
        this.data.ticker.backgroundColor = document.getElementById('settingTickerBg').value;
        this.saveData();
    }

    resetSettings() {
        if (!confirm('Einstellungen zurücksetzen?')) return;
        this.settings = { theme:'dark', currency:'€', currencyPosition:'after', language:'de', font:'Inter', refreshInterval:30, autoRotate:false, showBadges:true };
        this.renderSettings();
        this.showToast('Einstellungen zurückgesetzt', 'info');
    }

    // ═══ PRODUCTS ═══
    renderProducts() {
        const search = document.getElementById('productSearch').value.toLowerCase();
        const cat = document.getElementById('categoryFilter').value;
        const filtered = this.products.filter(p =>
            (!cat || p.category === cat) &&
            (!search || p.title.toLowerCase().includes(search) || (p.description||'').toLowerCase().includes(search))
        );
        const grid = document.getElementById('productsGrid');
        if (!grid) return;
        const currency = this.settings.currency || '€';
        const cpos = this.settings.currencyPosition || 'after';
        const fmtPrice = p => cpos === 'before' ? `${currency} ${p}` : `${p} ${currency}`;
        if (!filtered.length) {
            grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><i class="fas fa-search"></i><p>Keine Produkte gefunden</p></div>`;
            return;
        }
        grid.innerHTML = filtered.map(p => `
        <div class="product-card" onclick="admin.openProductModal(${p.id})">
            <div class="product-card-img">${p.image ? `<img src="${p.image}" alt="${p.title}" onerror="this.parentNode.innerHTML='<i class=fas fa-image no-img></i>'">` : '<i class="fas fa-image no-img"></i>'}</div>
            <div class="product-card-body">
                <div class="product-card-name" title="${p.title}">${p.title}</div>
                <div class="product-card-cat">${p.category}</div>
                <div class="product-card-footer">
                    <span class="product-price">${p.stockStatus === 'soldout' ? '—' : fmtPrice(p.price)}</span>
                    ${p.badge ? `<span class="product-badge">${p.badge}</span>` : `<span class="stock-available stock-${p.stockStatus||'available'}" title="${p.stockStatus||'available'}"></span>`}
                </div>
            </div>
            <div class="product-card-actions">
                <button class="btn btn-ghost btn-xs" onclick="event.stopPropagation();admin.openProductModal(${p.id})"><i class="fas fa-pen"></i></button>
                <button class="btn btn-danger btn-xs" onclick="event.stopPropagation();admin.deleteProduct(${p.id})"><i class="fas fa-trash"></i></button>
            </div>
        </div>`).join('');
    }

    openProductModal(idOrProduct = null) {
        const modal = document.getElementById('productModal');
        const product = typeof idOrProduct === 'number' ? this.products.find(p => p.id === idOrProduct) : null;
        document.getElementById('productModalTitle').textContent = product ? 'Produkt bearbeiten' : 'Neues Produkt';
        document.getElementById('productId').value = product?.id || '';
        document.getElementById('productTitle').value = product?.title || '';
        document.getElementById('productPrice').value = product?.price || '';
        document.getElementById('productCategory').value = product?.category || 'burger';
        document.getElementById('productBadge').value = product?.badge || '';
        document.getElementById('productDescription').value = product?.description || '';
        document.getElementById('productImageUrl').value = product?.image || '';
        document.getElementById('productStock').value = product?.stockStatus || 'available';
        document.getElementById('productImagePreview').innerHTML = product?.image
            ? `<img src="${product.image}" alt="${product.title}">`
            : '<i class="fas fa-image"></i><span>Klicken oder URL eingeben</span>';
        modal.classList.add('active');
    }

    async saveProduct() {
        const id = document.getElementById('productId').value;
        const product = {
            id: id ? parseInt(id) : Date.now(),
            title: document.getElementById('productTitle').value.trim(),
            price: document.getElementById('productPrice').value.trim(),
            category: document.getElementById('productCategory').value,
            badge: document.getElementById('productBadge').value,
            description: document.getElementById('productDescription').value.trim(),
            image: document.getElementById('productImageUrl').value.trim(),
            stockStatus: document.getElementById('productStock').value
        };
        if (!product.title || !product.price) { this.showToast('Name und Preis sind pflicht!', 'error'); return; }
        if (id) { const i = this.products.findIndex(p => p.id === parseInt(id)); if (i !== -1) this.products[i] = product; }
        else this.products.push(product);
        this.closeAllModals();
        this.renderProducts();
        this.updateNavBadges();
        await this.saveData();
    }

    async deleteProduct(id) {
        if (!confirm('Produkt wirklich löschen?')) return;
        this.products = this.products.filter(p => p.id !== id);
        this.renderProducts();
        this.updateNavBadges();
        await this.saveData();
    }

    async uploadImage(file) {
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await fetch('/upload', { method: 'POST', body: formData });
            const result = await res.json();
            if (result.success) { document.getElementById('productImageUrl').value = result.file.url; this.showToast('Bild hochgeladen!', 'success'); }
        } catch (e) { this.showToast('Upload fehlgeschlagen', 'error'); }
    }

    // ═══ DISPLAYS ═══
    renderDisplays() {
        const grid = document.getElementById('displaysGrid');
        if (!grid) return;
        if (!this.displays.length) {
            grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><i class="fas fa-desktop"></i><p>Noch keine Displays.<br>Klicke auf "+ Display"</p></div>`;
            return;
        }
        grid.innerHTML = this.displays.map(d => {
            const online = d.lastSeen && (Date.now() - new Date(d.lastSeen).getTime()) < 5 * 60 * 1000;
            const tpl = this.templates.find(t => t.id === d.templateId);
            return `<div class="display-card">
                <div class="display-card-header">
                    <div class="display-card-icon"><i class="fas fa-desktop"></i></div>
                    <span class="display-online-badge ${online?'badge-online':'badge-offline'}">${online?'Online':'Offline'}</span>
                </div>
                <div class="display-card-name">${d.name}</div>
                <div class="display-card-slug">/display/${d.slug}</div>
                <div class="display-card-desc">${d.description || '—'}</div>
                <div class="display-meta">
                    <span><i class="fas fa-table-cells-large"></i> ${tpl?.name || d.templateId || '—'}</span>
                    ${d.lastSeen ? `<span><i class="fas fa-clock"></i> ${this.timeAgo(d.lastSeen)}</span>` : ''}
                </div>
                <a class="display-url" href="/display/${d.slug}" target="_blank">/display/${d.slug}</a>
                <div class="display-card-actions">
                    <button class="btn btn-ghost btn-sm" onclick="admin.openDisplayModal('${d.id}')"><i class="fas fa-pen"></i> Bearbeiten</button>
                    <button class="btn btn-ghost btn-sm" onclick="window.open('/display/${d.slug}','_blank')"><i class="fas fa-external-link-alt"></i></button>
                    <button class="btn btn-danger btn-sm" onclick="admin.deleteDisplay('${d.id}')"><i class="fas fa-trash"></i></button>
                </div>
            </div>`;
        }).join('');
    }

    openDisplayModal(idOrNull = null) {
        const modal = document.getElementById('displayModal');
        const display = typeof idOrNull === 'string' ? this.displays.find(d => d.id === idOrNull) : null;
        this.editingDisplay = display;
        document.getElementById('displayModalTitle').textContent = display ? 'Display bearbeiten' : 'Neues Display';
        document.getElementById('displayId').value = display?.id || '';
        document.getElementById('displayName').value = display?.name || '';
        document.getElementById('displaySlug').value = display?.slug || 'display-' + (this.displays.length + 1);
        document.getElementById('displayDescription').value = display?.description || '';
        document.getElementById('displayActive').checked = display?.active !== false;
        // Populate template select
        const tplSel = document.getElementById('displayTemplate');
        tplSel.innerHTML = this.templates.map(t => `<option value="${t.id}" ${display?.templateId === t.id ? 'selected' : ''}>${t.name}</option>`).join('');
        // Populate playlist select
        const plSel = document.getElementById('displayPlaylist');
        plSel.innerHTML = '<option value="">Keine Playlist</option>' + this.playlists.map(pl => `<option value="${pl.id}" ${display?.playlistId === pl.id ? 'selected' : ''}>${pl.name}</option>`).join('');
        modal.classList.add('active');
    }

    async saveDisplay() {
        const id = document.getElementById('displayId').value;
        const display = {
            id: id || 'display-' + Date.now(),
            name: document.getElementById('displayName').value.trim(),
            slug: document.getElementById('displaySlug').value.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
            description: document.getElementById('displayDescription').value.trim(),
            templateId: document.getElementById('displayTemplate').value,
            playlistId: document.getElementById('displayPlaylist').value || null,
            active: document.getElementById('displayActive').checked,
            playlist: [],
            createdAt: id ? (this.displays.find(d => d.id === id)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
            lastSeen: id ? (this.displays.find(d => d.id === id)?.lastSeen || new Date().toISOString()) : new Date().toISOString()
        };
        if (!display.name) { this.showToast('Name ist pflicht!', 'error'); return; }
        const slugTaken = this.displays.find(d => d.slug === display.slug && d.id !== id);
        if (slugTaken) { this.showToast('Slug bereits vergeben!', 'error'); return; }
        try {
            const method = id ? 'PUT' : 'POST';
            const url = id ? `/displays/${id}` : '/displays';
            const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(display) });
            const result = await res.json();
            if (result.success) {
                if (id) { const i = this.displays.findIndex(d => d.id === id); if (i !== -1) this.displays[i] = result.display; }
                else this.displays.push(result.display);
                this.closeAllModals(); this.renderDisplays(); this.updateNavBadges();
                this.showToast(id ? 'Display aktualisiert!' : 'Display erstellt!', 'success');
            } else this.showToast('Fehler', 'error');
        } catch (e) { this.showToast('Verbindungsfehler', 'error'); }
    }

    async deleteDisplay(id) {
        if (!confirm('Display wirklich löschen?')) return;
        try {
            const res = await fetch(`/displays/${id}`, { method: 'DELETE' });
            const result = await res.json();
            if (result.success) { this.displays = this.displays.filter(d => d.id !== id); this.renderDisplays(); this.updateNavBadges(); this.showToast('Display gelöscht', 'success'); }
        } catch (e) { this.showToast('Fehler', 'error'); }
    }

    // ═══ TEMPLATES ═══
    renderTemplates() {
        const grid = document.getElementById('templatesGrid');
        if (!grid) return;
        if (!this.templates.length) {
            grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><i class="fas fa-table-cells-large"></i><p>Keine Templates vorhanden.</p></div>`;
            return;
        }
        grid.innerHTML = this.templates.map(t => {
            const preview = this.buildTemplatePreview(t);
            return `<div class="template-card ${t.isDefault ? 'is-default' : ''}">
                <div class="template-preview">${preview}</div>
                <div class="template-card-body">
                    <div class="template-card-name">${t.name} ${t.isDefault ? '<span class="template-default-badge">Standard</span>' : ''}</div>
                    <div class="template-card-desc">${t.description || ''}</div>
                    <div class="template-card-actions">
                        <button class="btn btn-ghost btn-sm" onclick="admin.applyTemplate('${t.id}')"><i class="fas fa-check"></i> Anwenden</button>
                        <button class="btn btn-ghost btn-sm" onclick="admin.openTemplateModal('${t.id}')"><i class="fas fa-pen"></i></button>
                        ${!t.isDefault ? `<button class="btn btn-danger btn-sm" onclick="admin.deleteTemplate('${t.id}')"><i class="fas fa-trash"></i></button>` : ''}
                    </div>
                </div>
            </div>`;
        }).join('');
        // Template pills in designer
        const pills = document.getElementById('templateButtons');
        if (pills) pills.innerHTML = this.templates.map(t => `<button class="template-pill-btn" onclick="admin.applyTemplate('${t.id}')">${t.name}</button>`).join('');
    }

    buildTemplatePreview(t) {
        if (!t.zones?.length) return '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#444;font-size:12px;">Leer</div>';
        return t.zones.map(z => `<div class="template-zone-preview" style="left:${z.x}%;top:${z.y}%;width:${z.w}%;height:${z.h}%">${z.type}</div>`).join('');
    }

    openTemplateModal(idOrNull = null) {
        const modal = document.getElementById('templateModal');
        const t = typeof idOrNull === 'string' ? this.templates.find(t => t.id === idOrNull) : null;
        this.editingTemplate = t;
        document.getElementById('templateModalTitle').textContent = t ? 'Template bearbeiten' : 'Neues Template';
        document.getElementById('templateId').value = t?.id || '';
        document.getElementById('templateName').value = t?.name || '';
        document.getElementById('templateDescription').value = t?.description || '';
        document.getElementById('templateZonesJson').value = t?.zones ? JSON.stringify(t.zones, null, 2) : '[]';
        modal.classList.add('active');
    }

    copyCurrentLayoutToTemplate() {
        const el = document.getElementById('templateZonesJson');
        if (el) el.value = JSON.stringify(this.zones, null, 2);
        this.showToast('Aktuelles Layout übernommen', 'info');
    }

    async saveTemplate() {
        const id = document.getElementById('templateId').value;
        const name = document.getElementById('templateName').value.trim();
        if (!name) { this.showToast('Name ist pflicht!', 'error'); return; }
        let zones = [];
        try { zones = JSON.parse(document.getElementById('templateZonesJson').value || '[]'); }
        catch (e) { this.showToast('Ungültiges JSON in Zones!', 'error'); return; }
        const template = { id: id || 'template-' + Date.now(), name, description: document.getElementById('templateDescription').value.trim(), zones, isDefault: false };
        if (id) { const i = this.templates.findIndex(t => t.id === id); if (i !== -1) { template.isDefault = this.templates[i].isDefault; this.templates[i] = template; } }
        else this.templates.push(template);
        try {
            const method = id ? 'PUT' : 'POST';
            const url = id ? `/templates/${id}` : '/templates';
            await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(template) });
        } catch (e) {}
        this.closeAllModals(); this.renderTemplates(); this.updateNavBadges();
        this.showToast(id ? 'Template aktualisiert!' : 'Template erstellt!', 'success');
    }

    async deleteTemplate(id) {
        if (!confirm('Template löschen?')) return;
        this.templates = this.templates.filter(t => t.id !== id);
        try { await fetch(`/templates/${id}`, { method: 'DELETE' }); } catch (e) {}
        this.renderTemplates(); this.updateNavBadges(); this.showToast('Template gelöscht', 'success');
    }

    async applyTemplate(id) {
        const t = this.templates.find(t => t.id === id);
        if (!t) return;
        if (!confirm(`Template "${t.name}" anwenden? Aktuelle Zonen werden ersetzt.`)) return;
        this.zones = JSON.parse(JSON.stringify(t.zones));
        this.renderDesignerCanvas();
        await this.saveData();
        this.showToast(`Template "${t.name}" angewendet!`, 'success');
    }

    // ═══ DESIGNER ═══
    renderDesignerCanvas() {
        const canvas = document.getElementById('designerCanvas');
        if (!canvas) return;
        const layout = this.data?.layout || { width: 1920, height: 1080 };
        const wrapW = canvas.parentElement.clientWidth - 48;
        const scale = Math.min(wrapW / layout.width, (canvas.parentElement.clientHeight - 48) / layout.height) * this.canvasZoom;
        canvas.style.width = layout.width + 'px';
        canvas.style.height = layout.height + 'px';
        canvas.style.transform = `scale(${scale})`;
        const infoBar = document.getElementById('canvasSize');
        if (infoBar) infoBar.textContent = `${layout.width} × ${layout.height} | Zoom: ${Math.round(scale * 100)}%`;
        canvas.innerHTML = this.zones.map(z => `
        <div class="zone-card ${this.selectedZone?.id === z.id ? 'selected' : ''}"
             style="left:${z.x}%;top:${z.y}%;width:${z.w}%;height:${z.h}%;display:${z.visible===false?'none':'flex'};flex-direction:column;"
             data-zone-id="${z.id}"
             onmousedown="admin.startDrag(event,'${z.id}')">
            <div class="zone-card-header">
                <span>${z.name || z.type}</span>
                <span class="zone-card-type">${z.type.toUpperCase()}</span>
            </div>
            <div style="flex:1;display:flex;align-items:center;justify-content:center;font-size:11px;color:rgba(255,255,255,.3)">
                ${z.type === 'menu' ? `🍽️ ${(z.productIds||[]).length} Produkte` : z.type === 'ticker' ? '📜 Ticker' : z.type === 'media' ? '🖼️ Media' : z.type === 'clock' ? '🕐 Uhr' : '📝 Text'}
            </div>
            <div class="zone-resize-handle" onmousedown="admin.startResize(event,'${z.id}')"></div>
        </div>`).join('');
        canvas.querySelectorAll('.zone-card').forEach(el => {
            el.addEventListener('dblclick', () => this.openZoneModal(el.dataset.zoneId));
            el.addEventListener('click', e => { e.stopPropagation(); this.selectZoneInDesigner(el.dataset.zoneId); });
        });
        canvas.addEventListener('click', () => { this.selectedZone = null; document.getElementById('selectedZone').textContent = 'Keine Zone'; document.querySelectorAll('.zone-card').forEach(el => el.classList.remove('selected')); });
    }

    selectZoneInDesigner(id) {
        this.selectedZone = this.zones.find(z => z.id === id);
        const name = this.selectedZone?.name || id;
        document.getElementById('selectedZone').textContent = name;
        document.querySelectorAll('.zone-card').forEach(el => el.classList.toggle('selected', el.dataset.zoneId === id));
    }

    startDrag(e, id) {
        if (e.target.classList.contains('zone-resize-handle')) return;
        e.preventDefault(); e.stopPropagation();
        const canvas = document.getElementById('designerCanvas');
        const zone = this.zones.find(z => z.id === id);
        if (!zone) return;
        this.selectZoneInDesigner(id);
        const rect = canvas.getBoundingClientRect();
        const scale = parseFloat(canvas.style.transform.replace('scale(','').replace(')','')) || 1;
        const cw = canvas.offsetWidth * scale, ch = canvas.offsetHeight * scale;
        const startX = e.clientX, startY = e.clientY;
        const origX = zone.x, origY = zone.y;
        const onMove = e => {
            const dx = (e.clientX - startX) / cw * 100;
            const dy = (e.clientY - startY) / ch * 100;
            let newX = origX + dx, newY = origY + dy;
            if (this.snapGrid) { const snap = this.gridSize / (canvas.offsetWidth / 100); newX = Math.round(newX / snap) * snap; newY = Math.round(newY / snap) * snap; }
            zone.x = Math.max(0, Math.min(100 - zone.w, newX));
            zone.y = Math.max(0, Math.min(100 - zone.h, newY));
            this.renderDesignerCanvas();
        };
        const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    }

    startResize(e, id) {
        e.preventDefault(); e.stopPropagation();
        const canvas = document.getElementById('designerCanvas');
        const zone = this.zones.find(z => z.id === id);
        if (!zone) return;
        const scale = parseFloat(canvas.style.transform.replace('scale(','').replace(')','')) || 1;
        const cw = canvas.offsetWidth * scale, ch = canvas.offsetHeight * scale;
        const startX = e.clientX, startY = e.clientY;
        const origW = zone.w, origH = zone.h;
        const onMove = e => {
            const dw = (e.clientX - startX) / cw * 100;
            const dh = (e.clientY - startY) / ch * 100;
            zone.w = Math.max(5, Math.min(100 - zone.x, origW + dw));
            zone.h = Math.max(5, Math.min(100 - zone.y, origH + dh));
            this.renderDesignerCanvas();
        };
        const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    }

    selectTool(toolId) {
        document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        document.getElementById(toolId)?.classList.add('active');
        const types = { toolAddMenu:'menu', toolAddMedia:'media', toolAddTicker:'ticker', toolAddText:'text', toolAddClock:'clock' };
        if (types[toolId]) this.addZone(types[toolId]);
    }

    addZone(type) {
        const zone = { id: 'zone-' + Date.now(), name: type.charAt(0).toUpperCase() + type.slice(1) + ' Zone', type, x: 10, y: 10, w: 30, h: 20, visible: true, productIds: [], articleStyle: { showImage:true, showTitle:true, showPrice:true, showDescription:false, showBadge:true, showStock:true, pricePosition:'bottom-right', priceStyle:'badge-gold', imageSize:'large', cardLayout:'vertical', textAlign:'left', columnsCount:'auto' }, mediaSrc: '', text: '', tickerText: '' };
        this.zones.push(zone);
        this.renderDesignerCanvas();
        this.showToast(`${type}-Zone hinzugefügt`, 'success');
    }

    openZoneModal(id) {
        const modal = document.getElementById('zoneModal');
        const zone = this.zones.find(z => z.id === id);
        if (!zone) return;
        this.selectedZone = zone;
        document.getElementById('zoneModalTitle').textContent = 'Zone bearbeiten: ' + zone.name;
        document.getElementById('zoneId').value = zone.id;
        document.getElementById('zoneName').value = zone.name || '';
        document.getElementById('zoneType').value = zone.type || 'menu';
        document.getElementById('zoneX').value = parseFloat(zone.x).toFixed(1);
        document.getElementById('zoneY').value = parseFloat(zone.y).toFixed(1);
        document.getElementById('zoneW').value = parseFloat(zone.w).toFixed(1);
        document.getElementById('zoneH').value = parseFloat(zone.h).toFixed(1);
        document.getElementById('zoneVisible').checked = zone.visible !== false;
        this.updateZoneTypeUI(zone.type, zone);
        modal.classList.add('active');
    }

    updateZoneTypeUI(type, zone = null) {
        ['Articles','Media','Ticker','Text'].forEach(g => {
            const el = document.getElementById('zone' + g + 'Group');
            if (el) el.style.display = 'none';
        });
        if (type === 'menu') {
            document.getElementById('zoneArticlesGroup').style.display = 'block';
            this.renderZoneProductSelector(zone);
            const as = zone?.articleStyle || {};
            ['showImage','showTitle','showPrice','showDescription','showBadge','showStock'].forEach(k => {
                const el = document.getElementById(k); if (el) el.checked = as[k] !== false;
            });
            ['pricePosition','priceStyle','imageSize','cardLayout','textAlign','columnsCount'].forEach(k => {
                const el = document.getElementById(k); if (el && as[k]) el.value = as[k];
            });
        } else if (type === 'media') {
            document.getElementById('zoneMediaGroup').style.display = 'block';
            if (zone) { document.getElementById('zoneMediaSrc').value = zone.mediaSrc || ''; document.getElementById('zoneMediaType').value = zone.mediaType || 'image'; }
        } else if (type === 'ticker') {
            document.getElementById('zoneTickerGroup').style.display = 'block';
            if (zone) document.getElementById('zoneTickerText').value = zone.tickerText || zone.text || '';
        } else if (type === 'text' || type === 'clock') {
            document.getElementById('zoneTextGroup').style.display = 'block';
            if (zone) { document.getElementById('zoneTextContent').value = zone.text || ''; document.getElementById('zoneTextSize').value = zone.fontSize || 24; document.getElementById('zoneTextColor').value = zone.color || '#ffffff'; document.getElementById('zoneTextAlign').value = zone.textAlign || 'center'; }
        }
    }

    renderZoneProductSelector(zone = null) {
        const sel = document.getElementById('zoneProductSelector');
        if (!sel) return;
        const selected = zone?.productIds || [];
        sel.innerHTML = this.products.map(p => `<label class="zone-product-item ${selected.includes(p.id)?'selected':''}" data-pid="${p.id}">
            <input type="checkbox" ${selected.includes(p.id)?'checked':''} value="${p.id}" style="display:none">
            ${p.title}
        </label>`).join('');
        sel.querySelectorAll('.zone-product-item').forEach(el => {
            el.addEventListener('click', () => { el.classList.toggle('selected'); el.querySelector('input').checked = el.classList.contains('selected'); });
        });
    }

    saveZone() {
        const id = document.getElementById('zoneId').value;
        const type = document.getElementById('zoneType').value;
        const zone = this.zones.find(z => z.id === id);
        if (!zone) return;
        zone.name = document.getElementById('zoneName').value;
        zone.type = type;
        zone.x = parseFloat(document.getElementById('zoneX').value) || 0;
        zone.y = parseFloat(document.getElementById('zoneY').value) || 0;
        zone.w = parseFloat(document.getElementById('zoneW').value) || 20;
        zone.h = parseFloat(document.getElementById('zoneH').value) || 20;
        zone.visible = document.getElementById('zoneVisible').checked;
        if (type === 'menu') {
            zone.productIds = Array.from(document.querySelectorAll('.zone-product-item.selected')).map(el => parseInt(el.dataset.pid));
            zone.articleStyle = { showImage: document.getElementById('showImage').checked, showTitle: document.getElementById('showTitle').checked, showPrice: document.getElementById('showPrice').checked, showDescription: document.getElementById('showDescription').checked, showBadge: document.getElementById('showBadge').checked, showStock: document.getElementById('showStock').checked, pricePosition: document.getElementById('pricePosition').value, priceStyle: document.getElementById('priceStyle').value, imageSize: document.getElementById('imageSize').value, cardLayout: document.getElementById('cardLayout').value, textAlign: document.getElementById('textAlign').value, columnsCount: document.getElementById('columnsCount').value };
        } else if (type === 'media') {
            zone.mediaSrc = document.getElementById('zoneMediaSrc').value;
            zone.mediaType = document.getElementById('zoneMediaType').value;
        } else if (type === 'ticker') {
            zone.tickerText = document.getElementById('zoneTickerText').value;
            zone.text = zone.tickerText;
        } else if (type === 'text' || type === 'clock') {
            zone.text = document.getElementById('zoneTextContent').value;
            zone.fontSize = parseInt(document.getElementById('zoneTextSize').value) || 24;
            zone.color = document.getElementById('zoneTextColor').value;
            zone.textAlign = document.getElementById('zoneTextAlign').value;
        }
        this.closeAllModals();
        this.renderDesignerCanvas();
        this.showToast('Zone gespeichert', 'success');
    }

    deleteSelectedZone() {
        const id = document.getElementById('zoneId').value;
        if (!confirm('Zone löschen?')) return;
        this.zones = this.zones.filter(z => z.id !== id);
        this.closeAllModals();
        this.renderDesignerCanvas();
    }

    zoomCanvas(delta) {
        this.canvasZoom = Math.max(0.2, Math.min(2, this.canvasZoom + delta));
        this.renderDesignerCanvas();
    }
    fitCanvas() { this.canvasZoom = 1; this.renderDesignerCanvas(); }
    undo() { if (this.historyIndex > 0) { this.historyIndex--; this.zones = JSON.parse(this.history[this.historyIndex]); this.renderDesignerCanvas(); } }
    redo() { if (this.historyIndex < this.history.length - 1) { this.historyIndex++; this.zones = JSON.parse(this.history[this.historyIndex]); this.renderDesignerCanvas(); } }

    // ═══ MEDIA ═══
    async loadMedia() {
        try {
            const res = await fetch('/uploads-list');
            const data = await res.json();
            this.uploads = data.uploads || [];
            this.renderMedia();
            const nb = document.getElementById('nb-media');
            if (nb) nb.textContent = this.uploads.length;
        } catch (e) {}
    }

    renderMedia() {
        const grid = document.getElementById('mediaGrid');
        if (!grid) return;
        if (!this.uploads.length) {
            grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><i class="fas fa-photo-film"></i><p>Keine Medien hochgeladen</p></div>`;
            return;
        }
        grid.innerHTML = this.uploads.map(f => {
            const isVideo = /\.(mp4|webm|mov)$/i.test(f.filename);
            const thumb = isVideo
                ? `<div class="media-thumb"><i class="fas fa-video media-icon"></i></div>`
                : `<div class="media-thumb"><img src="${f.url}" alt="${f.filename}" loading="lazy" onerror="this.parentNode.innerHTML='<i class=fas fa-image media-icon></i>'"></div>`;
            return `<div class="media-card">
                ${thumb}
                <div class="media-info">
                    <div class="media-name" title="${f.filename}">${f.filename}</div>
                    <div class="media-size">${this.formatBytes(f.size)}</div>
                </div>
                <div style="padding:4px 8px 8px;display:flex;gap:4px;">
                    <button class="btn btn-ghost btn-xs" onclick="navigator.clipboard.writeText('${f.url}');admin.showToast('URL kopiert!','success')"><i class="fas fa-copy"></i></button>
                    <button class="btn btn-danger btn-xs" onclick="admin.deleteMedia('${f.filename}')"><i class="fas fa-trash"></i></button>
                </div>
            </div>`;
        }).join('');
    }

    async handleMediaUpload(e) {
        const files = e.target.files;
        if (!files?.length) return;
        for (const file of files) {
            const formData = new FormData();
            formData.append('file', file);
            try {
                const res = await fetch('/upload', { method: 'POST', body: formData });
                const result = await res.json();
                if (result.success) this.showToast(`${file.name} hochgeladen!`, 'success');
            } catch (err) { this.showToast(`Fehler bei ${file.name}`, 'error'); }
        }
        await this.loadMedia();
    }

    async deleteMedia(filename) {
        if (!confirm('Datei wirklich löschen?')) return;
        try {
            const res = await fetch(`/uploads/${filename}`, { method: 'DELETE' });
            const result = await res.json();
            if (result.success) { this.showToast('Datei gelöscht', 'success'); await this.loadMedia(); }
        } catch (e) {}
    }

    formatBytes(b) {
        if (!b) return '0 B';
        const k = 1024, units = ['B','KB','MB','GB'];
        const i = Math.floor(Math.log(b) / Math.log(k));
        return parseFloat((b / Math.pow(k, i)).toFixed(1)) + ' ' + units[i];
    }

    // ═══ PLAYLISTS ═══
    renderPlaylists() {
        const grid = document.getElementById('playlistsGrid');
        if (!grid) return;
        if (!this.playlists.length) {
            grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><i class="fas fa-list-ol"></i><p>Noch keine Playlisten.<br>Klicke auf "+ Playlist"</p></div>`;
            return;
        }
        grid.innerHTML = this.playlists.map(pl => `<div class="playlist-card">
            <div class="playlist-card-header">
                <div class="playlist-card-icon"><i class="fas fa-list-ol"></i></div>
                <span class="playlist-type-badge">${pl.type === 'zone' ? 'Zonen-Playlist' : 'Display-Playlist'}</span>
            </div>
            <div class="display-card-name">${pl.name}</div>
            <div class="display-card-desc">${pl.description || '—'}</div>
            <div class="playlist-items-count"><i class="fas fa-layer-group"></i> ${(pl.items||[]).length} Elemente ${pl.loop ? '· Loop' : ''} ${pl.shuffle ? '· Shuffle' : ''}</div>
            <div style="display:flex;gap:6px;margin-top:10px;">
                <button class="btn btn-ghost btn-sm" onclick="admin.openPlaylistModal('${pl.id}')"><i class="fas fa-pen"></i> Bearbeiten</button>
                <button class="btn btn-danger btn-sm" onclick="admin.deletePlaylist('${pl.id}')"><i class="fas fa-trash"></i></button>
            </div>
        </div>`).join('');
    }

    openPlaylistModal(idOrNull = null) {
        const modal = document.getElementById('playlistModal');
        const pl = typeof idOrNull === 'string' ? this.playlists.find(p => p.id === idOrNull) : null;
        this.editingPlaylist = pl;
        this.playlistItems = pl ? JSON.parse(JSON.stringify(pl.items || [])) : [];
        document.getElementById('playlistModalTitle').textContent = pl ? 'Playlist bearbeiten' : 'Neue Playlist';
        document.getElementById('playlistId').value = pl?.id || '';
        document.getElementById('playlistName').value = pl?.name || '';
        document.getElementById('playlistDescription').value = pl?.description || '';
        document.getElementById('playlistType').value = pl?.type || 'display';
        document.getElementById('playlistLoop').checked = pl?.loop !== false;
        document.getElementById('playlistShuffle').checked = pl?.shuffle || false;
        this.renderPlaylistItemsEditor();
        modal.classList.add('active');
    }

    renderPlaylistItemsEditor() {
        const el = document.getElementById('playlistItemsEditor');
        if (!el) return;
        if (!this.playlistItems.length) {
            el.innerHTML = '<div style="text-align:center;color:var(--text-3);font-size:13px;padding:20px;">Noch keine Elemente. Klicke auf "Element hinzufügen".</div>';
            return;
        }
        el.innerHTML = this.playlistItems.map((item, i) => `<div class="playlist-item-row" data-idx="${i}">
            <span class="playlist-item-handle"><i class="fas fa-grip-vertical"></i></span>
            <div class="playlist-item-content">
                <select onchange="admin.playlistItems[${i}].contentType=this.value">
                    <option value="template" ${item.contentType==='template'?'selected':''}>Template</option>
                    <option value="media" ${item.contentType==='media'?'selected':''}>Media</option>
                    <option value="url" ${item.contentType==='url'?'selected':''}>URL</option>
                </select>
                <input type="text" value="${item.contentId||''}" placeholder="ID / URL / Dateiname" onchange="admin.playlistItems[${i}].contentId=this.value">
                <input type="number" class="playlist-item-duration" value="${item.duration||10}" min="1" placeholder="Sekunden" title="Anzeigedauer in Sekunden" onchange="admin.playlistItems[${i}].duration=parseInt(this.value)||10">s
            </div>
            <button class="playlist-item-remove" onclick="admin.removePlaylistItem(${i})"><i class="fas fa-xmark"></i></button>
        </div>`).join('');
    }

    addPlaylistItem() {
        this.playlistItems.push({ contentType: 'template', contentId: '', duration: 10, order: this.playlistItems.length });
        this.renderPlaylistItemsEditor();
    }

    removePlaylistItem(idx) {
        this.playlistItems.splice(idx, 1);
        this.renderPlaylistItemsEditor();
    }

    updatePlaylistTypeUI() {}

    async savePlaylist() {
        const id = document.getElementById('playlistId').value;
        const pl = {
            id: id || 'playlist-' + Date.now(),
            name: document.getElementById('playlistName').value.trim(),
            description: document.getElementById('playlistDescription').value.trim(),
            type: document.getElementById('playlistType').value,
            loop: document.getElementById('playlistLoop').checked,
            shuffle: document.getElementById('playlistShuffle').checked,
            items: this.playlistItems
        };
        if (!pl.name) { this.showToast('Name ist pflicht!', 'error'); return; }
        if (id) { const i = this.playlists.findIndex(p => p.id === id); if (i !== -1) this.playlists[i] = pl; }
        else this.playlists.push(pl);
        try {
            const method = id ? 'PUT' : 'POST';
            const url = id ? `/playlists/${id}` : '/playlists';
            await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pl) });
        } catch (e) {}
        this.closeAllModals(); this.renderPlaylists(); this.updateNavBadges();
        this.showToast(id ? 'Playlist aktualisiert!' : 'Playlist erstellt!', 'success');
    }

    async deletePlaylist(id) {
        if (!confirm('Playlist löschen?')) return;
        this.playlists = this.playlists.filter(p => p.id !== id);
        try { await fetch(`/playlists/${id}`, { method: 'DELETE' }); } catch (e) {}
        this.renderPlaylists(); this.updateNavBadges(); this.showToast('Playlist gelöscht', 'success');
    }

    // ═══ REMOTE CONTROL ═══
    renderRemoteControl() {
        const el = document.getElementById('remoteDisplaysList');
        if (!el) return;
        if (!this.displays.length) { el.innerHTML = `<div class="empty-state"><i class="fas fa-desktop"></i><p>Keine Displays vorhanden</p></div>`; return; }
        el.innerHTML = this.displays.map(d => {
            const online = d.lastSeen && (Date.now() - new Date(d.lastSeen).getTime()) < 5 * 60 * 1000;
            return `<div class="remote-display-card">
                <div class="remote-display-title">
                    <span><i class="fas fa-circle" style="color:${online?'var(--green)':'var(--border)'}; font-size:8px; margin-right:6px;"></i>${d.name}</span>
                    <span class="display-online-badge ${online?'badge-online':'badge-offline'}">${online?'Online':'Offline'}</span>
                </div>
                <div class="remote-display-btns">
                    <button class="remote-btn" onclick="admin.remoteCommand('${d.id}','reload')"><i class="fas fa-rotate"></i> Neu laden</button>
                    <button class="remote-btn" onclick="admin.remoteCommand('${d.id}','next_template')"><i class="fas fa-forward-step"></i> Nächstes</button>
                    <button class="remote-btn danger" onclick="admin.remoteCommand('${d.id}','blackout')"><i class="fas fa-moon"></i> Blackout</button>
                    <button class="remote-btn" onclick="admin.remoteCommand('${d.id}','wake')"><i class="fas fa-sun"></i> Aufwecken</button>
                </div>
            </div>`;
        }).join('');
    }

    async remoteCommand(displayId, command) {
        const url = displayId === 'all' ? '/displays/broadcast' : `/displays/${displayId}/command`;
        try {
            await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ command }) });
            const displayName = displayId === 'all' ? 'Alle Displays' : (this.displays.find(d => d.id === displayId)?.name || displayId);
            this.showToast(`"${command}" → ${displayName}`, 'success');
        } catch (e) { this.showToast('Fernsteuerung fehlgeschlagen', 'error'); }
    }

    // ═══ SCHEDULES ═══
    async loadSchedules() {
        try {
            const res = await fetch('/schedule');
            const data = await res.json();
            this.renderSchedules(data.allSchedules || [], data.activeSchedule);
        } catch (e) { this.renderSchedules(this.data?.schedules || [], null); }
    }

    renderSchedules(schedules, activeSchedule) {
        const list = document.getElementById('schedulesList');
        if (!list) return;
        if (!schedules.length) { list.innerHTML = `<div class="empty-state"><i class="fas fa-clock"></i><p>Keine Zeitpläne. Klicke auf "+ Zeitplan"</p></div>`; return; }
        const days = ['So','Mo','Di','Mi','Do','Fr','Sa'];
        list.innerHTML = schedules.map(s => {
            const isNow = activeSchedule?.id === s.id;
            const dayLabels = (s.days||[]).map(d => days[d]).join(', ');
            return `<div class="schedule-card ${isNow ? 'is-active-now' : ''}">
                <div class="schedule-active-dot" title="${isNow ? 'Aktuell aktiv' : 'Inaktiv'}"></div>
                <div class="schedule-info">
                    <div class="schedule-name">${s.name} ${isNow ? '<span class="schedule-tag" style="color:var(--green);background:var(--green-dim);border-color:rgba(34,211,164,.2)">🟢 Jetzt aktiv</span>' : ''}</div>
                    <div class="schedule-desc">${s.description||''}</div>
                    <div class="schedule-meta">
                        <span class="schedule-tag time"><i class="fas fa-clock"></i> ${s.startTime}–${s.endTime}</span>
                        <span class="schedule-tag">${dayLabels||'Keine Tage'}</span>
                        ${s.badge ? `<span class="schedule-tag">${s.badge}</span>` : ''}
                        <span class="schedule-tag">${s.theme||'dark'}</span>
                    </div>
                </div>
                <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end;">
                    <label class="toggle schedule-toggle" title="Aktiv/Inaktiv">
                        <input type="checkbox" ${s.active ? 'checked' : ''} onchange="admin.toggleSchedule('${s.id}',this.checked)">
                        <span class="toggle-knob"></span>
                    </label>
                    <button class="btn btn-ghost btn-xs" onclick="admin.openScheduleModal('${s.id}')"><i class="fas fa-pen"></i></button>
                    <button class="btn btn-danger btn-xs" onclick="admin.deleteSchedule('${s.id}')"><i class="fas fa-trash"></i></button>
                </div>
            </div>`;
        }).join('');
    }

    openScheduleModal(idOrNull = null) {
        const modal = document.getElementById('scheduleModal');
        const s = typeof idOrNull === 'string' ? (this.data?.schedules||[]).find(s => s.id === idOrNull) : null;
        document.getElementById('scheduleModalTitle').textContent = s ? 'Zeitplan bearbeiten' : 'Neuer Zeitplan';
        document.getElementById('scheduleId').value = s?.id || '';
        document.getElementById('scheduleName').value = s?.name || '';
        document.getElementById('scheduleBadge').value = s?.badge || '';
        document.getElementById('scheduleDescription').value = s?.description || '';
        document.getElementById('scheduleStart').value = s?.startTime || '06:00';
        document.getElementById('scheduleEnd').value = s?.endTime || '22:00';
        document.getElementById('scheduleTheme').value = s?.theme || 'dark';
        document.getElementById('scheduleTicker').value = s?.tickerText || '';
        document.querySelectorAll('.schedule-day-check').forEach(cb => {
            cb.checked = s?.days ? s.days.includes(parseInt(cb.value)) : [1,2,3,4,5].includes(parseInt(cb.value));
        });
        const tplSel = document.getElementById('scheduleTemplate');
        tplSel.innerHTML = this.templates.map(t => `<option value="${t.id}" ${s?.templateId === t.id ? 'selected' : ''}>${t.name}</option>`).join('');
        if (s?.templateId) tplSel.value = s.templateId;
        modal.classList.add('active');
    }

    async saveSchedule() {
        const id = document.getElementById('scheduleId').value;
        const s = {
            id: id || 'schedule-' + Date.now(),
            name: document.getElementById('scheduleName').value.trim(),
            badge: document.getElementById('scheduleBadge').value.trim(),
            description: document.getElementById('scheduleDescription').value.trim(),
            startTime: document.getElementById('scheduleStart').value,
            endTime: document.getElementById('scheduleEnd').value,
            days: Array.from(document.querySelectorAll('.schedule-day-check:checked')).map(cb => parseInt(cb.value)),
            templateId: document.getElementById('scheduleTemplate').value,
            theme: document.getElementById('scheduleTheme').value,
            tickerText: document.getElementById('scheduleTicker').value.trim(),
            active: true
        };
        if (!s.name) { this.showToast('Name ist pflicht!', 'error'); return; }
        if (!this.data.schedules) this.data.schedules = [];
        if (id) { const i = this.data.schedules.findIndex(x => x.id === id); if (i !== -1) this.data.schedules[i] = s; }
        else this.data.schedules.push(s);
        await fetch('/schedules', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ schedules: this.data.schedules }) });
        this.closeAllModals();
        this.loadSchedules();
        this.showToast('Zeitplan gespeichert!', 'success');
    }

    async deleteSchedule(id) {
        if (!confirm('Zeitplan löschen?')) return;
        this.data.schedules = (this.data.schedules||[]).filter(s => s.id !== id);
        await fetch('/schedules', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ schedules: this.data.schedules }) });
        this.loadSchedules();
        this.showToast('Zeitplan gelöscht', 'success');
    }

    async toggleSchedule(id, active) {
        const s = (this.data?.schedules||[]).find(s => s.id === id);
        if (s) s.active = active;
        await fetch('/schedules', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ schedules: this.data.schedules }) });
    }

    // ═══ ANALYTICS ═══
    async loadAnalytics() {
        try {
            const res = await fetch('/analytics');
            this.analyticsData = await res.json();
            if (this.currentTab === 'analytics') this.renderAnalytics();
            if (this.currentTab === 'dashboard') this.renderDashboard();
        } catch (e) {}
    }

    renderAnalytics() {
        const a = this.analyticsData;
        if (!a) return;
        // Product ranking
        const pr = document.getElementById('analyticsProductRanking');
        if (pr) {
            const top = (a.productRanking || []).slice(0, 10);
            if (!top.length) { pr.innerHTML = `<div class="empty-state" style="padding:20px"><i class="fas fa-chart-bar"></i><p>Noch keine Daten</p></div>`; }
            else pr.innerHTML = top.map((p, i) => `<div class="analytics-row">
                <span class="analytics-rank">${i+1}</span>
                <span class="analytics-name">${p.name}</span>
                <span class="analytics-cat">${p.category}</span>
                <span class="analytics-views">${p.views}</span>
            </div>`).join('');
        }
        // 7 days chart
        const d7 = document.getElementById('analytics7Days');
        if (d7 && a.last7Days) {
            const max = Math.max(...a.last7Days.map(d => d.views), 1);
            d7.innerHTML = `<div class="chart-bars">${a.last7Days.map(d => `<div class="chart-bar-wrap">
                <div class="chart-bar" style="height:${Math.round(d.views/max*100)}px" title="${d.views} Aufrufe"></div>
            </div>`).join('')}</div>
            <div class="chart-x-labels">${a.last7Days.map(d => `<span class="chart-x-label">${d.date.slice(5)}</span>`).join('')}</div>`;
        }
        // Hourly chart
        const ho = document.getElementById('analyticsHourly');
        if (ho && a.hourlyToday) {
            const max = Math.max(...a.hourlyToday.map(h => h.views), 1);
            ho.innerHTML = `<div class="chart-bars">${a.hourlyToday.map(h => `<div class="chart-bar-wrap">
                <div class="chart-bar" style="height:${Math.round(h.views/max*100)}px" title="${h.hour}:00 – ${h.views} Aufrufe"></div>
            </div>`).join('')}</div>
            <div class="chart-x-labels">${a.hourlyToday.filter((_,i) => i % 4 === 0).map(h => `<span class="chart-x-label" style="flex:4">${h.hour}h</span>`).join('')}</div>`;
        }
        // Display views
        const dv = document.getElementById('analyticsDisplays');
        if (dv) {
            const entries = Object.entries(a.displayViews || {});
            if (!entries.length) { dv.innerHTML = '<div class="empty-state" style="padding:20px"><i class="fas fa-desktop"></i><p>Noch keine Daten</p></div>'; }
            else dv.innerHTML = entries.map(([id, views]) => {
                const d = this.displays.find(d => d.id === id);
                return `<div class="analytics-row"><span class="analytics-name">${d?.name || id}</span><span class="analytics-views">${views}</span></div>`;
            }).join('');
        }
    }

    async resetAnalytics() {
        if (!confirm('Analytics-Daten wirklich löschen?')) return;
        await fetch('/analytics/reset', { method: 'DELETE' });
        await this.loadAnalytics();
        this.showToast('Analytics zurückgesetzt', 'success');
    }

    // ═══ FEATURES ═══
    renderFeatureSettings() {
        const d = this.data || {};
        const w = d.weather || {};
        document.getElementById('weatherSettings').innerHTML = `
            <div class="setting-row"><label>Wetter aktiv</label><label class="toggle"><input type="checkbox" id="weatherEnabled" ${w.enabled!==false?'checked':''}><span class="toggle-knob"></span></label></div>
            <div class="form-group" style="margin-top:10px"><label>Breitengrad</label><input type="text" id="weatherLat" value="${w.latitude||'52.52'}"></div>
            <div class="form-group"><label>Längengrad</label><input type="text" id="weatherLon" value="${w.longitude||'13.41'}"></div>
            <div class="setting-row"><label>Empfehlungen anzeigen</label><label class="toggle"><input type="checkbox" id="weatherRecommendations" ${w.showRecommendations!==false?'checked':''}><span class="toggle-knob"></span></label></div>`;

        const qr = d.qrCodes || {};
        document.getElementById('qrSettings').innerHTML = `
            <div class="setting-row"><label>QR-Codes aktiv</label><label class="toggle"><input type="checkbox" id="qrEnabled" ${qr.enabled!==false?'checked':''}><span class="toggle-knob"></span></label></div>
            <div class="form-group" style="margin-top:10px"><label>Basis-URL</label><input type="text" id="qrBaseUrl" value="${qr.baseUrl||''}" placeholder="https://example.com/menu"></div>
            <div class="setting-row"><label>Auf Produkten</label><label class="toggle"><input type="checkbox" id="qrOnProducts" ${qr.showOnProducts!==false?'checked':''}><span class="toggle-knob"></span></label></div>
            <div class="setting-row"><label>Im Display</label><label class="toggle"><input type="checkbox" id="qrOnDisplay" ${qr.showOnDisplay!==false?'checked':''}><span class="toggle-knob"></span></label></div>`;

        const lang = d.languages || { enabled:['de','en'], default:'de' };
        document.getElementById('languageSettings').innerHTML = `
            <div class="setting-row"><label>Mehrsprachig aktiv</label><label class="toggle"><input type="checkbox" id="langEnabled" checked><span class="toggle-knob"></span></label></div>
            <div class="form-group" style="margin-top:10px"><label>Sprachen</label><div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;">
                <label class="toggle-chip"><input type="checkbox" class="lang-check" value="de" ${(lang.enabled||[]).includes('de')?'checked':''}><span>🇩🇪 DE</span></label>
                <label class="toggle-chip"><input type="checkbox" class="lang-check" value="en" ${(lang.enabled||[]).includes('en')?'checked':''}><span>🇬🇧 EN</span></label>
                <label class="toggle-chip"><input type="checkbox" class="lang-check" value="ar" ${(lang.enabled||[]).includes('ar')?'checked':''}><span>🇸🇦 AR</span></label>
                <label class="toggle-chip"><input type="checkbox" class="lang-check" value="tr" ${(lang.enabled||[]).includes('tr')?'checked':''}><span>🇹🇷 TR</span></label>
            </div></div>
            <div class="form-group"><label>Standard-Sprache</label><select id="defaultLang"><option value="de" ${lang.default==='de'?'selected':''}>Deutsch</option><option value="en" ${lang.default==='en'?'selected':''}>English</option><option value="ar" ${lang.default==='ar'?'selected':''}>العربية</option><option value="tr" ${lang.default==='tr'?'selected':''}>Türkçe</option></select></div>`;

        const anim = d.animations || {};
        document.getElementById('animationSettings').innerHTML = `
            <div class="setting-row"><label>Animationen aktiv</label><label class="toggle"><input type="checkbox" id="animEnabled" ${anim.enabled!==false?'checked':''}><span class="toggle-knob"></span></label></div>
            <div class="form-group" style="margin-top:10px"><label>Seiten-Übergang</label><select id="animTransition"><option value="slide" ${anim.pageTransition==='slide'?'selected':''}>Slide</option><option value="fade" ${anim.pageTransition==='fade'?'selected':''}>Fade</option><option value="zoom" ${anim.pageTransition==='zoom'?'selected':''}>Zoom</option><option value="none" ${anim.pageTransition==='none'?'selected':''}>Kein</option></select></div>
            <div class="setting-row"><label>Produkt-FadeIn</label><label class="toggle"><input type="checkbox" id="animFadeIn" ${anim.productFadeIn!==false?'checked':''}><span class="toggle-knob"></span></label></div>
            <div class="setting-row"><label>Angebot-Pulsieren</label><label class="toggle"><input type="checkbox" id="animPulse" ${anim.offerPulse!==false?'checked':''}><span class="toggle-knob"></span></label></div>
            <div class="form-group"><label>Übergangsdauer (ms)</label><input type="number" id="animDuration" value="${anim.transitionDuration||500}" min="100" max="2000"></div>`;
    }

    async testWeather() {
        const lat = document.getElementById('weatherLat')?.value || '52.52';
        const lon = document.getElementById('weatherLon')?.value || '13.41';
        const result = document.getElementById('weatherTestResult');
        if (result) result.textContent = '⏳ Lädt Wetterdaten...';
        try {
            const res = await fetch(`/weather?lat=${lat}&lon=${lon}`);
            const w = await res.json();
            if (!res.ok) throw new Error(w.error || 'Fehler');
            if (result) result.textContent = `${w.icon} ${w.temperature}°C | 💨 ${w.windspeed} km/h${w.recommendation ? ' | ' + w.recommendation : ''}`;
        } catch (e) {
            if (result) result.textContent = '❌ ' + e.message;
        }
    }

    async saveFeatures() {
        if (!this.data) return;
        this.data.weather = { enabled: document.getElementById('weatherEnabled')?.checked !== false, latitude: document.getElementById('weatherLat')?.value || '52.52', longitude: document.getElementById('weatherLon')?.value || '13.41', showOnDisplay: true, showRecommendations: document.getElementById('weatherRecommendations')?.checked !== false, updateInterval: 300000 };
        this.data.qrCodes = { enabled: document.getElementById('qrEnabled')?.checked !== false, baseUrl: document.getElementById('qrBaseUrl')?.value || '', showOnProducts: document.getElementById('qrOnProducts')?.checked !== false, showOnDisplay: document.getElementById('qrOnDisplay')?.checked !== false };
        const langChecks = document.querySelectorAll('.lang-check:checked');
        this.data.languages = { enabled: Array.from(langChecks).map(cb => cb.value), default: document.getElementById('defaultLang')?.value || 'de', showSelector: true };
        this.data.animations = { enabled: document.getElementById('animEnabled')?.checked !== false, pageTransition: document.getElementById('animTransition')?.value || 'slide', productFadeIn: document.getElementById('animFadeIn')?.checked !== false, offerPulse: document.getElementById('animPulse')?.checked !== false, transitionDuration: parseInt(document.getElementById('animDuration')?.value || '500') };
        await this.saveData();
        this.showToast('Features gespeichert!', 'success');
    }

    // ═══ MODALS ═══
    closeAllModals() {
        document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
    }

    // ═══ TOAST ═══
    showToast(msg, type = 'info') {
        const icons = { success:'fa-circle-check', error:'fa-circle-xmark', info:'fa-circle-info' };
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<i class="fas ${icons[type]||'fa-circle-info'} toast-icon ${type}"></i><span>${msg}</span>`;
        document.getElementById('toastContainer').appendChild(toast);
        setTimeout(() => { toast.classList.add('toast-fade'); setTimeout(() => toast.remove(), 300); }, 3000);
    }
}

const admin = new MenuboardAdmin();
window.admin = admin;
