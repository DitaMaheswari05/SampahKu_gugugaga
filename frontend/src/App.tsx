import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import ProductManagement from './pages/ProductManagement';
import PetugasScan from './pages/PetugasScan';
import PetugasDashboard from './pages/PetugasDashboard';
import Home from './pages/Homepage';
import Dashboard from './pages/Dashboard';
import DashboardCompany from './pages/Dashboard_Company';
import Logout from './pages/Logout';
import KonsumenScan from './pages/KonsumenScan';
import DetailSampah from './pages/DetailSampah';
import AdminTpsDashboard from './pages/AdminTpsDashboard';
import { ROLES } from './constants/roles';
import { getHomeRouteByRole } from './constants/routes';
import ManajemenPetugas from './pages/ManajemenPetugas';

/**
 * Proteksi route berdasarkan status login dan role.
 * Menambahkan role baru cukup di ROLE_HOME_ROUTES di constants/routes.ts,
 * komponen ini tidak perlu dimodifikasi (Open/Closed Principle).
 */
const ProtectedRoute = ({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles?: string[];
}) => {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return <Navigate to={getHomeRouteByRole(role)} replace />;
  }

  return <>{children}</>;
};

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
          path="/brand/dashboard"
          element={
            <ProtectedRoute allowedRoles={[ROLES.BRAND]}>
              <DashboardCompany />
            </ProtectedRoute>
          }
        />
        <Route
          path="/products"
          element={
            <ProtectedRoute allowedRoles={[ROLES.BRAND]}>
              <ProductManagement />
            </ProtectedRoute>
          }
        />

        {/* Protected Routes - Role: PETUGAS */}
        <Route
          path="/scan"
          element={
            <ProtectedRoute allowedRoles={[ROLES.PETUGAS]}>
              <PetugasScan />
            </ProtectedRoute>
          }
        />
        <Route
          path="/petugas/dashboard"
          element={
            <ProtectedRoute allowedRoles={[ROLES.PETUGAS]}>
              <PetugasDashboard />
            </ProtectedRoute>
          }
        />

        {/* Protected Routes - Role: ADMIN_TPS */}
        <Route
          path="/admin-tps/dashboard"
          element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN_TPS]}>
              <AdminTpsDashboard />
            </ProtectedRoute>
          }
        />
        {/* Tambahkan Route baru ini */}
        <Route
          path="/admin-tps/manajemen-petugas"
          element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN_TPS]}>
              <ManajemenPetugas />
            </ProtectedRoute>
          }
        />

        {/* Protected Routes - Role: KONSUMEN */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={[ROLES.KONSUMEN]}>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tambah-sampah"
          element={
            <ProtectedRoute allowedRoles={[ROLES.KONSUMEN]}>
              <KonsumenScan />
            </ProtectedRoute>
          }
        />
        <Route
          path="/detail-sampah/:id"
          element={
            <ProtectedRoute allowedRoles={[ROLES.KONSUMEN]}>
              <DetailSampah />
            </ProtectedRoute>
          }
        />

        {/* Protected Routes - Semua role yang sudah login */}
        <Route
          path="/logout"
          element={
            <ProtectedRoute>
              <Logout />
            </ProtectedRoute>
          }
        />

        {/* Redirect unknown routes ke home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;