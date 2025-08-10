// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import PrivateRoute from "./components/PrivateRoute";
import Login from "./pages/Login";
import ClientInterface from "./pages/ClientInterface";
import Bar from "./pages/Bar";
import KitchenInterface from "./pages/KitchenInterface";
import Bartender from "./pages/Bartender";
import MenuAdmin from "./pages/MenuAdmin";
import AlcoholAdmin from "./pages/AlcoholAdmin";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          path="/client"
          element={
            <PrivateRoute allowedRoles={["mesero-cocina"]}>
              <ClientInterface />
            </PrivateRoute>
          }
        />
        <Route
          path="/bar"
          element={
            <PrivateRoute allowedRoles={["mesero-bar"]}>
              <Bar />
            </PrivateRoute>
          }
        />
        <Route
          path="/kitchen"
          element={
            <PrivateRoute allowedRoles={["cocinero"]}>
              <KitchenInterface />
            </PrivateRoute>
          }
        />
        <Route
          path="/bartender"
          element={
            <PrivateRoute allowedRoles={["bartender"]}>
              <Bartender />
            </PrivateRoute>
          }
        />
        <Route
          path="/menu-admin"
          element={
            <PrivateRoute allowedRoles={["admin-comida"]}>
              <MenuAdmin />
            </PrivateRoute>
          }
        />
        <Route
          path="/alcohol-admin"
          element={
            <PrivateRoute allowedRoles={["admin-bebidas"]}>
              <AlcoholAdmin />
            </PrivateRoute>
          }
        />

        {/* Redirección por defecto */}
        <Route path="*" element={<Login />} />
      </Routes>
    </Router>
  );
}

export default App;
