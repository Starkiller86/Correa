import React from 'react';
import { BrowserRouter as Router, Routes, Route} from 'react-router-dom';
import ClientInterface from './pages/ClientInterface';
import KitchenInterface from './pages/KitchenInterface';
import Bar from './pages/Bar';
import Bartender from './pages/Bartender';
import MenuAdmin from './pages/MenuAdmin';    
import AlcoholAdmin from './pages/AlcoholAdmin'; 
import './styles.css'; // Estilos globales

function App() {
  return (
    <Router>
      <div className="app-container">
        {/* Barra de navegación */}
        <nav className="app-nav">
          <h1>Sistema para realizar pedidos</h1>
          <div className="nav-links">
            {/*<Link to="/client">Cliente</Link>
            <Link to="/kitchen">Cocina</Link>
            <Link to="/bar">Bar</Link>
            <Link to="/bartender">Bartender</Link>*/}
          </div>
        </nav>

        {/* Rutas */}
        <Routes>
          <Route path="/client" element={<ClientInterface />} />
          <Route path="/kitchen" element={<KitchenInterface />} />
          <Route path="/bar" element={<Bar />} />
          <Route path="/bartender" element={<Bartender />} />
          <Route path="/admin/menu" element={<MenuAdmin />} />
          <Route path="/admin/bar" element={<AlcoholAdmin />} />

          {/* Ruta por defecto redirige al cliente*/}
          <Route path="/" element={<ClientInterface />} />
        </Routes>

        {/* Footer */}
        <footer className="app-footer">
          <p>Sistema desarrollado con sufrimiento</p>
        </footer>
      </div>
    </Router>
  );
}

export default App;
