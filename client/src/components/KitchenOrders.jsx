import React from 'react';

/**
 * Listado de órdenes para cocina:
 * - Muestra pendientes/completadas.
 * - Tolera 'items' (nuevo) y 'pedidos' (legacy).
 * - Keys robustas para tarjetas de orden e ítems.
 * - Muestra size/choice y quantity si existen (bar).
 */
const KitchenOrders = ({ title, orders = [], onCompleteOrder, showCompleteButton = false }) => {
  const normalizeItems = (order) => (order.items || order.pedidos || []);

  return (
    <div className="kitchen-orders">
      <h2 className="orders-title">
        {title} ({orders.length})
      </h2>

      {orders.length === 0 ? (
        <p className="no-orders">No hay {String(title || '').toLowerCase()}</p>
      ) : (
        <div className="orders-list">
          {orders.map((order) => {
            const mesa = order.table ?? order.mesa ?? '—';
            const when = order.timestamp ? new Date(order.timestamp).toLocaleTimeString() : '';
            const items = normalizeItems(order);

            return (
              <div
                key={`${order.id}-${order.timestamp || ''}`}          // ✅ key robusta para la orden
                className={`order-card ${order.status || ''}`}
              >
                <div className="order-header">
                  <span className="order-table">Mesa {mesa}</span>
                  <span className="order-time">{when}</span>
                </div>

                <ul className="order-items">
                  {items.map((item, idx) => {
                    if (!item) return null;
                    // Nombre mostrado: considera choice/size (bebidas) y quantity (si existe)
                    const baseName = item.choice ? `${item.name}: ${item.choice}` : item.name;
                    const withSize = item.size ? `${baseName} (${item.size})` : baseName;
                    const qty = item.quantity ? ` x${item.quantity}` : '';
                    const line = `${withSize}${qty}`;

                    return (
                      <li
                        key={`${order.id}-${item.id || `${item.name}-${idx}`}`} // ✅ key robusta para ítems
                        className="order-item"
                      >
                        <span className="item-name">{line}</span>
                        {Array.isArray(item.excludedIngredients) && item.excludedIngredients.length > 0 && (
                          <span className="excluded"> (Sin: {item.excludedIngredients.join(', ')})</span>
                        )}
                      </li>
                    );
                  })}
                </ul>

                {showCompleteButton && typeof onCompleteOrder === 'function' && (
                  <button
                    onClick={() => onCompleteOrder(order.id)}
                    className="complete-button"
                    type="button"
                  >
                    Marcar como Completado
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default KitchenOrders;
