import React from 'react';
// json-server --watch db.json --port 3001 iniciar la base de datos
const cart = ({ items, onRemove, onPlaceOrder, isTableSelected }) => {
  return (
    <div className="cart-container-res">
      <h2>Tu Pedido</h2>
      
      {items.length === 0 ? (
        <p className="empty-cart-message">No hay items en el carrito</p>
      ) : (
        <>
          <ul className="cart-items-list">
            {items.map(item => {
              const price = Number(item.price) || 0;
              const hasExclusions = Array.isArray(item.excludedIngredients) && item.excludedIngredients.length > 0;

              // Mostrar elección si existe (p.ej. Bebidas -> "Coca Cola")
              // El nombre visible será "Nombre" y abajo "Opción: Coca Cola"
              return (
                <li key={item.id} className="cart-item">
                  <div className="item-info">
                    <span className="item-name">{item.name}</span>
                    <span className="item-price">${price.toFixed(2)}</span>
                  </div>

                  {item.choice && (
                    <div className="excluded-ingredients">
                      <span>Opción: {item.choice}</span>
                    </div>
                  )}

                  {hasExclusions && (
                    <div className="excluded-ingredients">
                      <span>Sin: {item.excludedIngredients.join(', ')}</span>
                    </div>
                  )}

                  <button 
                    onClick={() => onRemove(item.id)}
                    className="remove-button"
                  >
                    Eliminar
                  </button>
                </li>
              );
            })}
          </ul>

          <button
            onClick={onPlaceOrder}
            disabled={!isTableSelected}
            className={`place-order-button ${!isTableSelected ? 'disabled' : ''}`}
          >
            {isTableSelected ? 'Enviar a Cocina' : 'Selecciona una mesa primero'}
          </button>
        </>
      )}
    </div>
  );
};

export default cart;
