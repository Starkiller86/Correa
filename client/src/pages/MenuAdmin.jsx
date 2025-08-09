import React, { useEffect, useState } from 'react';
import { notifyMenuUpdated, initializeSocketConnection } from '../services/socket'; // WS restaurante

const baseUrl = `http://${window.location.hostname}:3001`;

const emptyForm = {
  id: '',
  name: '',
  price: '',
  ingredients: '',
  category: '',
};

export default function MenuAdmin() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  // 👇 **AQUÍ** abrimos el WS (dentro del componente)
  useEffect(() => {
    // No necesito handlers, solo abrir la conexión para poder emitir notifyMenuUpdated
    initializeSocketConnection();
  }, []);

  const loadItems = async () => {
    try {
      const res = await fetch(`${baseUrl}/dishes`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('No pude cargar items:', e);
      setItems([]); // evita que queden “viejos” en pantalla
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setIsEditing(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const toPayload = () => {
    const price = parseFloat(form.price || '0');
    const ingredients = form.ingredients
      ? form.ingredients.split(',').map(s => s.trim()).filter(Boolean)
      : [];
    return {
      id: form.id?.toString().trim() || undefined,
      name: form.name.trim(),
      price: isNaN(price) ? 0 : price,
      ingredients,
      category: form.category.trim() || 'Otros'
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return alert('El nombre es obligatorio');
    setLoading(true);
    try {
      const payload = toPayload();
      if (!payload.name) return alert('El nombre es obligatorio');
      if (payload.price < 0) return alert('El precio no puede ser negativo');

      if (isEditing) {
        await fetch(`${baseUrl}/dishes/${form.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch(`${baseUrl}/dishes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      await loadItems();
      resetForm();

      // 🔔 Avisar a todos que el menú cambió (Client/Kitchen harán refetch)
      notifyMenuUpdated();
    } catch (err) {
      console.error('Error guardando platillo:', err);
      alert('No se pudo guardar el platillo');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item) => {
    setIsEditing(true);
    setForm({
      id: item.id?.toString() || '',
      name: item.name || '',
      price: item.price?.toString() || '',
      ingredients: (item.ingredients || []).join(', '),
      category: item.category || '',
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este platillo?')) return;
    try {
      await fetch(`${baseUrl}/dishes/${id}`, { method: 'DELETE' });
      await loadItems();
      if (isEditing && form.id === String(id)) resetForm();

      // 🔔 Avisar a todos que el menú cambió
      notifyMenuUpdated();
    } catch (err) {
      console.error('Error eliminando:', err);
      alert('No se pudo eliminar');
    }
  };

  return (
    <div className="admin-page">
      <h1>Administrar Menú (Platillos)</h1>

      <form className="admin-form" onSubmit={handleSubmit}>
        {isEditing && (
          <div className="form-row">
            <label>ID</label>
            <input name="id" value={form.id} onChange={handleChange} readOnly />
          </div>
        )}
        <div className="form-row">
          <label>Nombre</label>
          <input name="name" value={form.name} onChange={handleChange} placeholder="Ej. Hamburguesa Clásica" />
        </div>
        <div className="form-row">
          <label>Precio</label>
          <input name="price" type="number" step="0.01" value={form.price} onChange={handleChange} placeholder="Ej. 89.00" />
        </div>
        <div className="form-row">
          <label>Ingredientes (separados por coma)</label>
          <input name="ingredients" value={form.ingredients} onChange={handleChange} placeholder="Pan, Carne, Lechuga..." />
        </div>
        <div className="form-row">
          <label>Categoría</label>
          <input name="category" value={form.category} onChange={handleChange} placeholder="Platos Fuertes / Bebidas / ..." />
        </div>
        <div className="form-actions">
          <button type="submit" disabled={loading}>
            {isEditing ? 'Actualizar' : 'Crear'}
          </button>
          {isEditing && (
            <button type="button" className="secondary" onClick={resetForm}>
              Cancelar
            </button>
          )}
        </div>
      </form>

      <h2>Platillos</h2>
      <div className="admin-list">
        {items.map(item => (
          <div key={item.id} className="admin-card">
            <div className="admin-card__main">
              <strong>{item.name}</strong>
              <span className="badge">{item.category}</span>
            </div>
            <div>Precio: ${Number(item.price).toFixed(2)}</div>
            {item.ingredients?.length > 0 && (
              <div className="muted">Ing: {item.ingredients.join(', ')}</div>
            )}
            <div className="admin-card__actions">
              <button onClick={() => handleEdit(item)}>Editar</button>
              <button className="danger" onClick={() => handleDelete(item.id)}>Eliminar</button>
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="muted">No hay platillos aún.</p>}
      </div>
    </div>
  );
}
