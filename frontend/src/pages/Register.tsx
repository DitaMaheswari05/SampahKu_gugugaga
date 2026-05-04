import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../services/auth.service';
import styles from '../styles/Register.module.css';

const Register: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('KONSUMEN');
  const [stationType, setStationType] = useState('');
  
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showToast, setShowToast] = useState(false); // State untuk Toast Notification

  const navigate = useNavigate();

  React.useEffect(() => {
    if (localStorage.getItem('token')) {
      const role = localStorage.getItem('role');
      if (role === 'BRAND') navigate('/products');
      else if (role === 'PETUGAS') navigate('/scan');
      else navigate('/');
    }
  }, [navigate]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validasi Konfirmasi Password
    if (password !== confirmPassword) {
      setError('Konfirmasi password tidak cocok.');
      return;
    }

    setIsLoading(true);

    try {
      const payload: any = { name, email, password, role };
      
      if (role === 'PETUGAS') {
        if (!stationType) {
          throw new Error('Tipe petugas (Station Type) harus dipilih.');
        }
        payload.station_type = stationType;
      }

      await register(payload);
      
      // Tampilkan Toast Notifikasi Sukses
      setShowToast(true);
      
      // Tunggu 2 detik, lalu pindah ke halaman Login
      setTimeout(() => {
        setShowToast(false);
        navigate('/login');
      }, 2000);

    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan tidak terduga');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = (selectedRole: string) => {
    setRole(selectedRole);
    setStationType('');
  };

  return (
    <div className={styles.mobileContainer}>
      
      {/* Toast Notification */}
      {showToast && (
        <div className={styles.toast}>
          Pendaftaran Berhasil! Mengalihkan ke Login...
        </div>
      )}

      <div className={styles.card}>
        <div className={styles.logoHeader}>
          <div className={styles.logoIcon}>
            <img src="/assets/logo_sampahku.png" alt="Icon" />
          </div>
          <span className={styles.logoText}>Sampahku</span>
        </div>

        <h1 className={styles.title}>Buat Akun Baru</h1>
        <p className={styles.subtitle}>Daftar untuk memulai perjalanan circular Anda</p>

        {/* Custom Tabs untuk Role */}
        <div className={styles.tabs}>
          <div 
            className={`${styles.tab} ${role === 'KONSUMEN' ? styles.tabActive : ''}`}
            onClick={() => handleRoleChange('KONSUMEN')}
          >
            Konsumen
          </div>
          <div 
            className={`${styles.tab} ${role === 'PETUGAS' ? styles.tabActive : ''}`}
            onClick={() => handleRoleChange('PETUGAS')}
          >
            Petugas
          </div>
          <div 
            className={`${styles.tab} ${role === 'BRAND' ? styles.tabActive : ''}`}
            onClick={() => handleRoleChange('BRAND')}
          >
            Produsen
          </div>
        </div>

        {error && <div className={styles.errorMessage}>{error}</div>}

        <form onSubmit={handleRegister} className={styles.form}>
          <div className={styles.inputGroup}>
            <label className={styles.inputLabel}>Nama Lengkap</label>
            <div className={styles.inputWrapper}>
              {/* User Icon */}
              <svg className={styles.inputIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
              <input
                type="text"
                className={styles.inputField}
                placeholder="nama lengkap"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.inputLabel}>Email</label>
            <div className={styles.inputWrapper}>
              {/* Mail Icon */}
              <svg className={styles.inputIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
              </svg>
              <input
                type="email"
                className={styles.inputField}
                placeholder="nama@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.inputLabel}>Password</label>
            <div className={styles.inputWrapper}>
              {/* Lock Icon */}
              <svg className={styles.inputIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <input
                type="password"
                className={styles.inputField}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.inputLabel}>Konfirmasi Password</label>
            <div className={styles.inputWrapper}>
              {/* Lock Icon */}
              <svg className={styles.inputIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <input
                type="password"
                className={styles.inputField}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
          </div>

          {/* Conditional Dropdown dari Backend Lama */}
          {role === 'PETUGAS' && (
            <div className={`${styles.inputGroup} ${styles.conditionalField}`}>
              <label className={styles.inputLabel}>Tipe Fasilitas / Petugas</label>
              <div className={styles.inputWrapper}>
                <select
                  className={styles.selectField}
                  value={stationType}
                  onChange={(e) => setStationType(e.target.value)}
                  required
                >
                  <option value="" disabled>-- Pilih Tipe --</option>
                  <option value="GEROBAK">Petugas Gerobak / Keliling</option>
                  <option value="TPS">Petugas TPS</option>
                  <option value="TRANSPORT">Supir Truk / Transportasi</option>
                  <option value="BANK_SAMPAH">Petugas Bank Sampah</option>
                  <option value="RECYCLER">Fasilitas Daur Ulang</option>
                  <option value="TPA">Petugas TPA (Landfill)</option>
                </select>
              </div>
            </div>
          )}

          <button type="submit" className={styles.submitBtn} disabled={isLoading}>
            {isLoading ? 'Memproses...' : 'Daftar'}
          </button>
        </form>

        <div className={styles.footerPrompt}>
          sudah punya akun?{' '}
          <Link to="/login" className={styles.loginLink}>
            Masuk
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;