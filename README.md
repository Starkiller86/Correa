# Sistema de Gestión para Restaurante y Bar

Aplicación web en **React** para la administración de pedidos, cuentas y menús en un entorno de restaurante y bar.  
Incluye interfaces separadas para **meseros**, **cocina**, **bartender** y **administradores**.

## 📋 Características principales

- **Gestión de pedidos** en tiempo real vía WebSocket.
- **Interfaces por rol**:
  - Mesero (restaurante y bar).
  - Cocina.
  - Bartender.
  - Administrador de comidas.
  - Administrador de bebidas.
- **Carritos interactivos** con cálculo automático de precios, tamaños y cantidades.
- **Control de cuentas** por mesa, con opción de cierre.
- **Historial de ventas** y generación de **PDF** para el bar.
- **Compatibilidad con esquema de datos nuevo y legacy**.
- **Filtrado y búsqueda** de productos en el menú.
- **Soporte de opciones e ingredientes** (selección o exclusión).
- **Persistencia local** mediante `localStorage` y sincronización entre pestañas.
- **API JSON Server** para datos de prueba.

## 🛠️ Tecnologías utilizadas

- **Frontend**: React + Hooks
- **Estado y comunicación**: WebSockets, `localStorage`
- **Estilos**: CSS modular
- **Servidor de datos**: JSON Server (modo desarrollo)
- **Generación de PDF**: jsPDF + autoTable

## 📂 Estructura de carpetas

client/
├── src/
│ ├── components/ # Componentes reutilizables (Carrito, Menú, Selector de Mesa, etc.)
│ ├── pages/ # Interfaces por rol
│ ├── services/ # Lógica de conexión WS y API
│ ├── config/ # Configuración de rutas por rol
│ └── assets/ # Imágenes y recursos estáticos


## 🚀 Instalación y ejecución

1. **Clonar el repositorio**
   ```bash
   git clone <url-del-repo>
   cd <carpeta-del-proyecto>

2. **Instalar dependencias**
    ```bash
    npm install

3. **Iniciar servidor**
    ```bash
    cd server
    node server.js

4. **Iniciar servidor de datos (JSON Server)**
    ```bash
    cd server
    json-server --watch db.json --port 3001

5. **Iniciar app**
    ```bash
    cd client
    npm start

6. Servidor WebSocket

Debe estar activo para comunicación en tiempo real.
Asegúrate de que el backend escuche en los puertos configurados (ej. 8080 para cocina y 8090 para bar).

🖥️ Interfaces disponibles
/login → Login según rol.

/client → Mesero de restaurante.

/bar → Mesero del bar.

/kitchen → Cocina.

/bartender → Bartender.

/menu-admin → Administración de comidas.

/alcohol-admin → Administración de bebidas.

⚙️ Configuración de roles
El archivo client/src/config/roleRoutes.js define las rutas según el rol del usuario:

const roleRoutes = {
  "mesero-cocina": "/client",
  "mesero-bar": "/bar",
  "cocinero": "/kitchen",
  "bartender": "/bartender",
  "admin-comida": "/menu-admin",
  "admin-bebidas": "/alcohol-admin"
};

📡 Comunicación en tiempo real
El sistema usa WebSockets para:
Actualizar menús en vivo.
Sincronizar pedidos y estados entre dispositivos.

Eventos especiales:
__MENU_UPDATED__ → Actualiza menú.
notifyMenuUpdated() y notifyAlcoholUpdated() → Emiten cambios.

📑 Notas de desarrollo
El sistema está diseñado para tolerar datos legacy y nuevos.
Los IDs y claves están manejados para evitar colisiones.
Algunas funciones clave incluyen:
dedupById() para evitar duplicados.
Normalización de cuentas y pedidos.
Sincronización de estado con localStorage.

## Roles y contraseñas (entorno de prueba)

| Usuario       | Contraseña | Rol            |
|---------------|------------|----------------|
| meseroCocina  | 1234       | mesero-cocina  |
| meseroBar     | 5678       | mesero-bar     |
| cocinero      | abcd       | cocinero       |
| bartender     | fghi       | bartender      |
| adminComida   | 1234+      | admin-comida   |
| adminBebidas  | 5678+      | admin-bebidas  |


✍️ Autores: González Becerra Karen Alejandra y Hernández Salinas Mario Alberto. Estudiantes de Ing. en TICS e Innovación Digital en UTEQ

📅 Última actualización: 2025-08-09