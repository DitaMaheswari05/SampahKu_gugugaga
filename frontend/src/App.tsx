import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import ProductManagement from './pages/ProductManagement';
import './App.css';

// Placeholder for Home page
const Home = () => (
  <div style={{ padding: '2rem', textAlign: 'center' }}>
    <h1>SampahKu Dashboard</h1>
    <p>Selamat datang di aplikasi SampahKu!</p>
  </div>
);

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/products" element={<ProductManagement />} />
        <Route path="/" element={<Home />} />
        {/* Redirect any unknown route to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
