// src/pages/KitchenInterface.jsx
import React, { useEffect, useRef, useState } from 'react';
import KitchenOrders from '../components/KitchenOrders';
import { initializeSocketConnection, markOrderAsCompleted } from '../services/socket';

// Claves para persistir estado local
const LS_COMPLETED_IDS = 'kitchen_completed_ids_v1';     // pedidos marcados como completados en esta UI
const LS_HIDDEN_COMPLETED = 'kitchen_hidden_completed_v1'; // completados ocultados con "Eliminar completados"

const loadIdSet = (key) => {
  try { return new Set(JSON.parse(localStorage.getItem(key) || '[]')); }
  catch { return new Set(); }
};
const saveIdSet = (key, set) => {
  localStorage.setItem(key, JSON.stringify([...set]));
};

const KitchenInterface = () => {
  const [pendingOrders, setPendingOrders] = useState([]);
  const [completedOrders, setCompletedOrders] = useState([]);

  // Persistentes entre refrescos
  const completedIdsRef = useRef(loadIdSet(LS_COMPLETED_IDS));
  const hiddenCompletedRef = useRef(loadIdSet(LS_HIDDEN_COMPLETED));

  useEffect(() => {
    // Suscribe al socket
    initializeSocketConnection((payload) => {
      if (payload === '__MENU_UPDATED__') return;

      const ordersArr = Array.isArray(payload) ? payload : [];

      // 1) Si un id está en "completedIdsRef", lo forzamos a 'completed'
      const normalized = ordersArr.map(o =>
        completedIdsRef.current.has(o.id) ? { ...o, status: 'completed' } : o
      );

      // 2) Construimos listas reemplazando por lo recién llegado
      const nextPending = normalized.filter(o => o.status === 'pending');

      const nextCompleted = normalized
        .filter(o => o.status === 'completed')
        // 3) Si un completado fue "eliminado de la vista", no lo mostramos
        .filter(o => !hiddenCompletedRef.current.has(o.id));

      setPendingOrders(nextPending);
      setCompletedOrders(nextCompleted);
    });
  }, []);

  const handleCompleteOrder = async (orderId) => {
    try {
      // Marca en backend
      await markOrderAsCompleted(orderId);

      // Optimista: sácalo de pendientes
      setPendingOrders(prev => prev.filter(o => o.id !== orderId));

      // Guarda override local para que nunca vuelva como 'pending' tras refrescar
      completedIdsRef.current.add(orderId);
      saveIdSet(LS_COMPLETED_IDS, completedIdsRef.current);
    } catch (error) {
      console.error('Error al completar pedido:', error);
    }
  };

  const handleClearCompleted = () => {
    if (!completedOrders.length) return;
    const ok = window.confirm('¿Eliminar de la vista todos los pedidos completados?');
    if (!ok) return;

    // Oculta de la vista y persiste los IDs como "hidden"
    for (const o of completedOrders) hiddenCompletedRef.current.add(o.id);
    saveIdSet(LS_HIDDEN_COMPLETED, hiddenCompletedRef.current);
    setCompletedOrders([]);
  };

  const handleRefresh = () => {
    // Limpia solo el filtro de ocultos (para volver a ver los completados)
    hiddenCompletedRef.current.clear();
    saveIdSet(LS_HIDDEN_COMPLETED, hiddenCompletedRef.current);
    alert('Filtro de completados eliminado. Se mostrarán de nuevo en la próxima actualización.');
  };

  return (
    <div className="kitchen-interface">
      <div className="kitchen-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="kitchen-title">Pedidos en Cocina</h1>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={handleRefresh}>Refrescar</button>
          <button onClick={handleClearCompleted}>Eliminar completados</button>
        </div>
      </div>

      <div className="orders-container">
        <KitchenOrders
          title="Pedidos Pendientes"
          orders={pendingOrders}
          onCompleteOrder={handleCompleteOrder}
          showCompleteButton
        />
        <KitchenOrders
          title="Pedidos Completados"
          orders={completedOrders}
        />
      </div>
    </div>
  );
};

export default KitchenInterface;
