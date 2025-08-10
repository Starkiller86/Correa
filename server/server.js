// server/server.js
import WebSocket, { WebSocketServer } from "ws";
import http from "http";
import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import os from "os";

// =====================
// Configuración
// =====================
const JWT_SECRET = "clave_super_segura"; // ponla en .env en producción
const PORT_WS = 8080;

// Función para detectar IP local
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "localhost";
}

const localIp = getLocalIp();

// Usuarios de ejemplo (en producción vendrían de una BD)
const users = [
  { username: "meseroCocina", password: bcrypt.hashSync("1234", 8), role: "mesero-cocina" },
  { username: "meseroBar", password: bcrypt.hashSync("5678", 8), role: "mesero-bar" },
  { username: "cocinero", password: bcrypt.hashSync("abcd", 8), role: "cocinero" },
  { username: "bartender", password: bcrypt.hashSync("fghi", 8), role: "bartender" },
  { username: "adminComida", password: bcrypt.hashSync("1234+", 8), role: "admin-comida" },
  { username: "adminBebidas", password: bcrypt.hashSync("5678+", 8), role: "admin-bebidas" },
];

// =====================
// Servidor HTTP (Express)
// =====================
const app = express();
app.use(cors());
app.use(express.json());

// Middleware para verificar token
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: "Token requerido" });

  try {
    const decoded = jwt.verify(authHeader.split(" ")[1], JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(403).json({ message: "Token inválido" });
  }
}

// Endpoint de login
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const user = users.find((u) => u.username === username);
  if (!user) return res.status(401).json({ message: "Rol o contraseña incorrectos" });

  if (!bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ message: "Rol o contraseña incorrectos" });
  }

  const token = jwt.sign({ username: user.username, role: user.role }, JWT_SECRET, { expiresIn: "8h" });

  res.json({ token, role: user.role });
});

// Ejemplo de endpoint protegido por rol
app.get("/solo-admin", verifyToken, (req, res) => {
  if (req.user.role !== "admin-comida" && req.user.role !== "admin-bebidas") {
    return res.status(403).json({ message: "No tienes permiso" });
  }
  res.json({ message: "Acceso permitido a admin" });
});

// =====================
// WebSocket Server
// =====================
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Estado en memoria para órdenes
let orders = [];

wss.on("connection", (ws) => {
  console.log("📡 Cliente conectado al WebSocket");

  safeSend(ws, {
    type: "initial_data",
    orders,
  });

  ws.on("message", (message) => {
    let data;
    try {
      data = JSON.parse(message);
    } catch (err) {
      console.error("❌ Mensaje WS inválido:", message);
      return;
    }

    const t = data?.type;

    if (t === "new_order" && data.order) {
      orders.push(data.order);
      return broadcast({ type: "update", orders });
    }

    if (t === "complete_order" && data.orderId) {
      orders = orders.map((o) => (o.id === data.orderId ? { ...o, status: "completed" } : o));
      return broadcast({ type: "update", orders });
    }

    if (typeof t === "string" && t.endsWith(":new_order") && data.order) {
      orders.push(data.order);
      return broadcast({ type: "update", orders });
    }

    if (t === "admin:update" && data.from === "admin" && Array.isArray(data.orders)) {
      orders = data.orders;
      return broadcast({ type: "update", orders });
    }

    if (t === "menu_updated") {
      console.log("🧾 Menú (dishes) actualizado → avisando a todos");
      return broadcast({ type: "menu_updated" });
    }

    if (t === "alcohol_updated") {
      console.log("🍹 Alcohol (bar) actualizado → avisando a todos");
      return broadcast({ type: "alcohol_updated" });
    }
  });

  ws.on("close", () => {
    console.log("🔌 Cliente desconectado");
  });
});

function broadcast(obj) {
  const payload = JSON.stringify(obj);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

function safeSend(ws, obj) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(obj));
  }
}

// =====================
// Iniciar servidor
// =====================
server.listen(PORT_WS, "0.0.0.0", () => {
  console.log(`🚀 Servidor HTTP+WS escuchando en puerto ${PORT_WS}`);
  console.log(`🛠 Login disponible en http://${localIp}:${PORT_WS}/login`);
});
