// server.js (ESM)
import WebSocket, { WebSocketServer } from 'ws';
import http from 'http';

const server = http.createServer();
const wss = new WebSocketServer({ server });

// Estado en memoria solo para órdenes (como antes)
let orders = [];

wss.on('connection', (ws) => {
  console.log('📡 Cliente conectado al WebSocket');

  // Estado inicial para clientes de cocina/cliente
  safeSend(ws, {
    type: 'initial_data',
    orders
  });

  ws.on('message', (message) => {
    let data;
    try {
      data = JSON.parse(message);
    } catch (err) {
      console.error('❌ Mensaje WS inválido:', message);
      return;
    }

    const t = data?.type;

    // --- Compat Kitchen/ClientInterface clásicos ---
    if (t === 'new_order' && data.order) {
      orders.push(data.order);
      return broadcast({ type: 'update', orders });
    }

    if (t === 'complete_order' && data.orderId) {
      orders = orders.map(o => o.id === data.orderId ? { ...o, status: 'completed' } : o);
      return broadcast({ type: 'update', orders });
    }

    // --- Soporte opcional para tipos namespaced que ya probaste ---
    if (typeof t === 'string' && t.endsWith(':new_order') && data.order) {
      orders.push(data.order);
      return broadcast({ type: 'update', orders });
    }

if (t === 'admin:update' && data.from === 'admin' && Array.isArray(data.orders)) {
  orders = data.orders;
  return broadcast({ type: 'update', orders });
}


    // --- Eventos de administración para refrescar menús en tiempo real ---
    if (t === 'menu_updated') {
      console.log('🧾 Menú (dishes) actualizado → avisando a todos');
      return broadcast({ type: 'menu_updated' });
    }

    if (t === 'alcohol_updated') {
      console.log('🍹 Alcohol (bar) actualizado → avisando a todos');
      return broadcast({ type: 'alcohol_updated' });
    }

    // Si cae aquí, no hacemos nada.
    // console.log('Evento no manejado:', data);
  });

  ws.on('close', () => {
    console.log('🔌 Cliente desconectado');
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

server.listen(8080, '0.0.0.0', () => {
  console.log('🚀 Servidor WS escuchando en puerto 8080');
});
