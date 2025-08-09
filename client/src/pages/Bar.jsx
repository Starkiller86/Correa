// Cambios clave: WS 8090, colecciones/LS separados y reemplazo de lista
import React, { useState, useEffect } from 'react';
import TableSelector from '../components/TableroSelector';
import AlcoholItem from '../components/AlcoholItem';
import AlcoholCart from '../components/AlcoholCart';
import ListaCuentas from '../components/ListaCuentas';
import { initBarSocket, fetchAlcoholItems, placeBarOrder } from '../services/BarSocket';
import { guardarCuentaEnJSON, eliminarCuentaDeJSON, cargarCuentasDesdeJSON } from '../services/cuentaService';

const dedupById = (arr) => Array.from(new Map((arr || []).map(o => [o.id, o])).values());

export default function Bar() {
  const [selectedTable, setSelectedTable] = useState(null);
  const [cart, setCart] = useState([]);
  const [menu, setMenu] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [orders, setOrders] = useState([]);
  const [showTotalModal, setShowTotalModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    const loadAlcohol = () => fetchAlcoholItems().then(setMenu).catch(console.error);
    loadAlcohol();

    // Solo bar
    const saved = localStorage.getItem('bar_orders');              // 👈 clave separada
    if (saved) { try { setOrders(JSON.parse(saved)); } catch {} }

    // Cuentas SOLO del bar
    cargarCuentasDesdeJSON('cuentas_bar').then((cuentas = []) => {
      setOrders(prev => {
        const merged = dedupById([...prev, ...cuentas]);
        localStorage.setItem('bar_orders', JSON.stringify(merged));
        return merged;
      });
    });

    // WS Bar
    initBarSocket(
      (ordersFromWS = []) => {
        if (!Array.isArray(ordersFromWS)) return;
        // Reemplazar (no acumular)
        setOrders(dedupById(ordersFromWS));
        localStorage.setItem('bar_orders', JSON.stringify(ordersFromWS));
      },
      () => loadAlcohol()
    );
  }, []);

  useEffect(() => {
    localStorage.setItem('bar_orders', JSON.stringify(orders));
  }, [orders]);

  const addToCart = (item) => {
    const basePrice = Number(item.price) || 0;
    let price = basePrice;
    const cat = (item.category || '').toLowerCase();
    if (cat === 'tragos') {
      if (item.size === 'doble') price = basePrice * 2;
      else if (item.size === 'triple') price = basePrice * 3;
    } else if (cat === 'botellas') {
      price = basePrice * (item.quantity || 1);
    }
    setCart(prev => [...prev, { ...item, basePrice, price, id: Date.now() + Math.random().toString(36).slice(2, 9), size: item.size || 'simple', quantity: item.quantity || 1 }]);
  };
  const removeFromCart = (id) => setCart(prev => prev.filter(i => i.id !== id));
  const updateCartQuantity = (id, quantity) => {
    const qty = Math.max(1, Number(quantity) || 1);
    setCart(prev => prev.map(it => (it.id === id && (it.category || '').toLowerCase() === 'botellas')
      ? { ...it, quantity: qty, price: it.basePrice * qty }
      : it));
  };

  const placeOrder = async () => {
    if (!selectedTable || cart.length === 0) return;
    const order = {
      id: `${Date.now()}`, table: selectedTable, items: cart,
      timestamp: new Date().toISOString(), status: 'pending', source: 'bar'
    };
    try {
      const saved = await placeBarOrder(order);                   // 👈 WS 8090
      await guardarCuentaEnJSON(saved, 'cuentas_bar');            // 👈 colección del bar
      setOrders(prev => dedupById([...prev, saved]));
      setCart([]);
      setShowConfirmModal(true);
    } catch (e) {
      console.error('Error al enviar pedido del bar:', e);
      alert('No se pudo enviar el pedido del bar.');
    }
  };

  const closeTableAccount = async (mesa) => {
    if (!window.confirm(`¿Cerrar cuenta de mesa ${mesa}?`)) return;
    const mesaOrders = orders.filter(o => o.table === mesa);
    for (const order of mesaOrders) await eliminarCuentaDeJSON(order.id, 'cuentas_bar'); // 👈
    const updated = orders.filter(o => o.table !== mesa);
    setOrders(updated);
    localStorage.setItem('bar_orders', JSON.stringify(updated));
    alert(`Cuenta de mesa ${mesa} cerrada.`);
  };

  return (
    <div className="bar-interface">
      <h1>Bar - Bebidas Alcohólicas</h1>

      <input className="search-input" placeholder="Buscar bebida..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} />

      <div className="interface-content">
        <div className="table-selector">
          <TableSelector tables={[1,2,3,4,5,6,7,8,9,10]} selectedTable={selectedTable} onSelect={setSelectedTable} />
        </div>

        <div className="menu-y-carrito">
          <div className="menu-container">
            {menu.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()))
                 .map(i => (
                  <AlcoholItem key={i.id}
                    item={i}
                    onAdd={addToCart}
                    showSizeOptions={(i.category || '').toLowerCase() === 'tragos'}
                    showQuantityInput={(i.category || '').toLowerCase() === 'botellas'}
                  />
                 ))}
          </div>

          <div className="cart-container">
            <AlcoholCart cart={cart} onRemove={removeFromCart} onPlaceOrder={placeOrder} onUpdateCart={updateCartQuantity} isTableSelected={!!selectedTable} />
            <button className="show-total-button" onClick={() => setShowTotalModal(true)}>Ver Cuentas Activas</button>
          </div>
        </div>
      </div>

      {showTotalModal && (
        <div className="modal">
          <div className="modal-content">
            <ListaCuentas orders={orders} onCerrarMesa={closeTableAccount} mostrarTipoTrago />
            <button className="cerrar-btn" onClick={() => setShowTotalModal(false)}>Cerrar</button>
          </div>
        </div>
      )}

      {showConfirmModal && (
        <div className="modal">
          <div className="modal-content">
            <h3>✅ Pedido enviado correctamente al bartender</h3>
            <button className="cerrar-btn" onClick={() => setShowConfirmModal(false)}>Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
}
