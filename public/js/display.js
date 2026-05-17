/**
 * DIGITAL MENUBOARD v8.0 — DISPLAY JS
 * Features: Remote Control, Heartbeat, Custom Theme, Instagram Feed,
 *           Playlists, Schedules, Weather, QR, Animations, Multilingual
 */
'use strict';

class MenuboardDisplay {
    constructor() {
        this.data = null;
        this.products = [];
        this.zones = [];
        this.settings = {};
        this.ticker = {};
        this.layout = {};
        this.displayConfig = null;
        this.lastModified = null;
        this.fontLink = null;
        this.currentLanguage = 'de';
        this.translations = {};
        this.weather = null;
        this.currentSchedule = null;
        this.currentPlaylistIndex = 0;
        this.playlistTimer = null;
        this.commandPollInterval = null;
        this.isBlackout = false;
        this.init();
    }

    async init() {
        await this.loadData();
        await this.loadSchedule();
        await this.loadWeather();
        await this.loadTranslations();
        this.applyTheme();
        this.applyFont();
        this.render();
        this.hideLoading();
        this.startAutoRefresh();
        this.startCommandPolling();
        this.startClocks();
        this.setupKeyboard();
    }

    // ═══ DATA LOADING ═══
    async loadData() {
        try {
            const res = await fetch('/data');
            const fullData = await res.json();
            const slug = window.DISPLAY_SLUG;

            if (slug) {
                const display = (fullData.displays || []).find(d => d.slug === slug);
                if (display) {
                    this.displayConfig = display;
                    this.zones = display.zones?.length > 0 ? display.zones : fullData.zones || [];
                    this.settings = { ...fullData.settings, ...display.settings };
                } else {
                    this.zones = fullData.zones || [];
                    this.settings = fullData.settings || {};
                }
            } else {
                this.zones = fullData.zones || [];
                this.settings = fullData.settings || {};
            }

            this.data = fullData;
            this.products = fullData.products || [];
            this.ticker = fullData.ticker || {};
            this.layout = fullData.layout || { width: 1920, height: 1080 };
            this.lastModified = fullData.lastModified;
        } catch (e) {
            console.error('Ladefehler:', e);
        }
    }

    // ═══ THEME ═══
    applyTheme() {
        const theme = this.settings.theme || 'dark';
        const root = document.documentElement;
        document.body.className = `theme-${theme}`;

        const themes = {
            dark:   { bgPrimary:'#0a0a0f', bgCard:'#141420', border:'#2a2a3a', textPrimary:'#ffffff', textSecondary:'#b0b0c8', textMuted:'#6a6a8a', accent:'#6c63ff', gold:'#FFD700' },
            light:  { bgPrimary:'#f0f2f5', bgCard:'#ffffff', border:'#e0e0e0', textPrimary:'#1a1a2e', textSecondary:'#4a4a6a', textMuted:'#8a8aaa', accent:'#6366f1', gold:'#b8860b' },
            burger: { bgPrimary:'#1a0a00', bgCard:'#2a1500', border:'#4a3000', textPrimary:'#ffffff', textSecondary:'#e0c8a0', textMuted:'#a08060', accent:'#ff6b00', gold:'#ffaa00' },
            coffee: { bgPrimary:'#1a1200', bgCard:'#2a1f0a', border:'#4a3a20', textPrimary:'#ffffff', textSecondary:'#d4c4a8', textMuted:'#a09070', accent:'#8b6914', gold:'#c4a35a' }
        };

        if (theme === 'custom' && this.settings.customTheme) {
            const c = this.settings.customTheme;
            root.style.setProperty('--bg-primary', c.bgPrimary || '#0a0a0f');
            root.style.setProperty('--bg-card', c.bgCard || '#141420');
            root.style.setProperty('--border-color', c.borderColor || '#2a2a3a');
            root.style.setProperty('--text-primary', c.textPrimary || '#ffffff');
            root.style.setProperty('--text-secondary', c.textSecondary || '#b0b0c8');
            root.style.setProperty('--accent-primary', c.accentPrimary || '#6c63ff');
            root.style.setProperty('--accent-gold', c.priceColor || '#FFD700');
        } else {
            const t = themes[theme] || themes.dark;
            root.style.setProperty('--bg-primary', t.bgPrimary);
            root.style.setProperty('--bg-card', t.bgCard);
            root.style.setProperty('--border-color', t.border);
            root.style.setProperty('--text-primary', t.textPrimary);
            root.style.setProperty('--text-secondary', t.textSecondary);
            root.style.setProperty('--text-muted', t.textMuted);
            root.style.setProperty('--accent-primary', t.accent);
            root.style.setProperty('--accent-gold', t.gold);
        }
    }

