// src/services/cuentaService.js
const host = window.location.hostname;
const baseUrl = `http://${host}:3001`;

/** Colección por defecto para compat (pero ya NO la usaremos) */
const DEF = 'cuentas_restaurante';

export async function cargarCuentasDesdeJSON(collection = DEF) {
  const r = await fetch(`${baseUrl}/${collection}`);
  return r.ok ? r.json() : [];
}
export async function guardarCuentaEnJSON(cuenta, collection = DEF) {
  const r = await fetch(`${baseUrl}/${collection}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuenta),
  });
  return r.ok ? r.json() : cuenta;
}
export async function eliminarCuentaDeJSON(id, collection = DEF) {
  try {
    const r = await fetch(`${baseUrl}/${collection}/${id}`, { method: 'DELETE' });
    return r.ok;
  } catch { return false; }
}
