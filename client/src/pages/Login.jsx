import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/Frame1.png"; // Ajusta la ruta según tu carpeta


// Mapeo de roles → rutas
const roleRoutes = {
  "mesero-cocina": "/client",
  "mesero-bar": "/bar",
  "cocinero": "/kitchen",
  "bartender": "/bartender",
  "admin-comida": "/menu-admin",
  "admin-bebidas": "/alcohol-admin",
};

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!username || !password) {
      alert("Por favor ingresa usuario y contraseña");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("http://localhost:8080/login", {
        // 👈 Usa el puerto del backend unificado
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Credenciales inválidas");
        setLoading(false);
        return;
      }

      // Guardar token y rol en localStorage
      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.role);

      // Redirigir según rol
      const route = roleRoutes[data.role];
      if (route) {
        navigate(route);
      } else {
        alert("Rol no reconocido");
      }
    } catch (error) {
      console.error("Error en login:", error);
      alert("Error en el servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container" style={styles.container}>
      <img src={logo} alt="Los Correa" style={styles.logo} />
      <h2 style={styles.title}>Iniciar Sesión</h2>
      <input
        style={styles.input}
        type="text"
        placeholder="Correo"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <input
        style={styles.input}
        type="password"
        placeholder="Contraseña"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button style={styles.button} onClick={handleLogin} disabled={loading}>
        {loading ? "Entrando..." : "Entrar"}
      </button>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: 300,
    margin: "100px auto",
    padding: 20,
    background: "#fff",
    borderRadius: 8,
    boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  title: { textAlign: "center" },
  input: {
    padding: "8px",
    border: "1px solid #ccc",
    borderRadius: 4,
  },
  button: {
    padding: "10px",
    background: "#4A220F",
    color: "#fff",
    border: "none",
    borderRadius: 4,
    cursor: "pointer",
  },

};
