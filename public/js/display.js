/**
 * DIGITAL MENUBOARD v7.20 - DISPLAY JS v2.1
 * Fixes: Theme switching, Font support, Sold-out badges
 */

class MenuboardDisplay {
    constructor() {
        this.data = null;
        this.products = [];
        this.zones = [];
        this.settings = {};
        this.ticker = {};
        this.layout = {};
        this.refreshInterval = null;
        this.lastModified = null;
        this.fontLink = null;

        this.init();
    }

    async init() {
        await this.loadData();
        this.render();
        this.hideLoading();
        this.startAutoRefresh();
        this.setupKeyboard();
    }

    async loadData() {
        try {
            // v7.40: Support display-specific data loading
            const displaySlug = window.DISPLAY_SLUG;

            if (displaySlug) {
                // Load display-specific configuration
                const displayRes = await fetch('/data');
                const fullData = await displayRes.json();
                const display = (fullData.displays || []).find(d => d.slug === displaySlug);

                if (display) {
                    this.data = fullData;
                    this.products = fullData.products || [];
                    // Use display-specific zones if available, otherwise fall back to global zones
                    this.zones = display.zones?.length > 0 ? display.zones : fullData.zones || [];
                    this.settings = { ...fullData.settings, ...display.settings };
                    this.ticker = fullData.ticker || {};
                    this.layout = fullData.layout || { width: 1920, height: 1080 };
                    this.lastModified = fullData.lastModified;
                    this.displayConfig = display; // Store display config
                } else {
                    // Fallback to global data
                    this.data = fullData;
                    this.products = fullData.products || [];
                    this.zones = fullData.zones || [];
                    this.settings = fullData.settings || {};
                    this.ticker = fullData.ticker || {};
                    this.layout = fullData.layout || { width: 1920, height: 1080 };
                    this.lastModified = fullData.lastModified;
                }
            } else {
                // Standard global data loading
                const res = await fetch('/data');
                this.data = await res.json();
                this.products = this.data.products || [];
                this.zones = this.data.zones || [];
                this.settings = this.data.settings || {};
                this.ticker = this.data.ticker || {};
                this.layout = this.data.layout || { width: 1920, height: 1080 };
                this.lastModified = this.data.lastModified;
            }

            this.applyTheme();
            this.applyFont();
        } catch (e) {
            console.error('Fehler beim Laden:', e);
        }
    }


    // ==================== FEATURE 1: TIME-BASED CONTENT (v7.50) ====================

    async loadSchedule() {
        try {
            const res = await fetch('/schedule');
            const data = await res.json();
            if (data.success && data.activeSchedule) {
                this.currentSchedule = data.activeSchedule;
                // Apply schedule-specific settings
                if (this.currentSchedule.theme) {
                    this.settings.theme = this.currentSchedule.theme;
                }
                if (this.currentSchedule.tickerText) {
                    this.ticker.text = this.currentSchedule.tickerText;
                }
            }
        } catch (e) {
            console.error('Schedule load error:', e);
        }
    }

    getScheduleProducts() {
        if (!this.currentSchedule || !this.currentSchedule.productIds) {
            return this.products;
        }
        return this.products.filter(p => this.currentSchedule.productIds.includes(p.id));
    }

    getScheduleBadge() {
        return this.currentSchedule?.badge || null;
    }

    // ==================== FEATURE 2: WEATHER INTEGRATION (v7.50) ====================

    async loadWeather() {
        try {
            const weatherEnabled = this.settings?.weather?.enabled !== false;
            if (!weatherEnabled) return;

            const lat = this.settings?.weather?.latitude || '52.52';
            const lon = this.settings?.weather?.longitude || '13.41';

            const res = await fetch(`/weather?lat=${lat}&lon=${lon}`);
            this.weather = await res.json();
        } catch (e) {
            console.error('Weather load error:', e);
            this.weather = { success: false, icon: '☀️', text: 'Wetter nicht verfügbar', recommendation: '' };
        }
    }

    renderWeatherWidget() {
        if (!this.weather || this.settings?.weather?.showOnDisplay === false) return '';

        const w = this.weather;
        const temp = w.temperature !== null ? `${w.temperature}°C` : '';
        const showRec = this.settings?.weather?.showRecommendations !== false;

        return `
            <div class="weather-widget ${w.success ? '' : 'weather-offline'}">
                <div class="weather-main">
                    <span class="weather-icon">${w.icon || '☀️'}</span>
                    <span class="weather-temp">${temp}</span>
                    <span class="weather-text">${w.text || ''}</span>
                </div>
                ${showRec && w.recommendation ? `
                <div class="weather-recommendation">
                    <i class="fas fa-lightbulb"></i> ${w.recommendation}
                </div>
                ` : ''}
            </div>
        `;
    }

