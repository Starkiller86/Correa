import React, { useState } from 'react';

const AlcoholItem = ({ item, onAdd, showSizeOptions, showQuantityInput }) => {
  const [size, setSize] = useState('simple');
  const [quantity, setQuantity] = useState(1);

  const handleAddToCart = () => {
    onAdd({ ...item, size, quantity });
  };

  return (
    <div className="alcohol-item-container">
      <h3>{item.name}</h3>
      <p>Precio base: ${item.price.toFixed(2)}</p>

      {showSizeOptions && (
        <label>
          Tamaño:
          <select value={size} onChange={(e) => setSize(e.target.value)}>
            <option value="simple">Simple</option>
            <option value="doble">Doble</option>
            <option value="triple">Triple</option>
          </select>
        </label>
      )}

      {showQuantityInput && (
        <label>
          Cantidad:
          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
          />
        </label>
      )}

      <button className="add-button" onClick={handleAddToCart}>
        Agregar al carrito
      </button>
    </div>
  );
};

export default AlcoholItem;
