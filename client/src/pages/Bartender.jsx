// src/pages/Bartender.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { initBarSocket } from '../services/BarSocket';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import './bartender.css';

const LEDGER_KEY = 'alcohol_sales_ledger_v1';   // Historial de ventas
const TOMBSTONES_KEY = 'bar_tombstones_v1';     // Firmas de pedidos eliminados

/* ====================================================================
   Helpers de firma y deduplicación
   - orderSignature genera una firma estable del pedido (mesa + timestamp
     truncado + items). Se usa para tombstones y para deduplicar.
   - dedupOrders fusiona por id y por firma, y además ignora cualquier
     pedido cuya firma esté marcada como tombstone.
   ==================================================================== */
const orderSignature = (o) =>
  JSON.stringify({
    t: o.table ?? o.mesa,
    ts: (o.timestamp || '').slice(0, 19), // precisión a segundos
    items: (o.items || o.pedidos || []).map((it) => ({
      n: it?.name,
      s: it?.size || '',
      q: it?.quantity || 1,
      c: (it?.category || '').toLowerCase(),
      p: Number(it?.price) || 0,
    })),
  });

const dedupOrders = (arr = [], tombstones = new Set()) => {
  const byId = new Map();
  const signatures = new Map(); // sig -> id (para fusionar estado "completed")

  for (const raw of arr) {
    if (!raw) continue;
    if ((raw?.source || 'bar') !== 'bar') continue;

    const o = { ...raw, completed: !!raw.completed };
    const sig = orderSignature(o);

    // Si la firma está en tombstones, lo ignoramos siempre
    if (tombstones.has(sig)) continue;

    // Si ya existe esa firma, solo fusionamos el estado "completed"
    if (signatures.has(sig)) {
      const existingId = signatures.get(sig);
      const existing = byId.get(existingId);
      if (existing) existing.completed = existing.completed || o.completed;
      continue;
    }

    // Si ya existe por id, fusionamos campos preservando "completed"
    if (byId.has(o.id)) {
      const prev = byId.get(o.id);
      byId.set(o.id, { ...prev, ...o, completed: prev.completed || o.completed });
    } else {
      byId.set(o.id, o);
    }

    // Registrar firma
    if (!signatures.has(sig)) signatures.set(sig, o.id);
  }

  return [...byId.values()];
};

/* ====================================================================
   Ledger (histórico persistente) y Tombstones
   ==================================================================== */
function loadLedger() {
  try {
    const raw = localStorage.getItem(LEDGER_KEY);
    if (!raw) {
      return {
        processedOrderIds: {},
        totals: { simples: 0, dobles: 0, triples: 0, botellas: 0, amount: 0 },
        entries: [], // líneas históricas para el PDF
      };
    }
    const parsed = JSON.parse(raw);
    return {
      processedOrderIds: parsed.processedOrderIds || {},
      totals:
        parsed.totals || { simples: 0, dobles: 0, triples: 0, botellas: 0, amount: 0 },
      entries: Array.isArray(parsed.entries) ? parsed.entries : [],
    };
  } catch {
    return {
      processedOrderIds: {},
      totals: { simples: 0, dobles: 0, triples: 0, botellas: 0, amount: 0 },
      entries: [],
    };
  }
}
function saveLedger(ledger) {
  localStorage.setItem(LEDGER_KEY, JSON.stringify(ledger));
}

const loadTombstones = () => {
  try { return new Set(JSON.parse(localStorage.getItem(TOMBSTONES_KEY) || '[]')); }
  catch { return new Set(); }
};
const saveTombstones = (set) => {
  localStorage.setItem(TOMBSTONES_KEY, JSON.stringify([...set]));
};

/* ====================================================================
   Helpers para PDF y presentación
   ==================================================================== */
const money = (n) => (Number(n) || 0).toFixed(2);
const fecha = (iso) => {
  const d = new Date(iso);
  return isNaN(d) ? '' : d.toLocaleDateString();
};
const hora = (iso) => {
  const d = new Date(iso);
  return isNaN(d) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};