    // ==================== FEATURE 3: QR CODES (v7.50) ====================

    generateQRCode(text, size = 80) {
        // Simple QR code using QRServer API (no library needed)
        const encoded = encodeURIComponent(text);
        return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}`;
    }

    renderProductQR(product) {
        const qrEnabled = this.settings?.qrCodes?.enabled !== false;
        const showOnProducts = this.settings?.qrCodes?.showOnProducts !== false;
        if (!qrEnabled || !showOnProducts) return '';

        const baseUrl = this.settings?.qrCodes?.baseUrl || window.location.origin;
        const qrText = `${baseUrl}/order?product=${product.id}`;
        const qrUrl = this.generateQRCode(qrText, 60);

        return `
            <div class="product-qr">
                <img src="${qrUrl}" alt="QR Code" loading="lazy">
                <span>Scan für Bestellung</span>
            </div>
        `;
    }

    renderDisplayQR() {
        const qrEnabled = this.settings?.qrCodes?.enabled !== false;
        const showOnDisplay = this.settings?.qrCodes?.showOnDisplay !== false;
        if (!qrEnabled || !showOnDisplay) return '';

        const currentUrl = window.location.href;
        const qrUrl = this.generateQRCode(currentUrl, 100);

        return `
            <div class="display-qr">
                <img src="${qrUrl}" alt="Display QR" loading="lazy">
                <span>Scan für Menü</span>
            </div>
        `;
    }

    // ==================== FEATURE 4: MULTILINGUAL (v7.50) ====================

    async loadTranslations() {
        // Built-in translations for common terms
        this.translations = {
            de: {
                menu: 'Menü',
                price: 'Preis',
                soldOut: 'Ausverkauft',
                lowStock: 'Wenig verfügbar',
                bestseller: 'Bestseller',
                new: 'Neu',
                offer: 'Angebot',
                limited: 'Limitiert',
                scanToOrder: 'Scan für Bestellung',
                weather: 'Wetter',
                currentOffer: 'Aktuelles Angebot'
            },
            en: {
                menu: 'Menu',
                price: 'Price',
                soldOut: 'Sold Out',
                lowStock: 'Low Stock',
                bestseller: 'Bestseller',
                new: 'New',
                offer: 'Offer',
                limited: 'Limited',
                scanToOrder: 'Scan to Order',
                weather: 'Weather',
                currentOffer: 'Current Offer'
            },
            ar: {
                menu: 'قائمة الطعام',
                price: 'السعر',
                soldOut: 'نفذت الكمية',
                lowStock: 'كمية محدودة',
                bestseller: 'الأكثر مبيعاً',
                new: 'جديد',
                offer: 'عرض',
                limited: 'محدود',
                scanToOrder: 'امسح للطلب',
                weather: 'الطقس',
                currentOffer: 'العرض الحالي'
            }
        };

        // Detect language from settings or browser
        const enabled = this.settings?.languages?.enabled || ['de'];
        const defaultLang = this.settings?.languages?.default || 'de';
        this.currentLanguage = enabled.includes(defaultLang) ? defaultLang : enabled[0];
    }

    t(key) {
        const lang = this.translations[this.currentLanguage] || this.translations['de'];
        return lang[key] || key;
    }

    renderLanguageSelector() {
        const enabled = this.settings?.languages?.enabled || ['de'];
        const showSelector = this.settings?.languages?.showSelector !== false;

        if (!showSelector || enabled.length < 2) return '';

        const flags = { de: '🇩🇪', en: '🇬🇧', ar: '🇸🇦' };

        return `
            <div class="language-selector">
                ${enabled.map(lang => `
                    <button class="lang-btn ${lang === this.currentLanguage ? 'active' : ''}" 
                            onclick="window.menuboard.setLanguage('${lang}')">
                        ${flags[lang] || lang} ${lang.toUpperCase()}
                    </button>
                `).join('')}
            </div>
        `;
    }

    setLanguage(lang) {
        this.currentLanguage = lang;
        this.render();
    }

    // ==================== FEATURE 5: ANIMATIONS (v7.50) ====================

    getAnimationClasses() {
        const anims = this.settings?.animations || {};
        if (!anims.enabled) return {};

        return {
            pageTransition: anims.pageTransition || 'slide',
            productFadeIn: anims.productFadeIn !== false,
            offerPulse: anims.offerPulse !== false,
            duration: anims.transitionDuration || 500
        };
    }

    animateProductEntry(element, index) {
        const anims = this.getAnimationClasses();
        if (!anims.productFadeIn) return;

        element.style.opacity = '0';
        element.style.transform = 'translateY(20px)';
        element.style.transition = `all ${anims.duration}ms ease ${index * 100}ms`;

        requestAnimationFrame(() => {
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        });
    }

    animateOffer(element) {
        const anims = this.getAnimationClasses();
        if (!anims.offerPulse) return;

        element.classList.add('pulse-animation');
    }
    applyTheme() {
        const theme = this.settings.theme || 'dark';
        // Remove all theme classes first
        document.body.classList.remove('theme-light', 'theme-burger', 'theme-coffee', 'theme-dark');
        // Always add the current theme class (including dark for explicit override)
        document.body.classList.add(`theme-${theme}`);

        // Also update CSS variables directly for instant feedback
        const root = document.documentElement;
        if (theme === 'dark') {
            root.style.setProperty('--bg-primary', '#0a0a0f');
            root.style.setProperty('--bg-card', '#141420');
            root.style.setProperty('--bg-card-hover', '#1a1a2e');
            root.style.setProperty('--border-color', '#2a2a3a');
            root.style.setProperty('--border-light', '#3a3a4a');
            root.style.setProperty('--text-primary', '#ffffff');
            root.style.setProperty('--text-secondary', '#b0b0c8');
            root.style.setProperty('--text-muted', '#6a6a8a');
            root.style.setProperty('--text-accent', '#FFD700');
            root.style.setProperty('--accent-primary', '#6366f1');
            root.style.setProperty('--accent-gold', '#FFD700');
        } else if (theme === 'light') {
            root.style.setProperty('--bg-primary', '#f5f5f5');
            root.style.setProperty('--bg-card', '#ffffff');
            root.style.setProperty('--bg-card-hover', '#f0f0f0');
            root.style.setProperty('--border-color', '#e0e0e0');
            root.style.setProperty('--border-light', '#d0d0d0');
            root.style.setProperty('--text-primary', '#1a1a2e');
            root.style.setProperty('--text-secondary', '#4a4a6a');
            root.style.setProperty('--text-muted', '#8a8aaa');
            root.style.setProperty('--text-accent', '#b8860b');
            root.style.setProperty('--accent-primary', '#6366f1');
            root.style.setProperty('--accent-gold', '#b8860b');
        } else if (theme === 'burger') {
            root.style.setProperty('--bg-primary', '#1a0a00');
            root.style.setProperty('--bg-card', '#2a1500');
            root.style.setProperty('--bg-card-hover', '#3a2000');
            root.style.setProperty('--border-color', '#4a3000');
            root.style.setProperty('--border-light', '#5a4000');
            root.style.setProperty('--text-primary', '#ffffff');
            root.style.setProperty('--text-secondary', '#e0c8a0');
            root.style.setProperty('--text-muted', '#a08060');
            root.style.setProperty('--text-accent', '#ffaa00');
            root.style.setProperty('--accent-primary', '#ff6b00');
            root.style.setProperty('--accent-gold', '#ffaa00');
        } else if (theme === 'coffee') {
            root.style.setProperty('--bg-primary', '#1a1200');
            root.style.setProperty('--bg-card', '#2a1f0a');
            root.style.setProperty('--bg-card-hover', '#3a2a10');
            root.style.setProperty('--border-color', '#4a3a20');
            root.style.setProperty('--border-light', '#5a4a30');
            root.style.setProperty('--text-primary', '#ffffff');
            root.style.setProperty('--text-secondary', '#d4c4a8');
            root.style.setProperty('--text-muted', '#a09070');
            root.style.setProperty('--text-accent', '#c4a35a');
            root.style.setProperty('--accent-primary', '#8b6914');
            root.style.setProperty('--accent-gold', '#c4a35a');
        }
    }

    applyFont() {
        const font = this.settings.font || 'Inter';
        const fontMap = {
            'Inter': 'Inter',
            'Roboto': 'Roboto',
            'Montserrat': 'Montserrat',
            'Oswald': 'Oswald',
            'Playfair': 'Playfair Display',
            'Bebas': 'Bebas Neue',
            'Poppins': 'Poppins'
        };

        const fontFamily = fontMap[font] || 'Inter';
        document.body.style.fontFamily = `'${fontFamily}', -apple-system, BlinkMacSystemFont, sans-serif`;

        // Load Google Font if not already loaded
        const fontUrl = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/ /g, '+')}:wght@300;400;500;600;700;800;900&display=swap`;

