import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMe } from '../services/auth.service';
import styles from '../styles/Header.module.css';

const Header: React.FC = () => {
  const navigate = useNavigate();
  // State untuk menyimpan nama pengguna yang ditarik dari database
  const [userName, setUserName] = useState<string>('Memuat...');
  const [userRole, setUserRole] = useState<string | null>(null); // State untuk role
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false); // State untuk toggle dropdown hamburger

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Cek data lokal sebagai nilai awal yang cepat
        const userStr = localStorage.getItem('user');
        const roleStr = localStorage.getItem('role');
        
        if (roleStr) {
          setUserRole(roleStr);
        }

        if (userStr) {
          const user = JSON.parse(userStr);
          if (user?.user_metadata?.name) {
            setUserName(user.user_metadata.name);
          } else if (user?.name) {
            setUserName(user.name);
          }
        }
        
        const response = await getMe();
        if (response.data) {
          // Gunakan name dari tabel profiles (prioritas utama), fallback ke metadata auth
          const name = response.data.name || response.data.user_metadata?.name || 'Pengguna';
          setUserName(name);
          
          if (response.data.role) {
             setUserRole(response.data.role);
          }
        }
      } catch (error) {
        console.error('Gagal mengambil data pengguna dari database:', error);
        setUserName('Pengguna');
      }
    };
    fetchUserData();
  }, []);

  // Fungsi untuk mengarahkan ke halaman konfirmasi logout dengan membawa state
  const handleLogoutClick = () => {
    navigate('/logout', { state: { fromButton: true } });
  };

  // Styling seragam untuk list di dropdown menu
  const menuItemStyle = {
    padding: '12px 16px',
    textAlign: 'left' as const,
    background: 'none',
    border: 'none',
    borderBottom: '1px solid var(--border-color)',
    cursor: 'pointer',
    fontFamily: "'Poppins', sans-serif",
    fontSize: '13px'
  };

  return (
    <header className={styles.header}>
      <div 
        className={styles.leftSection} 
        onClick={() => navigate('/')} 
        style={{ cursor: 'pointer' }}
      >
        <div className={styles.logoBox}>
          <img src="/assets/logo_sampahku.png" alt="SampahKu" />
        </div>
        <h1 className={styles.logoText}>SampahKu</h1>
      </div>
      
      <div className={styles.rightSection}>
        <div className={styles.userInfo}>
          <span className={styles.greetingText}>
            Halo, <span className={styles.userName}>{userName}</span>
          </span>
        </div>

        {/* Menu Hamburger Universal untuk Semua Role */}
        <div style={{ position: 'relative' }}>
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)} 
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            aria-label="Menu"
          >
            {/* Hamburger Icon */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-main)' }}>
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>

          {/* Dropdown Menu */}
          {isMenuOpen && (
            <div style={{
              position: 'absolute',
              top: '120%',
              right: 0,
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
              minWidth: '220px',
              zIndex: 50,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}>
              
              {/* Menu Role: BRAND */}
              {userRole === 'BRAND' && (
                <>
                  <button 
                    onClick={() => { setIsMenuOpen(false); navigate('/brand/dashboard'); }} 
                    style={menuItemStyle}
                  >
                    Dashboard
                  </button>
                  <button 
                    onClick={() => { setIsMenuOpen(false); navigate('/products'); }} 
                    style={menuItemStyle}
                  >
                    Manajemen Produk
                  </button>
                </>
              )}

              {/* Menu Role: KONSUMEN */}
              {userRole === 'KONSUMEN' && (
                <>
                  <button 
                    onClick={() => { setIsMenuOpen(false); navigate('/dashboard'); }} 
                    style={menuItemStyle}
                  >
                    Dashboard
                  </button>
                  <button 
                    onClick={() => { setIsMenuOpen(false); navigate('/tambah-sampah'); }} 
                    style={menuItemStyle}
                  >
                    Scan atau Tambah Sampah
                  </button>
                </>
              )}

              {/* Menu Role: PETUGAS */}
              {userRole === 'PETUGAS' && (
                <>
                  <button 
                    onClick={() => { setIsMenuOpen(false); navigate('/petugas/dashboard'); }} 
                    style={menuItemStyle}
                  >
                    Dashboard
                  </button>
                  <button 
                    onClick={() => { setIsMenuOpen(false); navigate('/scan'); }} 
                    style={menuItemStyle}
                  >
                    Update Status Sampah
                  </button>
                </>
              )}

              {/* Tombol Logout (Semua Role) */}
              <button 
                onClick={() => { setIsMenuOpen(false); handleLogoutClick(); }} 
                style={{ ...menuItemStyle, borderBottom: 'none', color: '#D4183D', fontWeight: '600' }}
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;