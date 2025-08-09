// server-bar.js — WS SOLO para Bar/Bartender
import WebSocket, { WebSocketServer } from 'ws';
import http from 'http';

const server = http.createServer();
const wss = new WebSocketServer({ server });

// Estado en memoria para pedidos del bar
let barOrders = [];

wss.on('connection', (ws) => {
  console.log('🍹 [bar] Cliente conectado');

  // Snapshot inicial
  safeSend(ws, { type: 'initial_data', orders: barOrders });

  ws.on('message', (msg) => {
    let data;
    try { data = JSON.parse(msg); } catch { return; }
    const t = data?.type;

    // Pedidos del bar
    if (t === 'bar:new_order' && data.order) {
      barOrders.push(data.order);
      // Broadcast en dos sabores:
      broadcast({ type: 'bar:new_order', order: data.order });
      broadcast({ type: 'update', orders: barOrders });
      return;
    }

    // Señal para refrescar catálogo
    if (t === 'alcohol_updated') {
      return broadcast({ type: 'alcohol_updated' });
    }
  });

  ws.on('close', () => console.log('🔌 [bar] Cliente desconectado'));
});

function broadcast(obj) {
  const payload = JSON.stringify(obj);
  wss.clients.forEach(c => c.readyState === WebSocket.OPEN && c.send(payload));
}
function safeSend(ws, obj) {
  ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify(obj));
}

server.listen(8090, '0.0.0.0', () => {
  console.log('🚀 [bar] WS escuchando en 8090');
});
