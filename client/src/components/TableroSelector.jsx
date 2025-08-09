import React from 'react';

/**
 * Selector de mesa:
 * - Permite seleccionar/deseleccionar una mesa.
 * - Usa keys robustas tipo "mesa-<n>" para evitar warnings por claves duplicadas.
 * - Tolera arrays con números o strings, y aunque vengan repetidos no crashea (keys únicas).
 */
const TableroSelector = ({ tables = [], selectedTable, onSelect }) => {
  const handleSelect = (table) => {
    if (selectedTable === table) {
      onSelect(null);       // Deselecciona si ya está seleccionada
    } else {
      onSelect(table);      // Selecciona nueva mesa
    }
  };

  // Normaliza la lista por si vienen duplicados (Set) y la ordena
  const mesasUnicas = Array.from(new Set(tables)).sort((a, b) => Number(a) - Number(b));

  return (
    <div className="table-selector">
      <h2>Seleccione Mesa:</h2>
      <div className="table-buttons">
        {mesasUnicas.map((table) => (
          <button
            key={`mesa-${table}`}                                
            className={String(selectedTable) === String(table) ? 'selected' : ''}
            onClick={() => handleSelect(table)}
            type="button"
          >
            Mesa {table}
          </button>
        ))}
      </div>
    </div>
  );
};

export default TableroSelector;
