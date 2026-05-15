import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register, RegisterPayload } from '../services/auth.service';
import { ROLES, UserRole } from '../constants/roles';
import { getHomeRouteByRole } from '../constants/routes';
import styles from '../styles/Register.module.css';

const Register: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole>(ROLES.KONSUMEN);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const navigate = useNavigate();

  React.useEffect(() => {
    const token = localStorage.getItem('token');
    const storedRole = localStorage.getItem('role');
    if (token && storedRole) {
      navigate(getHomeRouteByRole(storedRole), { replace: true });
    }
  }, [navigate]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Konfirmasi password tidak cocok.');
      return;
    }
    setIsLoading(true);
    try {
      const payload: RegisterPayload = { name, email, password, role };
      await register(payload);
      setShowToast(true);
      setTimeout(() => { setShowToast(false); navigate('/login'); }, 2000);
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan tidak terduga');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.mobileContainer}>
      {showToast && <div className={styles.toast}>Pendaftaran Berhasil! Mengalihkan ke Login...</div>}

      <div className={styles.card}>
        <div className={styles.logoHeader}>
          <div className={styles.logoIcon}><img src="/assets/logo_sampahku.png" alt="Icon" /></div>
          <span className={styles.logoText}>Sampahku</span>
        </div>

        <h1 className={styles.title}>Buat Akun Baru</h1>
        <p className={styles.subtitle}>Daftar untuk memulai perjalanan circular Anda</p>

        <div className={styles.tabs}>
          {[ROLES.KONSUMEN, ROLES.ADMIN_TPS, ROLES.BRAND].map((r) => (
            <div
              key={r}
              className={`${styles.tab} ${role === r ? styles.tabActive : ''}`}
              onClick={() => setRole(r)}
            >
              {r === ROLES.KONSUMEN ? 'Konsumen' : r === ROLES.ADMIN_TPS ? 'Admin TPS' : 'Produsen'}
            </div>
          ))}
        </div>

        {error && <div className={styles.errorMessage}>{error}</div>}

        <form onSubmit={handleRegister} className={styles.form}>
          <div className={styles.inputGroup}>
            <label className={styles.inputLabel}>Nama Lengkap</label>
            <div className={styles.inputWrapper}>
              <svg className={styles.inputIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
              <input type="text" className={styles.inputField} placeholder="nama lengkap" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
          </div>

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
              <input type="password" className={styles.inputField} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.inputLabel}>Konfirmasi Password</label>
            <div className={styles.inputWrapper}>
              <svg className={styles.inputIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <input type="password" className={styles.inputField} placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} />
            </div>
          </div>

          <button type="submit" className={styles.submitBtn} disabled={isLoading}>
            {isLoading ? 'Memproses...' : 'Daftar'}
          </button>
        </form>

        <div className={styles.footerPrompt}>
          sudah punya akun?{' '}
          <Link to="/login" className={styles.loginLink}>Masuk</Link>
        </div>
      </div>
    </div>
  );
};

export default Register;