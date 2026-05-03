import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import ProductManagement from './pages/ProductManagement';
import PetugasScan from './pages/PetugasScan';
import Home from './pages/Homepage';
import Dashboard from './pages/Dashboard';
import Logout from './pages/Logout';
import KonsumenScan from './pages/KonsumenScan';
import './App.css';

// Komponen Wrapper untuk memproteksi Route berdasarkan status login dan role
const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) => {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  if (!token) {
    return <Navigate to="/login" replace />;
  }
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    // Arahkan ke dashboard masing-masing sesuai role yang valid
    if (role === 'BRAND') return <Navigate to="/products" replace />;
    if (role === 'PETUGAS') return <Navigate to="/scan" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// Kalau mau ubah route untuk role tertentu, tinggal ubah disini
function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<Home />} />

        {/* Protected Routes - Role: BRAND */}
        <Route 
          path="/products" 
          element={
            <ProtectedRoute allowedRoles={['BRAND']}>
              <ProductManagement />
            </ProtectedRoute>
          } 
        />

        {/* Protected Routes - Role: PETUGAS */}
        <Route 
          path="/scan" 
          element={
            <ProtectedRoute allowedRoles={['PETUGAS']}>
              <PetugasScan />
            </ProtectedRoute>
          } 
        />

        {/* Protected Routes - Role: KONSUMEN */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute allowedRoles={['KONSUMEN']}>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/tambah-sampah" 
          element={
            <ProtectedRoute allowedRoles={['KONSUMEN']}>
              <KonsumenScan />
            </ProtectedRoute>
          } 
        />

        {/* Protected Routes - Semua role yang sudah login bisa akses */}
        <Route 
          path="/logout" 
          element={
            <ProtectedRoute>
              <Logout />
            </ProtectedRoute>
          } 
        />

        {/* Redirect any unknown route to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;