    applyFont() {
        const font = this.settings.font || 'Inter';
        const googleFonts = ['Inter','DM Sans','Roboto','Poppins','Oswald','Playfair Display','Montserrat','Raleway','Lato','Nunito'];
        document.body.style.fontFamily = `'${font}', system-ui, sans-serif`;
        if (googleFonts.includes(font)) {
            const url = `https://fonts.googleapis.com/css2?family=${font.replace(/ /g,'+')}:wght@300;400;500;600;700;800&display=swap`;
            if (this.fontLink) { this.fontLink.href = url; }
            else { this.fontLink = document.createElement('link'); this.fontLink.rel = 'stylesheet'; this.fontLink.href = url; document.head.appendChild(this.fontLink); }
        }
    }

    // ═══ SCHEDULE ═══
    async loadSchedule() {
        try {
            const res = await fetch('/schedule');
            const data = await res.json();
            if (data.activeSchedule) {
                this.currentSchedule = data.activeSchedule;
                if (this.currentSchedule.theme) this.settings.theme = this.currentSchedule.theme;
                if (this.currentSchedule.tickerText) this.ticker.text = this.currentSchedule.tickerText;
            }
        } catch (e) {}
    }

    // ═══ WEATHER ═══
    async loadWeather() {
        try {
            const w = this.settings.weather || this.data?.weather || {};
            if (w.enabled === false) return;
            const lat = w.latitude || '52.52';
            const lon = w.longitude || '13.41';
            const res = await fetch(`/weather?lat=${lat}&lon=${lon}`);
            if (res.ok) this.weather = await res.json();
        } catch (e) {}
    }

    // ═══ TRANSLATIONS ═══
    async loadTranslations() {
        this.translations = {
            de: { soldOut:'AUSVERKAUFT', lowStock:'WENIG VERFÜGBAR', scanOrder:'Scan für Bestellung', new:'Neu', bestseller:'Bestseller', offer:'Angebot', limited:'Limitiert' },
            en: { soldOut:'SOLD OUT', lowStock:'LOW STOCK', scanOrder:'Scan to Order', new:'New', bestseller:'Bestseller', offer:'Offer', limited:'Limited' },
            ar: { soldOut:'نفذت الكمية', lowStock:'كمية محدودة', scanOrder:'امسح للطلب', new:'جديد', bestseller:'الأكثر مبيعاً', offer:'عرض', limited:'محدود' },
            tr: { soldOut:'TÜKENDİ', lowStock:'AZ KALDI', scanOrder:'Sipariş için tara', new:'Yeni', bestseller:'Çok Satan', offer:'Teklif', limited:'Sınırlı' }
        };
        const lang = this.settings?.languages?.default || 'de';
        this.currentLanguage = lang;
    }

    t(key) { return (this.translations[this.currentLanguage] || this.translations.de)[key] || key; }

