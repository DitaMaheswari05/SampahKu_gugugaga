import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { getMe, logout } from '../services/auth.service';
import styles from '../styles/Logout.module.css';

const Logout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [userName, setUserName] = useState<string>('Memuat...');

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Cek data lokal sebagai nilai awal yang cepat
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          if (user?.user_metadata?.name) {
            setUserName(user.user_metadata.name);
          } else if (user?.name) {
            setUserName(user.name);
          }
        }

        // Fetch data asli dari database via backend
        const response = await getMe();
        if (response.data) {
          const name = response.data.name || 'Pengguna';
          setUserName(name);
        }
      } catch (error) {
        console.error('Gagal membaca data pengguna dari database:', error);
        setUserName('Pengguna');
      }
    };

    fetchUserData();
  }, []);

  if (!location.state || !location.state.fromButton) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const handleCancel = () => {
    navigate(-1);
  };

  return (
    <div className={styles.mobileContainer}>
      <div className={styles.modalCard}>
        {/* Tombol X (Tutup) */}
        <button className={styles.closeBtn} onClick={handleCancel}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        {/* Icon Logout Lingkaran Merah */}
        <div className={styles.iconWrapper}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#E7000B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
        </div>

        <h2 className={styles.title}>Keluar dari Akun?</h2>
        <p className={styles.subtitle}>
          Apakah Anda yakin ingin keluar dari akun <strong>{userName}</strong>?
        </p>

        <div className={styles.buttonGroup}>
          <button className={styles.btnCancel} onClick={handleCancel}>
            Batal
          </button>
          <button className={styles.btnLogout} onClick={handleLogout}>
            Ya, Keluar
          </button>
        </div>
      </div>
    </div>
  );
};

export default Logout;