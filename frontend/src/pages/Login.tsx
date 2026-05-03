import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login, getMe, loginWithGoogle } from '../services/auth.service';
import styles from './Login.module.css';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('KONSUMEN'); 
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showToast, setShowToast] = useState(false); 
  const navigate = useNavigate();

  useEffect(() => {
    if (localStorage.getItem('token')) {
      const role = localStorage.getItem('role');
      if (role === 'BRAND') navigate('/products');
      else if (role === 'PETUGAS') navigate('/scan');
      else navigate('/');
    }
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const data = await login(email, password);
      
      if (data.data && data.data.session) {
        localStorage.setItem('token', data.data.session.access_token);
        localStorage.setItem('user', JSON.stringify(data.data.user));
        
        try {
          const profileData = await getMe();
          if (profileData.data && profileData.data.role) {
            const role = profileData.data.role;
            localStorage.setItem('role', role);
            if (role === 'BRAND') navigate('/products');
            else if (role === 'PETUGAS') navigate('/scan');
            else navigate('/');
          } else {
             navigate('/');
          }
        } catch(e) {
          navigate('/');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat login');
    } finally {
      setIsLoading(false);
    }
  };

  // Login Google Real
  const handleGoogleLogin = async () => {
    setError('');
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setError(err.message || 'Gagal login dengan Google');
    }
  };

  return (
    <div className={styles.mobileContainer}>
      {showToast && (
        <div className={styles.toast}>
          Login Berhasil! Mengalihkan ke Dashboard...
        </div>
      )}

      <div className={styles.card}>
        <div className={styles.logoHeader}>
          <div className={styles.logoIcon}>
            <img src="../public/assets/logo_sampahku.png" alt="Icon" />
          </div>
          <span className={styles.logoText}>Sampahku</span>
        </div>

        <h1 className={styles.title}>Selamat Datang Kembali</h1>
        <p className={styles.subtitle}>Masuk untuk melanjutkan perjalanan circular Anda</p>

        <div className={styles.tabs}>
          <div className={`${styles.tab} ${role === 'KONSUMEN' ? styles.tabActive : ''}`} onClick={() => setRole('KONSUMEN')}>
            Konsumen
          </div>
          <div className={`${styles.tab} ${role === 'PETUGAS' ? styles.tabActive : ''}`} onClick={() => setRole('PETUGAS')}>
            Petugas
          </div>
          <div className={`${styles.tab} ${role === 'BRAND' ? styles.tabActive : ''}`} onClick={() => setRole('BRAND')}>
            Produsen
          </div>
        </div>

        {error && <div className={styles.errorMessage}>{error}</div>}

        <form onSubmit={handleLogin} className={styles.form}>
          <div className={styles.inputGroup}>
            <label className={styles.inputLabel}>Email</label>
            <div className={styles.inputWrapper}>
              <svg className={styles.inputIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
              </svg>
              <input type="email" className={styles.inputField} placeholder="nama@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.inputLabel}>Password</label>
            <div className={styles.inputWrapper}>
              <svg className={styles.inputIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <input type="password" className={styles.inputField} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
          </div>

          <button type="submit" className={styles.submitBtn} disabled={isLoading}>
            {isLoading ? 'Memproses...' : 'Masuk'}
          </button>
        </form>

        <div className={styles.dividerContainer}>
          <div className={styles.dividerLine}></div>
          <span className={styles.dividerText}>Atau masuk dengan</span>
          <div className={styles.dividerLine}></div>
        </div>

        {/* Tombol Login Google */}
        <button className={styles.googleBtn} type="button" onClick={handleGoogleLogin}>
          <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Masuk dengan Google
        </button>

        <div className={styles.footerPrompt}>
          belum punya akun? <Link to="/register" className={styles.registerLink}>Daftar</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;