    // ═══ RENDER ═══
    render() {
        if (this.isBlackout) return;
        const container = document.getElementById('displayContainer');
        if (!container) return;
        container.innerHTML = '';
        container.style.position = 'relative';
        container.style.width = '100vw';
        container.style.height = '100vh';
        container.style.overflow = 'hidden';
        container.style.background = 'var(--bg-primary)';

        const anims = this.settings?.animations || {};
        const fadeIn = anims.enabled !== false && anims.productFadeIn !== false;

        this.zones.forEach((zone, i) => {
            if (zone.visible === false) return;
            const el = document.createElement('div');
            el.className = `display-zone zone-${zone.type}`;
            el.dataset.zoneId = zone.id;
            el.style.cssText = `position:absolute;left:${zone.x}%;top:${zone.y}%;width:${zone.w}%;height:${zone.h}%;box-sizing:border-box;overflow:hidden;`;
            if (fadeIn) { el.style.opacity = '0'; el.style.transform = 'translateY(10px)'; el.style.transition = `opacity .4s ease ${i * .08}s, transform .4s ease ${i * .08}s`; }

            switch (zone.type) {
                case 'menu':     el.innerHTML = this.renderMenuZone(zone); break;
                case 'media':    el.innerHTML = this.renderMediaZone(zone); break;
                case 'ticker':   el.innerHTML = this.renderTickerZone(zone); break;
                case 'text':     el.innerHTML = this.renderTextZone(zone); break;
                case 'clock':    el.innerHTML = this.renderClockZone(zone); break;
                case 'social':   el.innerHTML = this.renderSocialZone(zone); break;
                case 'weather':  el.innerHTML = this.renderWeatherZone(zone); break;
            }

            container.appendChild(el);
            if (fadeIn) requestAnimationFrame(() => { el.style.opacity = '1'; el.style.transform = 'none'; });
        });

        this.applyTickerSpeed();
        this.trackAnalytics();
    }

    // ═══ MENU ZONE ═══
    renderMenuZone(zone) {
        const zoneProducts = (zone.productIds || [])
            .map(id => this.products.find(p => p.id === id))
            .filter(Boolean);

        if (!zoneProducts.length) return `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-muted);flex-direction:column;gap:8px;"><i class="fas fa-utensils" style="font-size:28px;"></i><p>Keine Produkte</p></div>`;

        const currency = this.settings.currency || '€';
        const cpos = this.settings.currencyPosition || 'after';
        const fmtPrice = p => cpos === 'before' ? `${currency} ${p}` : `${p} ${currency}`;

        const s = zone.articleStyle || {};
        const showImage = s.showImage !== false;
        const showTitle = s.showTitle !== false;
        const showPrice = s.showPrice !== false;
        const showDesc = s.showDescription || false;
        const showBadge = s.showBadge !== false;
        const showStock = s.showStock !== false;
        const pricePos = s.pricePosition || 'bottom-right';
        const priceStyle = s.priceStyle || 'badge-gold';
        const imgSize = s.imageSize || 'large';
        const layout = s.cardLayout || 'vertical';
        const align = s.textAlign || 'left';
        const colCount = s.columnsCount || 'auto';
        const cols = colCount === 'auto'
            ? (zoneProducts.length <= 2 ? 2 : zoneProducts.length <= 6 ? 3 : 4)
            : parseInt(colCount);

        const priceClass = { 'badge-gold':'price-badge-gold', 'badge-dark':'price-badge-dark', 'text-plain':'price-plain', 'text-bold':'price-bold' }[priceStyle] || 'price-badge-gold';

        const cards = zoneProducts.map((p, i) => {
            const isSoldOut = p.stockStatus === 'soldout';
            const isLow = p.stockStatus === 'low';
            const stockOverlay = showStock && isSoldOut ? `<div class="stock-overlay soldout">${this.t('soldOut')}</div>` : showStock && isLow ? `<div class="stock-overlay low">${this.t('lowStock')}</div>` : '';
            const opacity = isSoldOut ? 'opacity:.5;' : '';
            const imgH = { large:'55%', medium:'45%', small:'35%' }[imgSize] || '50%';
            const imgHtml = showImage ? (p.image
                ? `<div class="product-img-wrap" style="height:${imgH}"><img src="${p.image}" alt="${p.title}" onerror="this.parentNode.innerHTML='<div class=pimg-placeholder><i class=fas fa-utensils></i></div>'">${stockOverlay}</div>`
                : `<div class="product-img-wrap" style="height:${imgH}"><div class="pimg-placeholder"><i class="fas fa-utensils"></i></div></div>`) : '';
            const badgeHtml = showBadge && p.badge && !isSoldOut ? `<span class="pbadge pbadge-${p.badge.toLowerCase()}">${p.badge}</span>` : '';
            const priceHtml = showPrice && !isSoldOut ? `<span class="${priceClass} ppos-${pricePos.replace('-','_')}">${fmtPrice(p.price)}</span>` : '';
            const titleHtml = showTitle ? `<div class="ptitle" style="text-align:${align};${opacity}">${p.title}</div>` : '';
            const descHtml = showDesc && p.description ? `<div class="pdesc" style="text-align:${align};${opacity}">${p.description}</div>` : '';

            if (layout === 'compact') {
                return `<div class="pcard pcard-compact"><div class="pinfo" style="text-align:${align}">${titleHtml}${priceHtml}</div></div>`;
            }
            if (layout === 'horizontal') {
                return `<div class="pcard pcard-horizontal">${imgHtml}<div class="pinfo" style="text-align:${align}">${badgeHtml}${titleHtml}${descHtml}${priceHtml}</div></div>`;
            }
            return `<div class="pcard"><div class="pimg-area">${imgHtml}${badgeHtml}${pricePos !== 'inline' ? priceHtml : ''}</div><div class="pinfo" style="text-align:${align}">${titleHtml}${descHtml}${pricePos === 'inline' ? priceHtml : ''}</div></div>`;
        }).join('');

        return `<div class="menu-zone-wrap"><div class="menu-zone-grid" style="grid-template-columns:repeat(${cols},1fr)">${cards}</div></div>`;
    }

