import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboardStats, DashboardStats } from '../services/public.service';
import styles from '../styles/Home.module.css';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);

  // Efek untuk mengaktifkan smooth scroll secara global
  useEffect(() => {
    document.documentElement.style.scrollBehavior = 'smooth';
    
    // Fetch stats
    getDashboardStats()
      .then(data => setStats(data))
      .catch(err => console.error('Error fetching stats:', err));

    return () => {
      document.documentElement.style.scrollBehavior = 'auto';
    };
  }, []);

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K+';
    }
    return num.toString();
  };

  return (
    <div className={styles.mobileContainer} id="beranda">
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>
            <img src="/assets/logo_sampahku.png" alt="SampahKu" />
          </div>
          <span className={styles.logoText}>Sampahku</span>
        </div>
        
        {/* Navigasi di tengah */}
        <nav className={styles.navLinks}>
          <a href="#beranda">Beranda</a>
          <a href="#fitur">Fitur</a>
          <a href="#cara-kerja">Cara Kerja</a>
        </nav>

        {/* Tombol Login di Kanan */}
        <button 
          className={styles.loginBtn} 
          onClick={() => navigate('/login')}
        >
          Login
        </button>
      </header>

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.badge}>
          <img src="/assets/image.png" alt="Check" className={styles.badgeIcon} />
          <span>Tracking lebih mudah</span>
        </div>
        
        <h1 className={styles.title}>
          Kelola Sampah <br />
          <span className={styles.textGreen}>Lebih Transparan</span>
        </h1>
        
        <p className={styles.subtitle}>
          Lacak perjalanan sampah dari sumber hingga daur ulang dengan teknologi QR code dan
          blockchain. Bangun ekonomi sirkular yang berkelanjutan.
        </p>
        
        <button 
          className={styles.ctaBtn} 
          onClick={() => navigate('/register')}
        >
          Mulai Sekarang
        </button>

        {/* Stats */}
        <div className={styles.stats}>
          <div className={styles.statItem}>
            <h2>{stats ? `${stats.recovery_rate}%` : '...'}</h2>
            <p>Recovery Rate</p>
          </div>
          <div className={styles.divider}></div>
          <div className={styles.statItem}>
            <h2>{stats ? formatNumber(stats.tracked_products) : '...'}</h2>
            <p>Produk Terlacak</p>
          </div>
          <div className={styles.divider}></div>
          <div className={styles.statItem}>
            <h2>{stats ? formatNumber(stats.active_users) : '...'}</h2>
            <p>Pengguna Aktif</p>
          </div>
        </div>

        {/* Truck Image */}
        <div className={styles.truckWrapper}>
          <img src="/assets/background_truck.png" alt="Truck Illustration" className={styles.truckImg} />
        </div>
      </section>

      {/* Features Section */}
      <section id="fitur" className={styles.section}>
        <div className={styles.sectionTag}>FITUR UNGGULAN</div>
        <h2 className={styles.sectionTitle}>Teknologi untuk Masa Depan</h2>
        <p className={styles.sectionSubtitle}>
          Platform all-in-one untuk mengelola dan melacak sampah dengan transparan
        </p>

        {/* 3 Grid dalam 1 baris */}
        <div className={styles.cardGrid}>
          <div className={`${styles.card} ${styles.cardGreen}`}>
            <div className={styles.cardIcon}>
              <img src="/assets/logo_qr.png" alt="QR Code" />
            </div>
            <h3>QR Code Tracking</h3>
            <p>Pindai QR code pada produk untuk melacak perjalanan sampah secara real-time dari sumber hingga daur ulang</p>
          </div>

          <div className={`${styles.card} ${styles.cardBlue}`}>
            <div className={styles.cardIcon}>
              <img src="/assets/logo_blockchain.png" alt="Blockchain" />
            </div>
            <h3>Blockchain Verified</h3>
            <p>Data tercatat di blockchain Hyperledger Fabric untuk memastikan integritas dan transparansi setiap transaksi</p>
          </div>

          <div className={`${styles.card} ${styles.cardPurple}`}>
            <div className={styles.cardIcon}>
              <img src="/assets/logo_realtime.png" alt="Real-time Analytics" />
            </div>
            <h3>Real-time Analytics</h3>
            <p>Dashboard executive dengan visualisasi data lengkap untuk monitoring performa pengelolaan sampah</p>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="cara-kerja" className={styles.section}>
        <div className={styles.sectionTag}>CARA KERJA</div>
        <h2 className={styles.sectionTitle}>Mudah & Efisien</h2>

        {/* 3 Grid dalam 1 baris */}
        <div className={styles.stepGrid}>
          <div className={styles.step}>
            <div className={styles.stepNumber}>1</div>
            <h3>Pindai QR Code</h3>
            <p>Pindai QR code pada produk sebelum membuang sampah menggunakan aplikasi SampahKu</p>
          </div>
          <div className={styles.step}>
            <div className={styles.stepNumber}>2</div>
            <h3>Lacak Perjalanan</h3>
            <p>Pantau status dan lokasi sampah di setiap tahap pengelolaan secara transparan</p>           </div>
          <div className={styles.step}>
            <div className={styles.stepNumber}>3</div>
            <h3>Dapatkan Reward</h3>
            <p>Kontribusi Anda dalam ekonomi sirkular akan mendapat apresiasi melalui sistem reward</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <p>© 2026 SampahKu</p>
          <p className={styles.footerBrand}>by gugugaga</p>
        </div>
      </footer>
    </div>
  );
};

export default Home;