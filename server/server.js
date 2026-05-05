const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.json());
app.use(express.static("public"));

// Keep-alive endpoint
app.get("/ping", (req, res) => res.send("ok"));

let menuData = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  title: "Produkt " + (i + 1),
  text: "Beschreibung " + (i + 1),
  price: (2 + i) + "€"
}));

app.get("/api/menu", (req, res) => res.json(menuData));

app.post("/api/menu", (req, res) => {
  menuData = req.body;
  console.log("Daten aktualisiert");

  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(menuData));
    }
  });

  res.sendStatus(200);
});

wss.on("connection", ws => {
  console.log("Neuer Client verbunden");
  ws.send(JSON.stringify(menuData));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("Server läuft auf Port " + PORT));