    // ═══ MEDIA ZONE ═══
    renderMediaZone(zone) {
        const { mediaSrc: src = '', mediaType: type = 'image' } = zone;
        if (!src) return `<div class="zone-placeholder"><i class="fas fa-image"></i><span>Kein Medium</span></div>`;
        if (type === 'video') return `<video src="${src}" autoplay muted loop playsinline style="width:100%;height:100%;object-fit:cover;"></video>`;
        return `<img src="${src}" alt="Media" style="width:100%;height:100%;object-fit:cover;">`;
    }

    // ═══ TICKER ZONE ═══
    renderTickerZone(zone) {
        const text = zone.tickerText || zone.text || this.ticker.text || '🍔 Willkommen!';
        const color = this.ticker.color || '#FFD700';
        const bg = this.ticker.backgroundColor || '#1a1a2e';
        const fontSize = this.ticker.fontSize || 24;
        const repeat = text + ' ⬥ ' + text + ' ⬥ ' + text + ' ⬥ ' + text;
        return `<div class="ticker-wrap" style="background:${bg};height:100%;display:flex;align-items:center;overflow:hidden;">
            <div class="ticker-track" style="color:${color};font-size:${fontSize}px;white-space:nowrap;display:inline-block;will-change:transform;">
                ${repeat}
            </div>
        </div>`;
    }

    applyTickerSpeed() {
        document.querySelectorAll('.ticker-track').forEach(el => {
            const speed = this.ticker.speed || 50;
            const len = el.textContent.length;
            const dur = Math.max(8, len / speed * 15);
            el.style.animation = `none`;
            el.offsetHeight; // reflow
            el.style.animation = `ticker-scroll ${dur}s linear infinite`;
        });
    }

    // ═══ TEXT ZONE ═══
    renderTextZone(zone) {
        const { text = '', fontSize: size = 24, color = '#fff', textAlign: align = 'center' } = zone;
        const justify = align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start';
        return `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:${justify};padding:16px;">
            <span style="color:${color};font-size:${size}px;font-weight:600;text-align:${align};line-height:1.4;">${text}</span>
        </div>`;
    }

