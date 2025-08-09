// src/services/BarSocket.js
// ✅ WS del bar (puerto 8090). Sin REST de órdenes.
class BarSocket {
  static instance = null;
  static getInstance() {
    if (!BarSocket.instance) BarSocket.instance = new BarSocket();
    return BarSocket.instance;
  }

  constructor() {
    const host = window.location.hostname;
    this.wsUrl = `ws://${host}:8090`;   // 👈 bar
    this.baseUrl = `http://${host}:3001`;
    this.socket = null;
    this.retryCount = 0;
    this.handlers = { 'bar:new_order': [], 'alcohol_updated': [], 'initial_data': [], 'update': [] };
  }

  connect() {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) return;
    this.socket = new WebSocket(this.wsUrl);

    this.socket.onopen = () => { console.log('🍹 [bar-socket] Conectado:', this.wsUrl); this.retryCount = 0; };
    this.socket.onmessage = (evt) => {
      let data; try { data = JSON.parse(evt.data); } catch { return; }
      const t = data?.type; if (!t) return;
      (this.handlers[t] || []).forEach(fn => { try { fn(data); } catch (e) { console.error(e); } });
    };
    this.socket.onclose = () => { console.warn('🍹 [bar-socket] Desconectado, reintentando...'); this.scheduleReconnect(); };
    this.socket.onerror = (e) => console.error('🍹 [bar-socket] Error:', e);
  }

  scheduleReconnect() {
    const d = Math.min(1000 * (2 ** this.retryCount), 30000);
    this.retryCount++; setTimeout(() => this.connect(), d);
  }
  on(type, cb) { (this.handlers[type] ||= []).push(cb); }
  send(obj) {
    if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(obj));
    else console.error('🚫 [bar-socket] No conectado — no se envía', obj);
  }

  // Catálogo alcohol (sí usa JSON Server)
  async fetchAlcohol() {
    const r = await fetch(`${this.baseUrl}/alcohol`);
    return r.json();
  }

  notifyAlcoholUpdated() { this.send({ type: 'alcohol_updated' }); }
}

export const barSocket = BarSocket.getInstance();

export const initBarSocket = (onOrdersUpdate, onAlcoholUpdated) => {
  // Snapshot y actualizaciones (lista completa)
  barSocket.on('initial_data', d => onOrdersUpdate?.(d.orders || []));
  barSocket.on('update',       d => onOrdersUpdate?.(d.orders || []));
  // Evento puntual por si alguien lo escucha
  barSocket.on('bar:new_order', d => onOrdersUpdate?.(d.order ? [d.order] : []));
  // Catálogo
  barSocket.on('alcohol_updated', () => onAlcoholUpdated?.());
  barSocket.connect();
};

export const fetchAlcoholItems = () => barSocket.fetchAlcohol();
export const placeBarOrder = async (order) => {
  const withId = { id: order.id || String(Date.now()), ...order, source: 'bar' };
  barSocket.send({ type: 'bar:new_order', order: withId }); // broadcast inmediato
  return withId;
};
export const notifyAlcoholUpdated = () => barSocket.notifyAlcoholUpdated();
