const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.json({ limit: "10mb" }));
app.use(express.static("public"));

app.get("/ping", (req,res)=>res.send("ok"));

// 12 Produkte (Coffee + Burger)
let menuData = [
  {
    id:1,
    title:"Caffè Latte",
    text:"Cremiger Espresso mit aufgeschäumter Milch",
    price:"3.90€",
    image:"https://images.unsplash.com/photo-1509042239860-f550ce710b93"
  },
  {
    id:2,
    title:"Cappuccino",
    text:"Perfekte Balance aus Espresso und Milchschaum",
    price:"3.50€",
    image:"https://images.unsplash.com/photo-1495474472287-4d71bcdd2085"
  },
  {
    id:3,
    title:"Iced Coffee",
    text:"Erfrischender Kaffee mit Eiswürfeln",
    price:"3.20€",
    image:"https://images.unsplash.com/photo-1461023058943-07fcbe16d735"
  },
  {
    id:4,
    title:"Flat White",
    text:"Starker Espresso mit feiner Milchstruktur",
    price:"3.80€",
    image:"https://images.unsplash.com/photo-1511920170033-f8396924c348"
  },
  {
    id:5,
    title:"Espresso",
    text:"Klassischer starker Kaffee",
    price:"2.20€",
    image:"https://images.unsplash.com/photo-1510707577719-ae7c14805e2f"
  },
  {
    id:6,
    title:"Mocha",
    text:"Schokolade trifft Espresso",
    price:"4.10€",
    image:"https://images.unsplash.com/photo-1504630083234-14187a9df0f5"
  },
  {
    id:7,
    title:"Classic Burger",
    text:"Saftiges Rindfleisch mit Salat und Sauce",
    price:"6.90€",
    image:"https://images.unsplash.com/photo-1550547660-d9450f859349"
  },
  {
    id:8,
    title:"Cheeseburger",
    text:"Mit geschmolzenem Cheddar",
    price:"7.50€",
    image:"https://images.unsplash.com/photo-1568901346375-23c9450c58cd"
  },
  {
    id:9,
    title:"Double Burger",
    text:"Doppelt Fleisch, doppelt Geschmack",
    price:"9.20€",
    image:"https://images.unsplash.com/photo-1550317138-10000687a72b"
  },
  {
    id:10,
    title:"Chicken Burger",
    text:"Knuspriges Hähnchenfilet",
    price:"7.80€",
    image:"https://images.unsplash.com/photo-1606755962773-d324e0a13086"
  },
  {
    id:11,
    title:"Veggie Burger",
    text:"Vegetarisch & lecker",
    price:"6.50€",
    image:"https://images.unsplash.com/photo-1546069901-ba9599a7e63c"
  },
  {
    id:12,
    title:"Bacon Burger",
    text:"Mit knusprigem Bacon",
    price:"8.40€",
    image:"https://images.unsplash.com/photo-1553979459-d2229ba7433b"
  }
];

app.get("/api/menu",(req,res)=>res.json(menuData));

app.post("/api/menu",(req,res)=>{
  menuData=req.body;

  wss.clients.forEach(c=>{
    if(c.readyState===1){
      c.send(JSON.stringify(menuData));
    }
  });

  res.sendStatus(200);
});

wss.on("connection",ws=>{
  ws.send(JSON.stringify(menuData));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT,()=>console.log("Server läuft"));
