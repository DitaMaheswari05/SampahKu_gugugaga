import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../services/auth.service';
import styles from './Register.module.css';

const Register: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('KONSUMEN');
  const [stationType, setStationType] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
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

      // Automatically navigate to login page upon success
      navigate('/login');
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan tidak terduga');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset station type when role changes
  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRole(e.target.value);
    setStationType('');
  };

  return (
    <div className={styles.registerContainer}>
      <div className={styles.registerCard}>
        <div className={styles.logoContainer}>
          <h1>SampahKu</h1>
          <p>Bergabunglah Bersama Kami</p>
        </div>

        {error && <div className={styles.errorMessage}>{error}</div>}

        <form onSubmit={handleRegister}>
          <div className={styles.formGroup}>
            <label htmlFor="name">Nama Lengkap</label>
            <input
              type="text"
              id="name"
              className={styles.inputField}
              placeholder="Masukkan nama lengkap Anda"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              className={styles.inputField}
              placeholder="Masukkan email Anda"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              className={styles.inputField}
              placeholder="Minimal 6 karakter"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="role">Daftar Sebagai</label>
            <select
              id="role"
              className={styles.selectField}
              value={role}
              onChange={handleRoleChange}
              required
            >
              <option value="KONSUMEN">Konsumen (Masyarakat)</option>
              <option value="PETUGAS">Petugas Pengelola Sampah</option>
              <option value="BRAND">Brand / Perusahaan</option>
            </select>
          </div>

          {role === 'PETUGAS' && (
            <div className={`${styles.formGroup} ${styles.conditionalField}`}>
              <label htmlFor="stationType">Tipe Fasilitas / Petugas</label>
              <select
                id="stationType"
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
                <option value="RECYCLER">Fasilitas Daur Ulang (Recycler)</option>
                <option value="TPA">Petugas TPA (Landfill)</option>
              </select>
            </div>
          )}

          <button 
            type="submit" 
            className={styles.registerButton} 
            disabled={isLoading}
          >
            {isLoading ? 'Memproses...' : 'Daftar Sekarang'}
          </button>
        </form>

        <div className={styles.loginPrompt}>
          Sudah punya akun? 
          <Link to="/login" className={styles.loginLink}>
            Masuk
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