    // ═══ CLOCK ZONE ═══
    renderClockZone(zone) {
        return `<div class="clock-zone" id="clock_${zone.id}">
            <div class="clock-time">00:00</div>
            <div class="clock-date">--.--.----</div>
        </div>`;
    }

    startClocks() {
        const tick = () => {
            const now = new Date();
            document.querySelectorAll('[id^="clock_"]').forEach(el => {
                const t = el.querySelector('.clock-time');
                const d = el.querySelector('.clock-date');
                if (t) t.textContent = now.toLocaleTimeString('de-DE', { hour:'2-digit', minute:'2-digit' });
                if (d) d.textContent = now.toLocaleDateString('de-DE', { day:'2-digit', month:'2-digit', year:'numeric' });
            });
        };
        tick();
        setInterval(tick, 1000);
    }

    // ═══ WEATHER ZONE ═══
    renderWeatherZone(zone) {
        if (!this.weather) return `<div class="zone-placeholder"><i class="fas fa-cloud"></i><span>Wetter lädt…</span></div>`;
        const w = this.weather;
        const showRec = this.settings?.weather?.showRecommendations !== false;
        return `<div class="weather-zone">
            <div class="weather-main">
                <span class="weather-icon">${w.icon || '🌡️'}</span>
                <span class="weather-temp">${w.temperature}°C</span>
                <span class="weather-wind">💨 ${w.windspeed} km/h</span>
            </div>
            ${showRec && w.recommendation ? `<div class="weather-rec">${w.recommendation}</div>` : ''}
        </div>`;
    }

    // ═══ SOCIAL MEDIA ZONE (Instagram-Feed) ═══
    renderSocialZone(zone) {
        const config = zone.socialConfig || {};
        const type = config.type || 'instagram';
        const handle = config.handle || '';
        const postsCount = config.postsCount || 4;
        const hashtag = config.hashtag || '';
        const embedToken = config.embedToken || '';

        // Instagram oEmbed / Public embed approach
        // Uses Instagram's official embed or a hashtag grid via RSS bridge
        if (type === 'instagram') {
            if (embedToken && handle) {
                // Real Instagram Basic Display API embed
                return this.renderInstagramFeed(handle, postsCount, embedToken, zone);
            }
            // Fallback: branded placeholder with handle
            return this.renderInstagramPlaceholder(handle, hashtag, postsCount, zone);
        }

        return `<div class="zone-placeholder"><i class="fab fa-instagram"></i><span>Social Feed konfigurieren</span></div>`;
    }

    renderInstagramFeed(handle, count, token, zone) {
        const zoneId = `ig_${zone.id}`;
        // Fetch via proxy after render
        setTimeout(() => this.fetchInstagramPosts(handle, count, token, zoneId), 100);
        return `<div class="social-zone" id="${zoneId}">
            <div class="social-header">
                <i class="fab fa-instagram"></i>
                <span>@${handle}</span>
            </div>
            <div class="social-grid social-grid-${Math.min(count, 4)}" id="${zoneId}_grid">
                ${Array.from({length: count}, (_,i) => `<div class="social-card loading" style="animation-delay:${i*.1}s"><div class="social-shimmer"></div></div>`).join('')}
            </div>
        </div>`;
    }