const tipoHumano = (e) => {
  if ((e.category || '').toLowerCase() === 'botellas') return `Botella x${Number(e.quantity || 1)}`;
  const s = String(e.size || 'simple').toLowerCase();
  if (s === 'doble') return 'Doble';
  if (s === 'triple') return 'Triple';
  return 'Simple';
};

/* ====================================================================
   Componente principal
   ==================================================================== */
const Bartender = () => {
  const [orders, setOrders] = useState([]);
  const [ledger, setLedger] = useState(loadLedger());
  const [tombstones, setTombstones] = useState(loadTombstones());
  const [showStats, setShowStats] = useState(false);

  /* ------------------------------------------------------------
     Carga inicial desde localStorage (solo pedidos del bar),
     aplica deduplicación y respeta tombstones.
     ------------------------------------------------------------ */
  useEffect(() => {
    const saved = localStorage.getItem('alcohol_orders');
    if (saved) {
      try {
        const parsed = JSON.parse(saved).filter((o) => (o?.source || 'bar') === 'bar');
        const clean = dedupOrders(parsed, tombstones);
        localStorage.setItem('alcohol_orders', JSON.stringify(clean));
        setOrders(clean);
        foldOrdersIntoLedger(clean);
      } catch {}
    }
    // no añadir tombstones como dependencia aquí para no re-plegar varias veces
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ------------------------------------------------------------
     WebSocket del bar. Mezcla de manera idempotente y respetando
     tombstones para evitar resurrecciones.
     ------------------------------------------------------------ */
  useEffect(() => {
    const mergeUnique = (incoming) => {
      const onlyBar = (incoming || []).filter((o) => (o?.source || 'bar') === 'bar');
      if (!onlyBar.length) return;

      setOrders((prev) => {
        const next = dedupOrders([...prev, ...onlyBar], tombstones);
        localStorage.setItem('alcohol_orders', JSON.stringify(next));
        return next;
      });

      // Solo plegamos lo nuevo al ledger. Aunque lleguen duplicados,
      // processedOrderIds impide contarlos dos veces.
      foldOrdersIntoLedger(onlyBar);
    };
    initBarSocket(mergeUnique);
  }, [tombstones]);

  /* ------------------------------------------------------------
     Sincronización entre pestañas:
     - alcohol_orders: rehidratar lista respetando tombstones
     - TOMBSTONES_KEY: actualizar el set local
     ------------------------------------------------------------ */
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === TOMBSTONES_KEY && typeof e.newValue === 'string') {
        try { setTombstones(new Set(JSON.parse(e.newValue))); } catch {}
      }
      if (e.key === 'alcohol_orders' && typeof e.newValue === 'string') {
        try {
          const parsed = JSON.parse(e.newValue).filter((o) => (o?.source || 'bar') === 'bar');
          const clean = dedupOrders(parsed, tombstones);
          setOrders(clean);
          foldOrdersIntoLedger(clean);
        } catch {}
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [tombstones]);

  /* ------------------------------------------------------------
     Plegado de pedidos al ledger histórico. Guarda:
     - totales agregados (simples/dobles/triples/botellas/amount)
     - entries por ítem para el PDF
     ------------------------------------------------------------ */
  const foldOrdersIntoLedger = (ordersArr) => {
    if (!Array.isArray(ordersArr) || ordersArr.length === 0) return;

    setLedger((prev) => {
      const next = {
        processedOrderIds: { ...prev.processedOrderIds },
        totals: { ...prev.totals },
        entries: [...prev.entries],
      };

      let changed = false;

      for (const order of ordersArr) {
        if (
          !order?.id ||
          (order?.source || 'bar') !== 'bar' ||
          next.processedOrderIds[order.id]
        ) continue;

        const items = order.items ?? order.pedidos ?? [];
        for (const it of items) {
          const size = (it.size || 'simple').toLowerCase();
          const category = (it.category || '').toLowerCase();
          const price = Number(it.price) || 0;

          // Totales
          if (category === 'botellas') next.totals.botellas += Number(it.quantity) || 1;
          else if (size === 'doble') next.totals.dobles += 1;
          else if (size === 'triple') next.totals.triples += 1;
          else next.totals.simples += 1;
          next.totals.amount += price;

          // Entrada histórica para el PDF
          next.entries.push({
            name: it.name || '',
            price,
            timestamp: order.timestamp,
            size: it.size || 'simple',
            category: it.category || '',
            quantity: it.quantity || 1,
          });
          changed = true;
        }

        next.processedOrderIds[order.id] = true;
      }

      if (changed) saveLedger(next);
      return changed ? next : prev;
    });
  };

  /* ------------------------------------------------------------
     Estadísticas en vivo (pedidos abiertos en memoria)
     ------------------------------------------------------------ */
  const statsLive = useMemo(() => {
    let total = 0, simples = 0, dobles = 0, triples = 0, botellas = 0;
    for (const order of orders) {
      const items = order.items ?? order.pedidos ?? [];
      for (const it of items) {
        const size = (it.size || 'simple').toLowerCase();
        const category = (it.category || '').toLowerCase();
        const price = Number(it.price) || 0;
        if (category === 'botellas') botellas += Number(it.quantity) || 1;
        else if (size === 'doble')   dobles++;
        else if (size === 'triple')  triples++;
        else                         simples++;
        total += price;
      }
    }
    return { total, simples, dobles, triples, botellas };
  }, [orders]);

  const statsLedger = ledger.totals;

  /* ------------------------------------------------------------
     Acciones UI
     ------------------------------------------------------------ */
  const resetLedger = () => {
    const empty = {
      processedOrderIds: {},
      totals: { simples: 0, dobles: 0, triples: 0, botellas: 0, amount: 0 },
      entries: [],
    };
    setLedger(empty);
    saveLedger(empty);
  };

  const markAsCompleted = (orderId) => {
    setOrders((prev) => {
      const updated = prev.map((o) => (o.id === orderId ? { ...o, completed: true } : o));
      localStorage.setItem('alcohol_orders', JSON.stringify(updated));
      return updated;
    });
  };

  // Al eliminar completados:
  // 1) registramos la firma de cada pedido como tombstone
  // 2) guardamos el set en localStorage (se replica a otras pestañas)
  // 3) filtramos de la lista y de localStorage para esta pestaña
  const clearCompletedOrders = () => {
    setOrders((prev) => {
      const toRemove = prev.filter((o) => o.completed);
      if (toRemove.length) {
        const newTombs = new Set(tombstones);
        for (const o of toRemove) newTombs.add(orderSignature(o));
        setTombstones(newTombs);
        saveTombstones(newTombs);
      }
      const updated = prev.filter((o) => !o.completed);
      localStorage.setItem('alcohol_orders', JSON.stringify(updated));
      return updated;
    });
  };

  /* ------------------------------------------------------------
     PDF: tabla con Ítem, Precio, Fecha, Hora, Tipo y TOTAL
     ------------------------------------------------------------ */
  const downloadPDF = () => {
    const doc = new jsPDF('p', 'pt');
    const ahora = new Date();
    const fechaDescarga = ahora.toLocaleString();

    // Encabezado
    doc.setFontSize(16);
    doc.text('Historial de Ventas - Bar', 40, 40);
    doc.setFontSize(10);
    doc.text(`Generado: ${fechaDescarga}`, 40, 58);

    // Ordenamos por fecha para una lectura natural
    const entries = Array.isArray(ledger.entries) ? ledger.entries : [];
    const sorted = [...entries].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    const rows = sorted.map((e) => [
      e.name,
      `$ ${money(e.price)}`,
      fecha(e.timestamp),
      hora(e.timestamp),
      tipoHumano(e),
    ]);

    const total = sorted.reduce((acc, e) => acc + (Number(e.price) || 0), 0);
 autoTable(doc, {
   startY: 80,
   head: [['Ítem', 'Precio', 'Fecha', 'Hora', 'Tipo']],
   body: rows,
   styles: { fontSize: 10, cellPadding: 6 },
   headStyles: { fillColor: [60, 80, 255] },
   columnStyles: {
     0: { cellWidth: 220 },
     1: { halign: 'right', cellWidth: 80 },
     2: { cellWidth: 90 },
     3: { cellWidth: 70 },
     4: { cellWidth: 90 },
   },
   foot: [[
     { content: 'TOTAL', colSpan: 1 },
     { content: `$ ${money(total)}`, styles: { halign: 'right' } },
     { content: '', colSpan: 3 }
   ]],
   footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
   didParseCell: (data) => {
  if (data.section === 'foot' && data.column.index > 1) data.cell.text = [''];
 },
 });

    doc.save(`ventas_bar_${ahora.toISOString().slice(0, 10)}.pdf`);
  };

  /* ------------------------------------------------------------
     Render
     ------------------------------------------------------------ */
  return (
    <div className="bartender-interface">
      <h1>Pedidos del Bar</h1>

      <div className="pedidos-grid">
        {/* Pendientes */}
        <div className="columna">
          <h2>Pedidos Pendientes ({orders.filter((o) => !o.completed).length})</h2>
          {orders
            .filter((o) => !o.completed)
            .map((order, idx) => (
              <div key={`${order.id}-pend-${idx}`} className="pedido-card pendiente">
                <div className="pedido-header">
                  <strong>Mesa {order.table ?? order.mesa}</strong>
                  <span>{order.time ?? new Date(order.timestamp).toLocaleTimeString()}</span>
                </div>
                <div className="pedido-items">
                  {order.items?.map((item, i) => (
                    <div key={`${order.id}-item-${i}`}>
                      {item.name} {item.size ? `(${item.size})` : ''}
                      {item.category === 'botellas' ? ` x${item.quantity || 1}` : ''}
                    </div>
                  ))}
                </div>
                <button className="btn-completar" onClick={() => markAsCompleted(order.id)}>
                  Marcar como Completado
                </button>
              </div>
            ))}
        </div>

        {/* Completados */}
        <div className="columna">
          <h2>Pedidos Completados ({orders.filter((o) => o.completed).length})</h2>
          {orders
            .filter((o) => o.completed)
            .map((order, idx) => (
              <div key={`${order.id}-comp-${idx}`} className="pedido-card completado">
                <div className="pedido-header">
                  <strong>Mesa {order.table ?? order.mesa}</strong>
                  <span>{order.time ?? new Date(order.timestamp).toLocaleTimeString()}</span>
                </div>
                <div className="pedido-items">
                  {order.items?.map((item, i) => (
                    <div key={`${order.id}-compitem-${i}`}>
                      {item.name} {item.size ? `(${item.size})` : ''}
                      {item.category === 'botellas' ? ` x${item.quantity || 1}` : ''}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          {orders.some((o) => o.completed) && (
            <button className="btn-eliminar" onClick={clearCompletedOrders}>
              Eliminar todas las completadas
            </button>
          )}
        </div>
      </div>

      <button onClick={() => setShowStats((s) => !s)}>
        {showStats ? 'Ocultar resumen de ventas' : 'Mostrar resumen de ventas'}
      </button>

      {showStats && (
        <div className="stats">
          <h3>Resumen de Ventas (Histórico)</h3>
          <p>Simples: {statsLedger.simples}</p>
          <p>Dobles: {statsLedger.dobles}</p>
          <p>Triples: {statsLedger.triples}</p>
          <p>Botellas: {statsLedger.botellas}</p>
          <p><strong>Total: ${statsLedger.amount.toFixed(2)}</strong></p>

          <button style={{ marginTop: 12 }} onClick={downloadPDF}>
            Descargar historial en PDF
          </button>

          <details style={{ marginTop: 12 }}>
            <summary>Comparar con ventas abiertas (en vivo)</summary>
            <p>Simples (vivo): {statsLive.simples}</p>
            <p>Dobles (vivo): {statsLive.dobles}</p>
            <p>Triples (vivo): {statsLive.triples}</p>
            <p>Botellas (vivo): {statsLive.botellas}</p>
            <p><strong>Total (vivo): ${statsLive.total.toFixed(2)}</strong></p>
          </details>

          <button className="remove-button" style={{ marginTop: 12 }} onClick={resetLedger}>
            Reiniciar resumen histórico
          </button>
        </div>
      )}
    </div>
  );
};

export default Bartender;
