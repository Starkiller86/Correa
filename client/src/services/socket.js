// src/services/socket.js
// ✅ WS de cocina con “fallback” si /orders no existe
class SocketService {
  static instance = null;
  static getInstance() {
    if (!SocketService.instance) SocketService.instance = new SocketService();
    return SocketService.instance;
  }

  constructor() {
    const host = window.location.hostname;
    this.wsUrl = `ws://${host}:8080`;   // 👈 cocina
    this.baseUrl = `http://${host}:3001`;
    this.socket = null;
    this.retryCount = 0;
    this.handlers = { initial_data: [], update: [], menu_updated: [] };
  }

  connect() {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) return;
    this.socket = new WebSocket(this.wsUrl);

    this.socket.onopen = () => { console.log('✅ [socket] Conectado:', this.wsUrl); this.retryCount = 0; };
    this.socket.onmessage = (evt) => {
      let data; try { data = JSON.parse(evt.data); } catch { return; }
      const t = data?.type; if (!t) return;
      (this.handlers[t] || []).forEach(fn => { try { fn(data); } catch (e) { console.error(e); } });
    };
    this.socket.onclose = () => { console.warn('🔌 [socket] Desconectado, reintentando...'); this.scheduleReconnect(); };
    this.socket.onerror = (err) => console.error('⚠️ [socket] Error:', err);
  }
  scheduleReconnect() {
    const delay = Math.min(1000 * (2 ** this.retryCount), 30000);
    this.retryCount++; setTimeout(() => this.connect(), delay);
  }
  on(type, cb) { (this.handlers[type] ||= []).push(cb); }
  send(obj) {
    if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(obj));
    else console.error('🚫 [socket] No conectado — no se envía', obj);
  }

  // -------- REST de menú (sigue igual) --------
  async fetchMenu() {
    const r = await fetch(`${this.baseUrl}/dishes`);
    return r.json();
  }

  // -------- CRUD /orders con fallback --------
  async createOrder(order) {
    try {
      const r = await fetch(`${this.baseUrl}/orders`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(order),
      });
      if (!r.ok) throw new Error(`REST /orders ${r.status}`);
      return await r.json();
    } catch (err) {
      console.warn('[socket] /orders no disponible → usando SOLO WS', err);
      return order; // devolvemos el objeto tal cual
    }
  }

  async completeOrder(orderId) {
    try {
      const r = await fetch(`${this.baseUrl}/orders/${orderId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'completed' }),
      });
      if (!r.ok) throw new Error(`REST /orders/${orderId} ${r.status}`);
      return await r.json();
    } catch (err) {
      console.warn('[socket] PATCH /orders/* no disponible → solo WS', err);
      return { id: orderId, status: 'completed' };
    }
  }

  notifyMenuUpdated() { this.send({ type: 'menu_updated' }); }
}

export const socket = SocketService.getInstance();

export const initializeSocketConnection = (onOrders) => {
  socket.on('initial_data', d => onOrders?.(d.orders || []));
  socket.on('update',       d => onOrders?.(d.orders || []));
  socket.on('menu_updated', () => onOrders?.('__MENU_UPDATED__'));
  socket.connect();
};

// Helpers
export const fetchMenuItems   = () => socket.fetchMenu();
export const placeNewOrder    = async (order) => {
  const withId = { id: order.id || String(Date.now()), ...order, source: 'kitchen' };
  const saved  = await socket.createOrder(withId);
  socket.send({ type: 'new_order', order: saved });     // 👈 SIEMPRE notificamos por WS
  return saved;
};
export const markOrderAsCompleted = async (orderId) => {
  const updated = await socket.completeOrder(orderId);
  socket.send({ type: 'complete_order', orderId });
  return updated;
};
export const notifyMenuUpdated = () => socket.notifyMenuUpdated();
