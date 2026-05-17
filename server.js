/**
 * DIGITAL MENUBOARD v8.0
 * Features: Analytics, Playlists, Remote Control, Themes, Currency, Fonts
 */
const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/admin', express.static(path.join(__dirname, 'admin')));

const DATA_FILE = path.join(__dirname, 'data.json');
const ANALYTICS_FILE = path.join(__dirname, 'analytics.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + Math.round(Math.random()*1E9) + path.extname(file.originalname))
});
const upload = multer({ storage, limits: { fileSize: 50*1024*1024 }, fileFilter: (req, file, cb) => {
    const ok = /jpeg|jpg|png|gif|mp4|webm|mov/.test(path.extname(file.originalname).toLowerCase());
    ok ? cb(null, true) : cb(new Error('Dateityp nicht erlaubt'));
}});

function loadData() {
    try { if (fs.existsSync(DATA_FILE)) return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch(e) {}
    return getDefaultData();
}
function saveData(data) {
    try { data.lastModified = new Date().toISOString(); fs.writeFileSync(DATA_FILE, JSON.stringify(data,null,2),'utf8'); return true; } catch(e) { return false; }
}
function loadAnalytics() {
    try { if (fs.existsSync(ANALYTICS_FILE)) return JSON.parse(fs.readFileSync(ANALYTICS_FILE,'utf8')); } catch(e) {}
    return { productViews:{}, displayViews:{}, hourlyStats:{}, dailyStats:{}, events:[] };
}
function saveAnalytics(d) { try { fs.writeFileSync(ANALYTICS_FILE,JSON.stringify(d,null,2),'utf8'); return true; } catch(e) { return false; } }

function getDefaultSchedules() {
    return [
        { id:'schedule-breakfast', name:'Frühstück', description:'Frühstücksmenü', startTime:'06:00', endTime:'11:00', days:[0,1,2,3,4,5,6], templateId:'split', tickerText:'☀️ Guten Morgen!', theme:'light', badge:'Frühstück', active:true },
        { id:'schedule-lunch', name:'Mittagessen', description:'Mittagsangebot Mo-Fr', startTime:'11:00', endTime:'14:00', days:[1,2,3,4,5], templateId:'split', tickerText:'🍽️ Mittagsmenü!', theme:'dark', badge:'Mittag', active:true },
        { id:'schedule-dinner', name:'Abendessen', description:'Abendmenü', startTime:'14:00', endTime:'22:00', days:[0,1,2,3,4,5,6], templateId:'split', tickerText:'🌙 Abendspecials!', theme:'dark', badge:'Abend', active:true },
        { id:'schedule-burger-day', name:'Burger Day', description:'Montag: Burger Day', startTime:'11:00', endTime:'22:00', days:[1], templateId:'fullscreen-menu', tickerText:'🍔 MONTAG = BURGER DAY!', theme:'burger', badge:'Burger Day', active:true },
        { id:'schedule-weekend', name:'Wochenend-Special', description:'Wochenende Angebote', startTime:'10:00', endTime:'22:00', days:[0,6], templateId:'promo-focus', tickerText:'🎉 WOCHENEND-SPECIAL!', theme:'dark', badge:'Weekend', active:true }
    ];
}

function getDefaultData() {
    const products = [
        {id:1,title:'Classic Burger',price:'8.90',image:'/public/assets/1.png',category:'burger',badge:'Bestseller',stockStatus:'available',description:'Saftiges Rindfleisch'},
        {id:2,title:'Cheese Deluxe',price:'9.90',image:'/public/assets/2.png',category:'burger',badge:'',stockStatus:'available',description:'Doppelter Cheddar'},
        {id:3,title:'BBQ Bacon',price:'10.90',image:'/public/assets/3.png',category:'burger',badge:'Neu',stockStatus:'available',description:'Rauchiger BBQ'},
        {id:4,title:'Veggie Supreme',price:'8.50',image:'/public/assets/4.png',category:'burger',badge:'',stockStatus:'available',description:'100% pflanzlich'},
        {id:5,title:'Chicken Wings',price:'7.90',image:'/public/assets/5.png',category:'sides',badge:'',stockStatus:'available',description:'8 Stück mit Dip'},
        {id:6,title:'Crispy Fries',price:'3.90',image:'/public/assets/6.png',category:'sides',badge:'',stockStatus:'available',description:'Knusprige Pommes'},
        {id:7,title:'Onion Rings',price:'4.50',image:'/public/assets/7.png',category:'sides',badge:'',stockStatus:'available',description:'Goldbraun frittiert'},
        {id:8,title:'Mozzarella Sticks',price:'5.90',image:'/public/assets/8.png',category:'sides',badge:'',stockStatus:'available',description:'6 Stück'},
        {id:9,title:'Coca Cola',price:'2.90',image:'/public/assets/9.png',category:'drinks',badge:'',stockStatus:'available',description:'0,4L'},
        {id:10,title:'Sprite',price:'2.90',image:'/public/assets/10.png',category:'drinks',badge:'',stockStatus:'available',description:'0,4L'},
        {id:11,title:'Fanta',price:'2.90',image:'/public/assets/11.png',category:'drinks',badge:'',stockStatus:'available',description:'0,4L'},
        {id:12,title:'Iced Coffee',price:'3.50',image:'/public/assets/12.png',category:'drinks',badge:'',stockStatus:'available',description:'Kalt gebrüht'},
        {id:13,title:'Vanilla Shake',price:'4.90',image:'/public/assets/13.png',category:'dessert',badge:'',stockStatus:'available',description:'Cremig'},
        {id:14,title:'Chocolate Shake',price:'4.90',image:'/public/assets/14.png',category:'dessert',badge:'',stockStatus:'available',description:'Schokolade pur'},
        {id:15,title:'Sundae',price:'3.90',image:'/public/assets/15.png',category:'dessert',badge:'',stockStatus:'available',description:'Mit Soße nach Wahl'},
        {id:16,title:'Apple Pie',price:'3.50',image:'/public/assets/16.png',category:'dessert',badge:'',stockStatus:'available',description:'Warmer Apfelkuchen'}
    ];
    const defaultZones = [
        {id:'zone-menu',name:'Menü Zone',type:'menu',x:2,y:2,w:60,h:80,visible:true,productIds:[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16],articleStyle:{showImage:true,showTitle:true,showPrice:true,showDescription:false,showBadge:true,showStock:true,pricePosition:'bottom-right',priceStyle:'badge-gold',imageSize:'large',cardLayout:'vertical',textAlign:'left',columnsCount:'auto'}},
        {id:'zone-media',name:'Media Zone',type:'media',x:64,y:2,w:34,h:40,visible:true,mediaSrc:'',mediaType:'image'},
        {id:'zone-ticker',name:'Ticker Zone',type:'ticker',x:64,y:44,w:34,h:8,visible:true,text:'🍔 TAGESANGEBOT! | 🥤 Getränke 2-für-1 ab 14 Uhr!'},
        {id:'zone-info',name:'Info Zone',type:'media',x:64,y:54,w:34,h:28,visible:true,mediaSrc:'',mediaType:'image'}
    ];
    return {
        version:'8.0', lastModified:new Date().toISOString(),
        settings:{
            theme:'dark', currency:'€', currencyPosition:'after', language:'de', font:'Inter',
            refreshInterval:30, autoRotate:false, showBadges:true,
            customTheme:{bgPrimary:'#0a0a0f',bgSecondary:'#13131a',bgCard:'#1e1e2e',accentPrimary:'#6c63ff',accentSecondary:'#ff6584',textPrimary:'#ffffff',textSecondary:'#a0a0b8',priceColor:'#FFD700',borderColor:'#2a2a3e'}
        },
        products, zones:defaultZones,
        ticker:{enabled:true,speed:50,direction:'left',fontSize:24,color:'#FFD700',backgroundColor:'#1a1a2e'},
        layout:{width:1920,height:1080,orientation:'landscape',snapGrid:10,showGrid:true},
        templates:[
            {id:'split',name:'Split Screen',description:'Menü links, Media rechts',isDefault:true,zones:defaultZones},
            {id:'fullscreen-menu',name:'Full Screen Menü',description:'Nur Menü',isDefault:true,zones:[{id:'zone-menu',name:'Menü Zone',type:'menu',x:0,y:0,w:100,h:92,visible:true,productIds:[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16],articleStyle:{showImage:true,showTitle:true,showPrice:true,showDescription:false,showBadge:true,showStock:true,pricePosition:'bottom-right',priceStyle:'badge-gold',imageSize:'large',cardLayout:'vertical',textAlign:'left',columnsCount:'auto'}},{id:'zone-ticker',name:'Ticker',type:'ticker',x:0,y:92,w:100,h:8,visible:true,text:'🍔 Willkommen!'}]},
            {id:'menu-video',name:'Menü + Video',description:'Menü oben, Video unten',isDefault:true,zones:[{id:'zone-menu',name:'Menü',type:'menu',x:0,y:0,w:100,h:55,visible:true,productIds:[1,2,3,4,5,6,7,8],articleStyle:{showImage:true,showTitle:true,showPrice:true,showDescription:false,showBadge:true,showStock:true,pricePosition:'bottom-right',priceStyle:'badge-gold',imageSize:'large',cardLayout:'vertical',textAlign:'left',columnsCount:'auto'}},{id:'zone-media',name:'Video',type:'media',x:0,y:55,w:100,h:37,visible:true,mediaSrc:'',mediaType:'video'},{id:'zone-ticker',name:'Ticker',type:'ticker',x:0,y:92,w:100,h:8,visible:true,text:'🍔 Willkommen!'}]},
            {id:'triple',name:'Triple Column',description:'3 Spalten',isDefault:true,zones:[{id:'zone-menu-1',name:'Burger',type:'menu',x:0,y:0,w:33,h:92,visible:true,productIds:[1,2,3,4],articleStyle:{showImage:true,showTitle:true,showPrice:true,showDescription:false,showBadge:true,showStock:true,pricePosition:'bottom-right',priceStyle:'badge-gold',imageSize:'large',cardLayout:'vertical',textAlign:'left',columnsCount:'auto'}},{id:'zone-menu-2',name:'Sides',type:'menu',x:33,y:0,w:34,h:92,visible:true,productIds:[5,6,7,8],articleStyle:{showImage:true,showTitle:true,showPrice:true,showDescription:false,showBadge:true,showStock:true,pricePosition:'bottom-right',priceStyle:'badge-gold',imageSize:'large',cardLayout:'vertical',textAlign:'left',columnsCount:'auto'}},{id:'zone-menu-3',name:'Drinks',type:'menu',x:67,y:0,w:33,h:92,visible:true,productIds:[9,10,11,12],articleStyle:{showImage:true,showTitle:true,showPrice:true,showDescription:false,showBadge:true,showStock:true,pricePosition:'bottom-right',priceStyle:'badge-gold',imageSize:'large',cardLayout:'vertical',textAlign:'left',columnsCount:'auto'}},{id:'zone-ticker',name:'Ticker',type:'ticker',x:0,y:92,w:100,h:8,visible:true,text:'🍔 Willkommen!'}]},
            {id:'promo-focus',name:'Promo Fokus',description:'Große Promo + kleines Menü',isDefault:true,zones:[{id:'zone-promo',name:'Promo',type:'media',x:0,y:0,w:65,h:100,visible:true,mediaSrc:'',mediaType:'image'},{id:'zone-menu',name:'Menü',type:'menu',x:65,y:0,w:35,h:85,visible:true,productIds:[1,2,3,4,5],articleStyle:{showImage:true,showTitle:true,showPrice:true,showDescription:false,showBadge:true,showStock:true,pricePosition:'bottom-right',priceStyle:'badge-gold',imageSize:'medium',cardLayout:'vertical',textAlign:'left',columnsCount:'auto'}},{id:'zone-ticker',name:'Ticker',type:'ticker',x:65,y:85,w:35,h:15,visible:true,text:'🔥 TAGESANGEBOT!'}]}
        ],
        displays:[
            {id:'display-main',name:'Hauptdisplay',slug:'main',description:'Display an der Theke',templateId:'split',playlist:[],active:true,createdAt:new Date().toISOString(),lastSeen:new Date().toISOString()},
            {id:'display-outdoor',name:'Außendisplay',slug:'outdoor',description:'Display am Eingang',templateId:'promo-focus',playlist:[],active:true,createdAt:new Date().toISOString(),lastSeen:new Date().toISOString()},
            {id:'display-kitchen',name:'Küchendisplay',slug:'kitchen',description:'Display in der Küche',templateId:'fullscreen-menu',playlist:[],active:true,createdAt:new Date().toISOString(),lastSeen:new Date().toISOString()}
        ],
        playlists:[],
        schedules:getDefaultSchedules(),
        weather:{enabled:true,latitude:'52.52',longitude:'13.41',showOnDisplay:true,showRecommendations:true,updateInterval:300000},
        qrCodes:{enabled:true,baseUrl:'',showOnProducts:true,showOnDisplay:true},
        languages:{enabled:['de','en'],default:'de',showSelector:true},
        animations:{enabled:true,pageTransition:'slide',productFadeIn:true,offerPulse:true,transitionDuration:500},
        remoteControl:{enabled:true,commands:[]}
    };
}

if (!fs.existsSync(DATA_FILE)) { saveData(getDefaultData()); console.log('✅ data.json erstellt'); }

// ROUTES
app.get('/data', (req, res) => res.json(loadData()));
app.post('/save', (req, res) => { saveData(req.body) ? res.json({success:true}) : res.status(500).json({success:false}); });

// Products CRUD
app.get('/products', (req,res) => res.json(loadData().products));
app.post('/products', (req,res) => { const d=loadData(); const p={...req.body,id:Date.now()}; d.products.push(p); saveData(d) ? res.json({success:true,product:p}) : res.status(500).json({success:false}); });
app.put('/products/:id', (req,res) => { const d=loadData(); const id=parseInt(req.params.id); const i=d.products.findIndex(p=>p.id===id); if(i===-1) return res.status(404).json({success:false}); d.products[i]={...d.products[i],...req.body,id}; saveData(d) ? res.json({success:true,product:d.products[i]}) : res.status(500).json({success:false}); });
app.delete('/products/:id', (req,res) => { const d=loadData(); d.products=d.products.filter(p=>p.id!==parseInt(req.params.id)); saveData(d) ? res.json({success:true}) : res.status(500).json({success:false}); });

// Zones CRUD
app.get('/zones', (req,res) => res.json(loadData().zones));
app.post('/zones', (req,res) => { const d=loadData(); const z={...req.body,id:req.body.id||'zone-'+Date.now()}; d.zones.push(z); saveData(d) ? res.json({success:true,zone:z}) : res.status(500).json({success:false}); });
app.put('/zones/:id', (req,res) => { const d=loadData(); const i=d.zones.findIndex(z=>z.id===req.params.id); if(i===-1) return res.status(404).json({success:false}); d.zones[i]={...d.zones[i],...req.body,id:req.params.id}; saveData(d) ? res.json({success:true,zone:d.zones[i]}) : res.status(500).json({success:false}); });
app.delete('/zones/:id', (req,res) => { const d=loadData(); d.zones=d.zones.filter(z=>z.id!==req.params.id); saveData(d) ? res.json({success:true}) : res.status(500).json({success:false}); });

// Templates CRUD
app.get('/templates', (req,res) => res.json(loadData().templates||[]));
app.get('/templates/:id', (req,res) => { const t=(loadData().templates||[]).find(t=>t.id===req.params.id); t ? res.json(t) : res.status(404).json({success:false}); });
app.post('/templates', (req,res) => { const d=loadData(); if(!d.templates) d.templates=[]; const t={id:'template-'+Date.now(),name:req.body.name||'Neues Template',description:req.body.description||'',zones:req.body.zones||[],isDefault:false,createdAt:new Date().toISOString()}; d.templates.push(t); saveData(d) ? res.json({success:true,template:t}) : res.status(500).json({success:false}); });
app.put('/templates/:id', (req,res) => { const d=loadData(); const i=(d.templates||[]).findIndex(t=>t.id===req.params.id); if(i===-1) return res.status(404).json({success:false}); const isDef=d.templates[i].isDefault; d.templates[i]={...d.templates[i],...req.body,id:req.params.id,isDefault:isDef,updatedAt:new Date().toISOString()}; saveData(d) ? res.json({success:true,template:d.templates[i]}) : res.status(500).json({success:false}); });
app.delete('/templates/:id', (req,res) => { const d=loadData(); const t=(d.templates||[]).find(t=>t.id===req.params.id); if(t?.isDefault) return res.status(403).json({success:false,message:'Standard-Templates können nicht gelöscht werden'}); d.templates=(d.templates||[]).filter(t=>t.id!==req.params.id); saveData(d) ? res.json({success:true}) : res.status(500).json({success:false}); });
app.post('/apply-template', (req,res) => { const d=loadData(); const t=(d.templates||[]).find(t=>t.id===req.body.templateId); if(!t) return res.status(404).json({success:false}); d.zones=JSON.parse(JSON.stringify(t.zones)); saveData(d) ? res.json({success:true,zones:d.zones}) : res.status(500).json({success:false}); });

// Displays CRUD
app.get('/displays', (req,res) => res.json(loadData().displays||[]));
app.get('/displays/:id', (req,res) => { const d2=(loadData().displays||[]).find(d=>d.id===req.params.id); d2 ? res.json(d2) : res.status(404).json({success:false}); });
app.post('/displays', (req,res) => { const d=loadData(); if(!d.displays) d.displays=[]; const disp={id:'display-'+Date.now(),name:req.body.name||'Neues Display',slug:req.body.slug||'display-'+(d.displays.length+1),description:req.body.description||'',templateId:req.body.templateId||'split',playlist:req.body.playlist||[],zones:[],settings:{},active:req.body.active!==false,createdAt:new Date().toISOString(),lastSeen:new Date().toISOString()}; d.displays.push(disp); saveData(d) ? res.json({success:true,display:disp}) : res.status(500).json({success:false}); });
app.put('/displays/:id', (req,res) => { const d=loadData(); const i=(d.displays||[]).findIndex(x=>x.id===req.params.id); if(i===-1) return res.status(404).json({success:false}); d.displays[i]={...d.displays[i],...req.body,id:req.params.id,lastModified:new Date().toISOString()}; saveData(d) ? res.json({success:true,display:d.displays[i]}) : res.status(500).json({success:false}); });
app.delete('/displays/:id', (req,res) => { const d=loadData(); d.displays=(d.displays||[]).filter(x=>x.id!==req.params.id); saveData(d) ? res.json({success:true}) : res.status(500).json({success:false}); });
app.post('/displays/:id/heartbeat', (req,res) => { const d=loadData(); const disp=(d.displays||[]).find(x=>x.id===req.params.id); if(disp){disp.lastSeen=new Date().toISOString();saveData(d);res.json({success:true,config:disp});}else res.status(404).json({success:false}); });

// Remote Control
app.post('/displays/:id/command', (req,res) => { const d=loadData(); const disp=(d.displays||[]).find(x=>x.id===req.params.id); if(!disp) return res.status(404).json({success:false}); if(!disp.pendingCommands) disp.pendingCommands=[]; disp.pendingCommands.push({...req.body,timestamp:new Date().toISOString(),id:'cmd-'+Date.now()}); saveData(d); res.json({success:true}); });
app.get('/displays/:id/commands', (req,res) => { const d=loadData(); const disp=(d.displays||[]).find(x=>x.id===req.params.id); if(!disp) return res.status(404).json({success:false}); const cmds=disp.pendingCommands||[]; disp.pendingCommands=[]; saveData(d); res.json({success:true,commands:cmds}); });
app.post('/displays/broadcast', (req,res) => { const d=loadData(); (d.displays||[]).forEach(disp=>{if(!disp.pendingCommands)disp.pendingCommands=[];disp.pendingCommands.push({...req.body,timestamp:new Date().toISOString(),id:'cmd-'+Date.now()});}); saveData(d); res.json({success:true}); });

// Public display
app.get('/display/:slug', (req,res) => {
    const d=loadData(); const disp=(d.displays||[]).find(x=>x.slug===req.params.slug&&x.active!==false);
    if(!disp) return res.status(404).send('<html><body style="background:#0a0a0f;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;font-family:sans-serif;"><div style="text-align:center"><h1>❌ Display nicht gefunden</h1></div></body></html>');
    disp.lastSeen=new Date().toISOString(); saveData(d);
    res.send(`<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${disp.name}</title><link rel="stylesheet" href="/public/css/display.css"><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"></head><body data-display-slug="${disp.slug}"><div id="loadingScreen" class="loading-screen"><div class="loading-spinner"></div><p>${disp.name} wird geladen...</p></div><div id="displayContainer" class="display-container"></div><script src="/public/js/display.js"></script><script>window.DISPLAY_SLUG='${disp.slug}';</script></body></html>`);
});

// Playlists CRUD
app.get('/playlists', (req,res) => res.json(loadData().playlists||[]));
app.post('/playlists', (req,res) => { const d=loadData(); if(!d.playlists) d.playlists=[]; const pl={id:'playlist-'+Date.now(),name:req.body.name||'Neue Playlist',description:req.body.description||'',type:req.body.type||'display',targetId:req.body.targetId||'',items:req.body.items||[],loop:req.body.loop!==false,shuffle:req.body.shuffle||false,createdAt:new Date().toISOString()}; d.playlists.push(pl); saveData(d) ? res.json({success:true,playlist:pl}) : res.status(500).json({success:false}); });
app.put('/playlists/:id', (req,res) => { const d=loadData(); const i=(d.playlists||[]).findIndex(p=>p.id===req.params.id); if(i===-1) return res.status(404).json({success:false}); d.playlists[i]={...d.playlists[i],...req.body,id:req.params.id,updatedAt:new Date().toISOString()}; saveData(d) ? res.json({success:true,playlist:d.playlists[i]}) : res.status(500).json({success:false}); });
app.delete('/playlists/:id', (req,res) => { const d=loadData(); d.playlists=(d.playlists||[]).filter(p=>p.id!==req.params.id); saveData(d) ? res.json({success:true}) : res.status(500).json({success:false}); });

// Analytics
app.post('/analytics/track', (req,res) => {
    const a=loadAnalytics(); const {type,id,displayId}=req.body; const now=new Date(); const h=now.getHours(); const day=now.toISOString().split('T')[0];
    if(type==='product_view'&&id) a.productViews[id]=(a.productViews[id]||0)+1;
    if(displayId) a.displayViews[displayId]=(a.displayViews[displayId]||0)+1;
    a.hourlyStats[`${day}_h${h}`]=(a.hourlyStats[`${day}_h${h}`]||0)+1;
    a.dailyStats[day]=(a.dailyStats[day]||0)+1;
    a.events.push({type,id,displayId,ts:now.toISOString()});
    if(a.events.length>500) a.events=a.events.slice(-500);
    saveAnalytics(a); res.json({success:true});
});
app.get('/analytics', (req,res) => {
    const a=loadAnalytics(); const d=loadData();
    const productRanking=Object.entries(a.productViews).map(([id,views])=>{const p=d.products.find(p=>p.id===parseInt(id));return{id:parseInt(id),name:p?.title||'Unbekannt',category:p?.category||'',views};}).sort((x,y)=>y.views-x.views).slice(0,20);
    const last7Days=[];for(let i=6;i>=0;i--){const dt=new Date();dt.setDate(dt.getDate()-i);const k=dt.toISOString().split('T')[0];last7Days.push({date:k,views:a.dailyStats[k]||0});}
    const today=new Date().toISOString().split('T')[0];
    const hourlyToday=Array.from({length:24},(_,h)=>({hour:h,views:a.hourlyStats[`${today}_h${h}`]||0}));
    res.json({productRanking,last7Days,hourlyToday,totalProductViews:Object.values(a.productViews).reduce((x,y)=>x+y,0),displayViews:a.displayViews});
});
app.delete('/analytics/reset', (req,res) => { saveAnalytics({productViews:{},displayViews:{},hourlyStats:{},dailyStats:{},events:[]}); res.json({success:true}); });

// Schedules
app.get('/schedule', (req,res) => {
    const d=loadData(); const schedules=d.schedules||[]; const now=new Date(); const cd=now.getDay(); const ct=now.getHours()*60+now.getMinutes();
    const active=schedules.find(s=>{if(!s.active||!s.days?.includes(cd)) return false; const [sh,sm]=(s.startTime||'00:00').split(':').map(Number); const [eh,em]=(s.endTime||'23:59').split(':').map(Number); return ct>=sh*60+sm&&ct<eh*60+em;});
    res.json({activeSchedule:active||null,allSchedules:schedules,currentTime:now.toISOString()});
});
app.post('/schedules', (req,res) => { const d=loadData(); d.schedules=req.body.schedules||[]; saveData(d) ? res.json({success:true,schedules:d.schedules}) : res.status(500).json({success:false}); });

// Weather
app.get('/weather', async (req,res) => {
    try {
        const {default:fetch}=await import('node-fetch');
        const lat=req.query.lat||'52.52'; const lon=req.query.lon||'13.41';
        const r=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&windspeed_unit=kmh`);
        if(!r.ok) throw new Error('API error');
        const wd=await r.json(); const code=wd.current_weather.weathercode;
        const icons={0:'☀️',1:'🌤️',2:'⛅',3:'☁️',45:'🌫️',51:'🌦️',61:'🌧️',71:'❄️',80:'🌦️',95:'⛈️'};
        let rec=null;
        if([51,53,55,61,63,65,80,81,82].includes(code)) rec='🍲 Perfekt für heiße Speisen!';
        else if(code===0||code===1) rec='🧊 Perfekt für Eistee!';
        else if([71,73,75,77].includes(code)) rec='☕ Wärm dich auf!';
        res.json({temperature:wd.current_weather.temperature,windspeed:wd.current_weather.windspeed,weathercode:code,icon:icons[code]||'🌡️',recommendation:rec});
    } catch(e) { res.status(500).json({success:false,error:e.message}); }
});

// Media
app.post('/upload', upload.single('file'), (req,res) => { if(!req.file) return res.status(400).json({success:false}); res.json({success:true,file:{filename:req.file.filename,originalname:req.file.originalname,url:`/uploads/${req.file.filename}`,size:req.file.size,mimetype:req.file.mimetype}}); });
app.post('/upload-multiple', upload.array('files',10), (req,res) => { if(!req.files?.length) return res.status(400).json({success:false}); res.json({success:true,files:req.files.map(f=>({filename:f.filename,originalname:f.originalname,url:`/uploads/${f.filename}`,size:f.size,mimetype:f.mimetype}))}); });
app.get('/uploads-list', (req,res) => { try { const files=fs.readdirSync(UPLOADS_DIR).filter(f=>f!=='.gitkeep').map(f=>{const s=fs.statSync(path.join(UPLOADS_DIR,f));return{filename:f,url:`/uploads/${f}`,size:s.size,modified:s.mtime};}); res.json({success:true,uploads:files}); } catch(e) { res.status(500).json({success:false}); } });
app.delete('/uploads/:filename', (req,res) => { const fp=path.join(UPLOADS_DIR,req.params.filename); try { if(fs.existsSync(fp)){fs.unlinkSync(fp);res.json({success:true});}else res.status(404).json({success:false}); } catch(e) { res.status(500).json({success:false}); } });

app.get('/settings', (req,res) => res.json(loadData().settings));
app.post('/settings', (req,res) => { const d=loadData(); d.settings={...d.settings,...req.body}; saveData(d) ? res.json({success:true,settings:d.settings}) : res.status(500).json({success:false}); });

app.get('/health', (req,res) => res.json({status:'ok',version:'8.0',timestamp:new Date().toISOString()}));
app.get('/', (req,res) => res.redirect('/admin/index.html'));
app.use((err,req,res,next) => { console.error(err.stack); res.status(500).json({success:false,message:err.message}); });

app.listen(PORT, () => {
    console.log('╔══════════════════════════════════════╗');
    console.log(`║   DIGITAL MENUBOARD v8.0              ║`);
    console.log(`║   http://localhost:${PORT}/admin       ║`);
    console.log('╚══════════════════════════════════════╝');
});
module.exports = app;