    async fetchInstagramPosts(handle, count, token, containerId) {
        try {
            // Instagram Basic Display API — requires user access token
            const res = await fetch(`https://graph.instagram.com/me/media?fields=id,media_type,media_url,thumbnail_url,caption,timestamp&limit=${count}&access_token=${token}`);
            const data = await res.json();
            if (data.error) throw new Error(data.error.message);
            const grid = document.getElementById(containerId + '_grid');
            if (!grid) return;
            grid.innerHTML = (data.data || []).slice(0, count).map(post => {
                const src = post.media_type === 'VIDEO' ? post.thumbnail_url : post.media_url;
                const caption = (post.caption || '').substring(0, 80) + (post.caption?.length > 80 ? '…' : '');
                return `<div class="social-card">
                    <div class="social-card-img"><img src="${src}" alt="${caption}" loading="lazy"></div>
                    ${caption ? `<div class="social-card-caption">${caption}</div>` : ''}
                </div>`;
            }).join('');
        } catch (e) {
            // Fallback to placeholder on error
            const grid = document.getElementById(containerId + '_grid');
            if (grid) grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;color:var(--text-muted);padding:20px;font-size:13px;"><i class="fab fa-instagram" style="font-size:28px;margin-bottom:8px;display:block;"></i>@${handle}<br><small>${e.message}</small></div>`;
        }
    }

    renderInstagramPlaceholder(handle, hashtag, count, zone) {
        // Demo placeholder with brand styling — shown when no token configured
        const mockPosts = [
            { emoji: '🍔', caption: 'Classic Burger – Unser Bestseller!' },
            { emoji: '🍟', caption: 'Crispy Fries – Frisch aus der Fritteuse' },
            { emoji: '🥤', caption: 'Summer Drinks sind da!' },
            { emoji: '🍰', caption: 'Desserts des Monats' },
            { emoji: '🎉', caption: 'Wochenend-Special läuft!' },
            { emoji: '🌮', caption: 'Neue Gerichte auf der Karte' },
        ].slice(0, count);

        return `<div class="social-zone social-zone--demo">
            <div class="social-header">
                <i class="fab fa-instagram"></i>
                <span>${handle ? '@' + handle : (hashtag ? '#' + hashtag : 'Instagram Feed')}</span>
                <span class="social-demo-badge">Demo</span>
            </div>
            <div class="social-grid social-grid-${Math.min(count, 4)}">
                ${mockPosts.map(p => `<div class="social-card">
                    <div class="social-card-img social-card-demo">${p.emoji}</div>
                    <div class="social-card-caption">${p.caption}</div>
                </div>`).join('')}
            </div>
            <div class="social-footer">
                <small>Instagram-Token in Admin → Features konfigurieren</small>
            </div>
        </div>`;
    }

    // ═══ REMOTE CONTROL ═══
    startCommandPolling() {
        if (!this.displayConfig) return;
        const poll = async () => {
            try {
                const res = await fetch(`/displays/${this.displayConfig.id}/commands`);
                const data = await res.json();
                if (data.success && data.commands?.length) {
                    data.commands.forEach(cmd => this.executeCommand(cmd));
                }
            } catch (e) {}
        };
        poll();
        this.commandPollInterval = setInterval(poll, 5000);
    }

    executeCommand(cmd) {
        console.log('Remote command:', cmd.command);
        switch (cmd.command) {
            case 'reload':
                window.location.reload();
                break;
            case 'blackout':
                this.setBlackout(true);
                break;
            case 'wake':
                this.setBlackout(false);
                break;
            case 'next_template':
                this.nextTemplate();
                break;
            case 'refresh_data':
                this.loadData().then(() => { this.applyTheme(); this.applyFont(); this.render(); });
                break;
            case 'set_template':
                if (cmd.templateId) this.applyRemoteTemplate(cmd.templateId);
                break;
            case 'set_theme':
                if (cmd.theme) { this.settings.theme = cmd.theme; this.applyTheme(); }
                break;
            case 'show_message':
                if (cmd.message) this.showOverlayMessage(cmd.message, cmd.duration || 5000);
                break;
        }
    }

    setBlackout(on) {
        this.isBlackout = on;
        const container = document.getElementById('displayContainer');
        if (!container) return;
        if (on) {
            container.innerHTML = '<div style="width:100%;height:100%;background:#000;display:flex;align-items:center;justify-content:center;"><span style="color:#333;font-size:48px;">●</span></div>';
        } else {
            this.render();
        }
    }

