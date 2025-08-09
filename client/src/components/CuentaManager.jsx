import React, { useEffect, useState, useMemo } from 'react';
import Cuenta from './cuenta';
import {
  cargarCuentasDesdeJSON,
  eliminarCuentaDeJSON
} from '../services/cuentaService';

/**
 * Manager de cuentas:
 * - Carga la colección 'cuentas' desde JSON Server.
 * - Soporta tanto el esquema nuevo (table/items/status/timestamp)
 *   como el legacy (mesa/pedidos/total).
 * - Al cerrar, elimina por id de la colección y actualiza estado.
 * - Pasa a <Cuenta> props normalizadas (mesa, pedidos, total).
 */
const CuentaManager = () => {
  const [cuentasActivas, setCuentasActivas] = useState([]);

  useEffect(() => {
    cargarCuentasDesdeJSON().then((data) => {
      setCuentasActivas(Array.isArray(data) ? data : []);
    });
  }, []);

  const handleCerrarCuenta = async (id) => {
    const confirmar = window.confirm('¿Seguro que deseas cerrar esta cuenta? Esta acción no se puede deshacer.');
    if (!confirmar) return;

    await eliminarCuentaDeJSON(id);
    setCuentasActivas(prev => prev.filter(c => c.id !== id));
  };

  // Normaliza cada cuenta a la forma que espera <Cuenta />
  const cuentasNormalizadas = useMemo(() => {
    return (cuentasActivas || []).map(c => {
      const mesa = c.table ?? c.mesa ?? '—';
      const pedidos = (c.items || c.pedidos || []).filter(Boolean);

      // Total: suma precio * quantity (si existe)
      const total = pedidos.reduce((sum, it) => {
        const price = Number(it?.price || 0);
        const qty = Number(it?.quantity || 1);
        return sum + price * qty;
      }, 0);

      return {
        // Mantén id original para acciones (cerrar cuenta)
        _id: c.id,
        mesa,
        pedidos,
        total: total.toFixed(2),
      };
    });
  }, [cuentasActivas]);

  return (
    <div>
      {cuentasNormalizadas.length === 0 && <p>No hay cuentas activas.</p>}

      {cuentasNormalizadas.map((cuenta) => (
        <Cuenta
          key={`cuenta-${cuenta._id}`}                      
          mesa={cuenta.mesa}
          pedidos={cuenta.pedidos}
          total={cuenta.total}
          onCerrarCuenta={() => handleCerrarCuenta(cuenta._id)}
        />
      ))}
    </div>
  );
};

export default CuentaManager;