        if (this.fontLink) {
            this.fontLink.href = fontUrl;
        } else {
            this.fontLink = document.createElement('link');
            this.fontLink.rel = 'stylesheet';
            this.fontLink.href = fontUrl;
            document.head.appendChild(this.fontLink);
        }
    }

    render() {
        const container = document.getElementById('displayContainer');
        container.innerHTML = '';

        this.zones.forEach((zone, index) => {
            if (zone.visible === false) return;

            const el = document.createElement('div');
            el.className = `display-zone zone-${zone.type}`;
            el.style.left = zone.x + '%';
            el.style.top = zone.y + '%';
            el.style.width = zone.w + '%';
            el.style.height = zone.h + '%';
            el.style.animationDelay = `${index * 0.1}s`;

            switch (zone.type) {
                case 'menu':
                    el.innerHTML = this.renderMenuZone(zone);
                    break;
                case 'media':
                    el.innerHTML = this.renderMediaZone(zone);
                    break;
                case 'ticker':
                    el.innerHTML = this.renderTickerZone(zone);
                    break;
                case 'text':
                    el.innerHTML = this.renderTextZone(zone);
                    break;
                case 'clock':
                    el.innerHTML = this.renderClockZone(zone);
                    break;
            }

            container.appendChild(el);
        });

        this.applyTickerSpeed();
    }

    // ==================== MENU ZONE WITH ARTICLE BUILDER ====================
    renderMenuZone(zone) {
        const zoneProducts = (zone.productIds || [])
            .map(id => this.products.find(p => p.id === id))
            .filter(p => p);

        if (zoneProducts.length === 0) {
            return `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-muted);flex-direction:column;gap:8px;">
                <i class="fas fa-utensils" style="font-size:28px;"></i>
                <p style="font-size:14px;">Keine Produkte zugewiesen</p>
            </div>`;
        }

        const currency = this.settings.currency || '€';
        const style = zone.articleStyle || {};

        // Default settings
        const showImage = style.showImage !== false;
        const showTitle = style.showTitle !== false;
        const showPrice = style.showPrice !== false;
        const showDescription = style.showDescription || false;
        const showBadge = style.showBadge !== false;
        const showStock = style.showStock !== false;
        const pricePosition = style.pricePosition || 'bottom-right';
        const priceStyle = style.priceStyle || 'badge-gold';
        const imageSize = style.imageSize || 'large';
        const cardLayout = style.cardLayout || 'vertical';
        const textAlign = style.textAlign || 'left';
        const columnsCount = style.columnsCount || 'auto';

        // Calculate columns
        let cols = columnsCount === 'auto' ? 
            (zoneProducts.length <= 4 ? 2 : zoneProducts.length <= 8 ? 3 : 4) : 
            parseInt(columnsCount);

        const cards = zoneProducts.map((product, i) => {
            // Stock status overlay
            let stockOverlay = '';
            if (showStock && product.stockStatus) {
                const stockClass = product.stockStatus === 'soldout' ? 'soldout' : 
                                   product.stockStatus === 'low' ? 'low' : '';
                const stockText = product.stockStatus === 'soldout' ? 'AUSVERKAUFT' : 
                                  product.stockStatus === 'low' ? 'NUR NOCH WENIGE' : '';
                if (stockClass) {
                    stockOverlay = `<div class="stock-overlay ${stockClass}">${stockText}</div>`;
                }
            }

            // Image
            let imageHtml = '';
            if (showImage) {
                const imgHeight = imageSize === 'large' ? '50%' : imageSize === 'medium' ? '40%' : imageSize === 'small' ? '30%' : '25%';
                imageHtml = product.image ? 
                    `<div class="product-image-display" style="height:${imgHeight};">
                        <img src="${product.image}" alt="${product.title}" onerror="this.style.display='none';this.parentElement.innerHTML='<div class=\'placeholder\'><i class=\'fas fa-utensils\'></i></div>'">
                        ${stockOverlay}
                    </div>` :
                    `<div class="product-image-display" style="height:${imgHeight};"><div class="placeholder"><i class="fas fa-utensils"></i></div></div>`;
            }

            // Badge
            let badgeHtml = '';
            if (showBadge && product.badge && product.stockStatus !== 'soldout') {
                badgeHtml = `<span class="product-badge-display ${product.badge.toLowerCase()}">${product.badge}</span>`;
            }

            // Price
            let priceHtml = '';
            if (showPrice && product.stockStatus !== 'soldout') {
                const priceClass = priceStyle === 'badge-gold' ? 'price-badge-gold' : 
                                   priceStyle === 'badge-dark' ? 'price-badge-dark' :
                                   priceStyle === 'text-plain' ? 'price-text-plain' : 'price-text-bold';

                const pricePosClass = pricePosition === 'bottom-right' ? 'price-bottom-right' :
                                      pricePosition === 'top-right' ? 'price-top-right' :
                                      pricePosition === 'inline' ? 'price-inline' : 'price-overlay';

                priceHtml = `<span class="${priceClass} ${pricePosClass}">${product.price}${currency}</span>`;
            }

            // Title
            let titleHtml = '';
            if (showTitle) {
                const opacity = product.stockStatus === 'soldout' ? 'opacity:0.5;text-decoration:line-through;' : '';
                titleHtml = `<div class="product-title-display" style="text-align:${textAlign};${opacity}">${product.title}</div>`;
            }

            // Description
            let descHtml = '';
            if (showDescription && product.description) {
                const opacity = product.stockStatus === 'soldout' ? 'opacity:0.4;' : '';
                descHtml = `<div class="product-desc-display" style="text-align:${textAlign};${opacity}">${product.description}</div>`;
            }

            // Layout
            const isHorizontal = cardLayout === 'horizontal';
            const isCompact = cardLayout === 'compact';

            if (isCompact) {
                return `
                    <div class="product-card-display product-compact" style="animation-delay: ${i * 0.08}s">
                        <div class="product-info-display" style="text-align:${textAlign};">
                            ${titleHtml}
                            ${priceHtml}
                            ${descHtml}
                        </div>
                    </div>
                `;
            }

            if (isHorizontal) {
                return `
                    <div class="product-card-display product-horizontal" style="animation-delay: ${i * 0.08}s">
                        ${imageHtml}
                        <div class="product-info-display" style="text-align:${textAlign};">
                            ${badgeHtml}
                            ${titleHtml}
                            ${descHtml}
                            ${pricePosition === 'inline' ? priceHtml : ''}
                        </div>
                        ${pricePosition !== 'inline' ? priceHtml : ''}
                    </div>
                `;
            }

            // Vertical (default)
            return `
                <div class="product-card-display" style="animation-delay: ${i * 0.08}s">
                    <div class="product-image-wrapper">
                        ${imageHtml}
                        ${badgeHtml}
                        ${pricePosition === 'overlay' ? priceHtml : ''}
                        ${pricePosition === 'bottom-right' ? priceHtml : ''}
                    </div>
                    <div class="product-info-display" style="text-align:${textAlign};">
                        ${titleHtml}
                        ${descHtml}
                        ${pricePosition === 'inline' ? priceHtml : ''}
                    </div>
                    ${pricePosition === 'top-right' ? priceHtml : ''}
                </div>
            `;
        }).join('');

        return `
            <div class="menu-header">
                <h2>${zone.name}</h2>
            </div>
            <div class="menu-grid" style="grid-template-columns: repeat(${cols}, 1fr);">
                ${cards}
            </div>
        `;
    }

    renderMediaZone(zone) {
        const src = zone.mediaSrc || '';
        const type = zone.mediaType || 'image';

        if (!src) {
            return `<div class="media-placeholder">
                <i class="fas fa-image"></i>
                <span>Kein Media zugewiesen</span>
            </div>`;
        }

        if (type === 'video') {
            return `<video src="${src}" autoplay muted loop playsinline onerror="this.parentElement.innerHTML='<div class=\'media-placeholder\'><i class=\'fas fa-film\'></i><span>Video nicht verfügbar</span></div>'"></video>`;
        }

        return `<img src="${src}" alt="Media" onerror="this.parentElement.innerHTML='<div class=\'media-placeholder\'><i class=\'fas fa-image\'></i><span>Bild nicht verfügbar</span></div>'">`;
    }

    renderTickerZone(zone) {
        const text = zone.text || this.ticker.text || '🍔 Willkommen!';
        const speed = this.ticker.speed || 50;
        const color = this.ticker.color || '#FFD700';
        const bgColor = this.ticker.backgroundColor || '#1a1a2e';
        const fontSize = this.ticker.fontSize || 24;
        const duration = Math.max(10, text.length / speed * 20);

        return `
            <div class="ticker-wrapper" style="background: ${bgColor};">
                <div class="ticker-content" style="color: ${color}; font-size: ${fontSize}px; animation-duration: ${duration}s;">
                    ${text} &nbsp;&nbsp;&nbsp; ${text} &nbsp;&nbsp;&nbsp; ${text} &nbsp;&nbsp;&nbsp; ${text}
                </div>
            </div>
        `;
    }

    renderTextZone(zone) {
        const text = zone.text || '';
        const size = zone.textSize || 24;
        const color = zone.textColor || '#ffffff';
        const align = zone.textAlign || 'left';

        return `
            <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:${align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start'};padding:16px;">
                <span style="color:${color};font-size:${size}px;font-weight:600;text-align:${align};line-height:1.4;">${text}</span>
            </div>
        `;
    }

    renderClockZone(zone) {
        return `
            <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:8px;" id="clockZone_${zone.id}">
                <div class="clock-time" style="font-size:clamp(32px,4vw,64px);font-weight:800;color:var(--text-accent);font-variant-numeric:tabular-nums;">00:00</div>
                <div class="clock-date" style="font-size:clamp(14px,1.5vw,24px);color:var(--text-secondary);">--.--.----</div>
            </div>
        `;
    }

    applyTickerSpeed() {
        document.querySelectorAll('.ticker-content').forEach(ticker => {
            const text = ticker.textContent;
            const speed = this.ticker.speed || 50;
            const duration = Math.max(10, text.length / speed * 20);
            ticker.style.animationDuration = `${duration}s`;
        });
    }

    startClocks() {
        const updateClocks = () => {
            document.querySelectorAll('[id^="clockZone_"]').forEach(el => {
                const now = new Date();
                const timeEl = el.querySelector('.clock-time');
                const dateEl = el.querySelector('.clock-date');
                if (timeEl) timeEl.textContent = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
                if (dateEl) dateEl.textContent = now.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
            });
        };
        updateClocks();
        setInterval(updateClocks, 1000);
    }

    // ==================== AUTO REFRESH ====================
    startAutoRefresh() {
        const interval = (this.settings.refreshInterval || 30) * 1000;

        this.refreshInterval = setInterval(async () => {
            try {
                const res = await fetch('/data');
                const newData = await res.json();

                if (newData.lastModified !== this.lastModified) {
                    this.data = newData;
                    this.products = newData.products || [];

                    // v7.40: Use display-specific zones if in display mode
                    if (this.displayConfig) {
                        const display = (newData.displays || []).find(d => d.id === this.displayConfig.id);
                        if (display) {
                            this.zones = display.zones?.length > 0 ? display.zones : newData.zones || [];
                            this.displayConfig = display;
                        } else {
                            this.zones = newData.zones || [];
                        }
                    } else {
                        this.zones = newData.zones || [];
                    }

                    this.settings = newData.settings || {};
                    this.ticker = newData.ticker || {};
                    this.lastModified = newData.lastModified;
                    this.applyTheme();
                    this.applyFont();
                    this.render();
                }
            } catch (e) {
                console.error('Refresh error:', e);
            }
        }, interval);

        // v7.40: Send heartbeat if in display mode
        if (this.displayConfig) {
            setInterval(async () => {
                try {
                    await fetch(`/displays/${this.displayConfig.id}/heartbeat`, { method: 'POST' });
                } catch (e) {
                    // Silent fail for heartbeat
                }
            }, 30000);
        }

        this.startClocks();
    }

    setupKeyboard() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'F11') { e.preventDefault(); this.toggleFullscreen(); }
            if (e.key === 'F5') { e.preventDefault(); this.loadData().then(() => this.render()); }
            if (e.key === 'Escape' && document.fullscreenElement) { document.exitFullscreen(); }
        });
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
        } else {
            document.exitFullscreen();
        }
    }

    hideLoading() {
        const loading = document.getElementById('loadingScreen');
        if (loading) {
            loading.classList.add('hidden');
            setTimeout(() => loading.remove(), 500);
        }
    }
}

const display = new MenuboardDisplay();
