import React from 'react';

const Cuenta = ({ mesa, pedidos, total, onCerrarCuenta }) => {
  return (
    <div className="cuenta-container">
      <div className="cuenta-header">
        <h2>Cuenta - Mesa {mesa}</h2>
        <button onClick={onCerrarCuenta} className="cerrar-cuenta-btn">
          Cerrar Cuenta
        </button>
      </div>
      
      <div className="pedidos-list">
        {pedidos.map((pedido, index) => (
          <div key={index} className="pedido-item">
            <span className="pedido-nombre">{pedido.name}</span>
            <span className="pedido-precio">
              ${Number(pedido.price).toFixed(2)}
            </span>
            {pedido.excludedIngredients?.length > 0 && (
              <div className="excluidos">
                <small>Sin: {pedido.excludedIngredients.join(', ')}</small>
              </div>
            )}
          </div>
        ))}
      </div>
      
      <div className="total-section">
        <span>Total:</span>
        <span className="total-amount">${Number(total).toFixed(2)}</span>
      </div>
    </div>
  );
};

export default Cuenta;
