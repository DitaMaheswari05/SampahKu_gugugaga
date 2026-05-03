import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import ProductManagement from './pages/ProductManagement';
import PetugasScan from './pages/PetugasScan';
import { logout } from './services/auth.service';
import './App.css';

// Placeholder for Home page
const Home = () => (
  <div style={{ padding: '2rem', textAlign: 'center' }}>
    <h1>SampahKu Dashboard</h1>
    <p>Selamat datang di aplikasi SampahKu!</p>
  </div>
);

const Navbar = () => {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  if (!token) return null;

  return (
    <nav style={{ padding: '1rem 2rem', background: '#1B2A1B', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>SampahKu</div>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <Link to="/" style={{ color: 'white', textDecoration: 'none' }}>Home</Link>
        {role === 'BRAND' && <Link to="/products" style={{ color: 'white', textDecoration: 'none' }}>Produk</Link>}
        {role === 'PETUGAS' && <Link to="/scan" style={{ color: 'white', textDecoration: 'none' }}>Scan QR</Link>}
        <button 
          onClick={logout}
          style={{ background: '#FF9800', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          Logout
        </button>
      </div>
    </nav>
  );
};

import Home from './pages/Homepage';
import Dashboard from './pages/Dashboard';
import Logout from './pages/Logout';
import './App.css';

function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/products" element={<ProductManagement />} />
        <Route path="/scan" element={<PetugasScan />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/logout" element={<Logout />} />
        <Route path="/" element={<Home />} />
        {/* Redirect any unknown route to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;