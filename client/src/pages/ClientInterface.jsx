// Cambios claves marcados con // 👈
import React, { useState, useEffect } from 'react';
import TableSelector from '../components/TableroSelector';
import MenuItem from '../components/MenuItem';
import Cart from '../components/cart';
import ListaCuentas from '../components/ListaCuentas';

import { fetchMenuItems, placeNewOrder, initializeSocketConnection } from '../services/socket';
import { guardarCuentaEnJSON, eliminarCuentaDeJSON, cargarCuentasDesdeJSON } from '../services/cuentaService';

const dedupById = (arr) => Array.from(new Map((arr || []).map(o => [o.id, o])).values());

export default function ClientInterface() {
  const [selectedTable, setSelectedTable] = useState(null);
  const [cart, setCart] = useState([]);
  const [menu, setMenu] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [orders, setOrders] = useState([]);
  const [showTotalModal, setShowTotalModal] = useState(false);

  useEffect(() => {
    const loadMenu = () => fetchMenuItems().then(d => setMenu(dedupById(d))).catch(console.error);
    loadMenu();

    // Solo restaurante
    const saved = localStorage.getItem('restaurant_orders');        
    if (saved) { try { setOrders(JSON.parse(saved)); } catch {} }

    // Cuentas SOLO de restaurante
    cargarCuentasDesdeJSON('cuentas_restaurante').then((cuentas = []) => {
      setOrders(prev => {
        const merged = dedupById([...prev, ...cuentas]);
        localStorage.setItem('restaurant_orders', JSON.stringify(merged));
        return merged;
      });
    });

    // conexión con el ws
    initializeSocketConnection((payload) => {
      if (payload === '__MENU_UPDATED__') return loadMenu();

      const incoming = Array.isArray(payload) ? payload : [];
      if (!incoming.length) return;

      // Reemplazar para que no reaparezcan viejos
      setOrders(dedupById(incoming));
      localStorage.setItem('restaurant_orders', JSON.stringify(incoming));
    });
  }, []);

  useEffect(() => {
    localStorage.setItem('restaurant_orders', JSON.stringify(orders));
  }, [orders]);

  const addToCart = (item, excludedIngredients = []) => {
    setCart(prev => [...prev, { ...item, excludedIngredients, id: Date.now() + Math.random().toString(36).slice(2,9) }]);
  };
  const removeFromCart = (id) => setCart(prev => prev.filter(i => i.id !== id));

  const placeOrder = async () => {
    if (!selectedTable || cart.length === 0) return;
    const order = {
      id: `${Date.now()}`,
      table: selectedTable,
      items: cart,
      timestamp: new Date().toISOString(),
      status: 'pending',
      source: 'kitchen'
    };
    const saved = await placeNewOrder(order);                 
    await guardarCuentaEnJSON(saved, 'cuentas_restaurante');  
    setOrders(prev => dedupById([...prev, saved]));
    setCart([]);
    alert('¡Pedido enviado!');
  };

  const closeTableAccount = async (mesa) => {
    if (!window.confirm(`¿Cerrar cuenta de la mesa ${mesa}?`)) return;
    const mesaOrders = orders.filter(o => o.table === mesa);
    for (const o of mesaOrders) await eliminarCuentaDeJSON(o.id, 'cuentas_restaurante'); //Accede a las cuentas solo del restaurante
    const updated = orders.filter(o => o.table !== mesa);
    setOrders(updated);
    localStorage.setItem('restaurant_orders', JSON.stringify(updated));
    alert(`Cuenta de mesa ${mesa} cerrada.`);
  };

  return (
    <div className="client-interface">
      <h1>Menú del Restaurante</h1>

      <input className="search-input" placeholder="Buscar platillo o bebida..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} />

      <TableSelector tables={[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]} selectedTable={selectedTable} onSelect={setSelectedTable} />

      <div className="interface-content-res">
        <div className="menu-container">
          {menu
            .filter(item =>
              item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              (item.category || '').toLowerCase().includes(searchTerm.toLowerCase())
            )
            .map((item, idx) => (<MenuItem key={`${item.id}-${idx}`} item={item} onAdd={addToCart} />))}
        </div>

        <div className="cart-container">
          <Cart items={cart} onRemove={removeFromCart} onPlaceOrder={placeOrder} isTableSelected={!!selectedTable} />
          <button className="show-total-button" onClick={() => setShowTotalModal(true)}>Ver Cuentas Activas</button>
        </div>
      </div>

      {showTotalModal && (
        <div className="modal">
          <div className="modal-content">
            <ListaCuentas orders={orders} onCerrarMesa={closeTableAccount} />
            <button className="cerrar-btn" onClick={() => setShowTotalModal(false)}>Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
}
