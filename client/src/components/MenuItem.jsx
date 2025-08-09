import React, { useState } from 'react';

/**
 * Tarjeta de menú:
 * - Si la categoría es "Bebidas", permite UNA elección (choice) entre los "ingredients".
 * - En otras categorías, permite excluir múltiples ingredientes.
 * - Usa keys de ingredientes estables (el propio string) para evitar colisiones.
 * - Envía al carrito un objeto con 'choice' (solo bebidas) y 'excludedIngredients' (solo comida).
 */
const MenuItem = ({ item, onAdd }) => {
  const [excludedIngredients, setExcludedIngredients] = useState([]);
  const [selectedChoice, setSelectedChoice] = useState(null);

  // Detecta bebidas (singular/plural)
  const isBebida = ['bebida', 'bebidas'].includes((item.category || '').toLowerCase());
  // Hay "opciones" si ingredients trae elementos
  const hasChoices = Array.isArray(item.ingredients) && item.ingredients.length > 0;

  const handleToggleIngredient = (ingredient) => {
    if (isBebida) {
      // Selección única para bebidas
      setSelectedChoice(prev => (prev === ingredient ? null : ingredient));
    } else {
      // Exclusión múltiple para otros platillos
      setExcludedIngredients(prev =>
        prev.includes(ingredient)
          ? prev.filter(i => i !== ingredient)
          : [...prev, ingredient]
      );
    }
  };

  const handleAdd = () => {
    const payload = {
      ...item,
      price: Number(item.price),                               // normaliza precio a número
      choice: isBebida ? (selectedChoice || null) : null,      // Bebidas: guarda elección (si la hay)
      excludedIngredients: isBebida ? [] : excludedIngredients // Comida: guarda exclusiones
    };
    // Conserva firma onAdd(item, excluded) para compatibilidad con tu Cart
    onAdd(payload, isBebida ? [] : excludedIngredients);
  };

  return (
    <div className="menu-item-resta">
      <h3>
        <span>{item.name}</span>
        <span>${Number(item.price).toFixed(2)}</span>
      </h3>

      <div className="ingredients">
        {(item.ingredients || []).map((ingredient) => {
          const isSelected = isBebida && selectedChoice === ingredient;
          const isExcluded = !isBebida && excludedIngredients.includes(ingredient);
          return (
            <button
              key={`ingr-${item.id}-${ingredient}`}            
              type="button"
              className={`ingredient-btn ${isSelected ? 'selected' : ''} ${isExcluded ? 'excluded' : ''}`}
              onClick={() => handleToggleIngredient(ingredient)}
            >
              {ingredient}
            </button>
          );
        })}
      </div>

      <button
        className="add-button"
        onClick={handleAdd}
        // Solo deshabilita si es bebida, hay opciones y no han elegido
        disabled={isBebida && hasChoices && !selectedChoice}
        type="button"
      >
        Añadir al Carrito
      </button>
    </div>
  );
};

export default MenuItem;
