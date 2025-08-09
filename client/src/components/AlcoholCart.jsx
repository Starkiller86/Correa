import React from 'react';

const AlcoholCart = ({ cart, onRemove, onPlaceOrder, isTableSelected, onUpdateCart }) => {
  const handleQuantityChange = (itemId, newQuantity) => {
    const quantity = parseInt(newQuantity);
    if (isNaN(quantity) || quantity <= 0) return;

    onUpdateCart(itemId, quantity);
  };

  const total = cart.reduce((sum, item) => {
    const basePrice = typeof item.basePrice === 'number' ? item.basePrice : item.price || 0;
    let price = basePrice;

    if (item.category?.toLowerCase() === 'tragos') {
      if (item.size === 'doble') price = basePrice * 2;
      else if (item.size === 'triple') price = basePrice * 3;
    } else if (item.category?.toLowerCase() === 'botellas') {
      price = basePrice * item.quantity;
    }

    return sum + price;
  }, 0).toFixed(2);

  return (
    <div className="alcohol-cart">
      <h2>Carrito</h2>
      {cart.length === 0 ? (
        <p>El carrito está vacío</p>
      ) : (
        <ul>
          {cart.map((item, index) => {
            const basePrice = typeof item.basePrice === 'number' ? item.basePrice : item.price || 0;
            const isTrago = item.category?.toLowerCase() === 'tragos';
            const isBotella = item.category?.toLowerCase() === 'botellas';
            const itemPrice = isTrago
              ? item.size === 'doble'
                ? basePrice * 2
                : item.size === 'triple'
                ? basePrice * 3
                : basePrice
              : basePrice * item.quantity;

            return (
              <li key={index} className="alcohol-cart-item">
                <div>
                  <strong>{item.name}</strong>{' '}
                  {isTrago && `(${item.size})`} - ${itemPrice.toFixed(2)}
                </div>

                {isBotella && (
                  <input
                    type="number"
                    value={item.quantity}
                    min="1"
                    onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                    style={{ width: '60px', marginRight: '10px' }}
                  />
                )}

                <button onClick={() => onRemove(item.id)}>Quitar</button>
              </li>
            );
          })}
        </ul>
      )}
      <div className="cart-total">
        <p>Total: ${total}</p>
        <button onClick={onPlaceOrder} disabled={!isTableSelected || cart.length === 0}>
          Enviar pedido
        </button>
      </div>
    </div>
  );
};

export default AlcoholCart;
