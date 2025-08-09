import React, { useMemo } from 'react';
import Cuenta from './cuenta';

/**
 * Lista de cuentas activas por mesa:
 * - Agrupa por mesa soportando 'table' (nuevo) y 'mesa' (legacy).
 * - Soporta arrays 'items' (nuevo) y 'pedidos' (legacy).
 * - Calcula total considerando 'quantity' si existe (bar).
 * - Usa keys robustas en todos los map para evitar warnings.
 */
const ListaCuentas = ({ orders = [], onCerrarMesa }) => {
  // 1) Agrupar por mesa (table || mesa)
  const byTable = useMemo(() => {
    const map = new Map();
    for (const o of orders) {
      const mesa = (o.table ?? o.mesa);
      if (mesa == null) continue;
      const k = String(mesa);
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(o);
    }
    return map;
  }, [orders]);

  // 2) Listado de mesas ordenado asc
  const mesas = useMemo(
    () => Array.from(byTable.keys()).sort((a, b) => Number(a) - Number(b)),
    [byTable]
  );

  // 3) Helpers compatibles para items/pedidos
  const getPedidosMesa = (mesaKey) => {
    const ords = byTable.get(String(mesaKey)) || [];
    return ords.flatMap(o => o.items || o.pedidos || []);
  };

  const getTotalMesa = (mesaKey) => {
    const items = getPedidosMesa(mesaKey).filter(Boolean);
    const total = items.reduce((sum, it) => {
      const price = Number(it.price || 0);
      const qty = Number(it.quantity || 1);     // ✅ considera quantity si viene del bar
      return sum + price * qty;
    }, 0);
    return total.toFixed(2);
  };

  return (
    <div className="lista-cuentas">
      {mesas.length === 0 && <p>No hay cuentas activas.</p>}

      {mesas.map((mesaKey) => {
        const pedidos = getPedidosMesa(mesaKey);
        const total = getTotalMesa(mesaKey);

        return (
          <div key={`cuenta-mesa-${mesaKey}`} className="cuenta-wrapper">{/* ✅ key robusta */}
            <h2 className="titulo-mesa">Mesa {mesaKey}</h2>
            <Cuenta
              mesa={mesaKey}
              pedidos={pedidos}
              total={total}
              onCerrarCuenta={() => onCerrarMesa?.(Number(mesaKey))}
            />
          </div>
        );
      })}
    </div>
  );
};

export default ListaCuentas;