    async nextTemplate() {
        if (!this.data?.templates?.length) return;
        const current = this.displayConfig?.templateId || this.data.templates[0].id;
        const idx = this.data.templates.findIndex(t => t.id === current);
        const next = this.data.templates[(idx + 1) % this.data.templates.length];
        this.zones = JSON.parse(JSON.stringify(next.zones || []));
        this.render();
    }

    async applyRemoteTemplate(templateId) {
        const tpl = this.data?.templates?.find(t => t.id === templateId);
        if (!tpl) return;
        this.zones = JSON.parse(JSON.stringify(tpl.zones || []));
        this.render();
    }

    showOverlayMessage(message, duration = 5000) {
        const existing = document.getElementById('overlay-message');
        if (existing) existing.remove();
        const el = document.createElement('div');
        el.id = 'overlay-message';
        el.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,.85);color:#fff;padding:32px 48px;border-radius:16px;font-size:clamp(20px,3vw,48px);font-weight:700;z-index:9999;text-align:center;border:2px solid rgba(255,255,255,.2);backdrop-filter:blur(8px);';
        el.textContent = message;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), duration);
    }

    // ═══ ANALYTICS ═══
    async trackAnalytics() {
        try {
            const displayId = this.displayConfig?.id;
            // Track visible products
            this.zones.filter(z => z.type === 'menu').forEach(zone => {
                (zone.productIds || []).forEach(id => {
                    fetch('/analytics/track', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ type:'product_view', id, displayId }) }).catch(() => {});
                });
            });
            // Track display view
            if (displayId) {
                fetch('/analytics/track', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ type:'display_view', displayId }) }).catch(() => {});
            }
        } catch (e) {}
    }

    // ═══ AUTO REFRESH ═══
    startAutoRefresh() {
        const interval = (this.settings.refreshInterval || 30) * 1000;
        setInterval(async () => {
            try {
                const res = await fetch('/data');
                const newData = await res.json();
                if (newData.lastModified !== this.lastModified) {
                    this.data = newData;
                    this.products = newData.products || [];
                    const slug = window.DISPLAY_SLUG;
                    if (slug) {
                        const disp = (newData.displays || []).find(d => d.slug === slug);
                        if (disp) { this.displayConfig = disp; this.zones = disp.zones?.length > 0 ? disp.zones : newData.zones || []; this.settings = { ...newData.settings, ...disp.settings }; }
                        else { this.zones = newData.zones || []; this.settings = newData.settings || {}; }
                    } else { this.zones = newData.zones || []; this.settings = newData.settings || {}; }
                    this.ticker = newData.ticker || {};
                    this.lastModified = newData.lastModified;
                    this.applyTheme(); this.applyFont(); this.render();
                }
            } catch (e) {}
        }, interval);

        // Heartbeat
        if (this.displayConfig) {
            setInterval(() => {
                fetch(`/displays/${this.displayConfig.id}/heartbeat`, { method:'POST' }).catch(() => {});
            }, 30000);
        }

        // Schedule check every 60s
        setInterval(() => this.loadSchedule(), 60000);

        // Weather refresh every 5min
        setInterval(() => this.loadWeather(), 5 * 60 * 1000);
    }

    // ═══ KEYBOARD ═══
    setupKeyboard() {
        document.addEventListener('keydown', e => {
            if (e.key === 'F11') { e.preventDefault(); this.toggleFullscreen(); }
            if (e.key === 'F5') { e.preventDefault(); this.loadData().then(() => { this.applyTheme(); this.applyFont(); this.render(); }); }
            if (e.key === 'Escape' && document.fullscreenElement) document.exitFullscreen();
            if (e.key === 'b' || e.key === 'B') this.setBlackout(!this.isBlackout);
        });
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
        else document.exitFullscreen();
    }

    hideLoading() {
        const el = document.getElementById('loadingScreen');
        if (el) { el.style.opacity = '0'; el.style.transition = 'opacity .4s'; setTimeout(() => el.remove(), 400); }
    }
}

// Global instance
window.menuboard = new MenuboardDisplay();
