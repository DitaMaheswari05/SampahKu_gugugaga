// src/pages/PetugasDashboard.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import styles from '../styles/PetugasDashboard.module.css';
import { getPetugasDashboard, PetugasActivityItem } from '../services/petugas.service';

const PetugasDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // State untuk menampung data riil dari backend
  const [summary, setSummary] = useState({
    totalUpdates: 0,
    updatesToday: 0,
    updatesThisWeek: 0,
  });
  
  const [activities, setActivities] = useState<PetugasActivityItem[]>([]);

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      setError('');

      try {
        const data = await getPetugasDashboard();
        
        // Setup waktu untuk perhitungan dinamis "Hari ini" dan "Minggu ini"
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Set ke awal hari
        
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay()); // Set ke hari Minggu minggu ini

        let todayCount = 0;
        let weekCount = 0;

        // Map data dari API ke format UI dan hitung statistik mingguan/harian
        const mappedActivities = (data.activities || []).map((act: any): PetugasActivityItem => {
           // Fallback membaca 'date' (dari interface) atau 'timestamp' (dari schema DB EPCIS)
           const actDate = new Date(act.date || act.timestamp); 
           
           if (actDate.getTime() >= today.getTime()) {
               todayCount++;
           }
           if (actDate.getTime() >= startOfWeek.getTime()) {
               weekCount++;
           }

           return {
             id: act.id,
             title: act.title || act.name || 'Produk Tidak Diketahui',
             location: act.location || act.location_name || '-',
             gtin: act.gtin || '-',
             date: actDate.toLocaleDateString('id-ID', {
                year: 'numeric', month: 'short', day: 'numeric'
             })
           };
        });

        // Set state menggunakan data asil dari Backend DB
        setSummary({
            totalUpdates: data.summary?.totalUpdates || mappedActivities.length, 
            updatesToday: todayCount,
            updatesThisWeek: weekCount
        });
        
        setActivities(mappedActivities);

      } catch (e: any) {
        setError(e.message || 'Gagal memuat dashboard petugas');
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  return (
    <div className={styles.mobileContainer}>
      <Header />

      <main className={styles.content}>
        {error && <div style={{ padding: '1rem', color: '#D4183D', textAlign: 'center', fontSize: '0.875rem' }}>{error}</div>}

        {/* Banner Section */}
        <section className={styles.banner}>
          <img src="/assets/banner_dashboard.png" alt="Mascot" className={styles.bannerImage} />
        </section>

        {/* Stats Section */}
        <section className={styles.statsSection}>
            <div>
                <h2 className={styles.sectionTitle}>Statistik Pembaruan</h2>
                <p className={styles.sectionSubtitle}>Pantau aktivitas pembaruan status sampah</p>
            </div>

            <div className={styles.statsScrollContainer}>
                {/* Total Sampah Card */}
                <div className={styles.statCard}>
                    <div className={styles.statHeader}>
                        <span className={styles.statLabel}>Total Sampah</span>
                        <div className={styles.iconWrapper}>
                            {/* SVG Icon (tetap sama) */}
                            <svg width="18" height="18" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M8.62933 23.4238H5.9356C5.54673 23.4249 5.16417 23.3255 4.82504 23.1352C4.48591 22.9449 4.20173 22.6702 4.00007 22.3377C3.8064 22.0037 3.704 21.6247 3.70313 21.2386C3.70226 20.8526 3.80297 20.4731 3.99513 20.1383L8.87096 11.7119" stroke="white" strokeWidth="2.46565" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M13.5605 23.424H23.6734C24.0604 23.421 24.4402 23.3185 24.7761 23.1263C25.1121 22.9342 25.3929 22.6588 25.5917 22.3268C25.7827 21.9937 25.8832 21.6165 25.8832 21.2326C25.8832 20.8487 25.7827 20.4715 25.5917 20.1385L24.0803 17.5249" stroke="white" strokeWidth="2.46565" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M17.259 19.7251L13.5605 23.4236L17.259 27.1221" stroke="white" strokeWidth="2.46565" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M10.2224 16.7616L8.86997 11.7119L3.82031 13.0656" stroke="white" strokeWidth="2.46565" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M11.5195 7.16421L12.867 4.8317C13.0605 4.4944 13.3379 4.21283 13.6723 4.01432C14.0066 3.81581 14.3867 3.7071 14.7754 3.69873C15.1612 3.69802 15.5404 3.79879 15.875 3.99095C16.2095 4.1831 16.4876 4.45987 16.6814 4.79348L21.5424 13.2297" stroke="white" strokeWidth="2.46565" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M16.4941 11.8757L21.5438 13.2293L22.8962 8.17969" stroke="white" strokeWidth="2.46565" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </div>
                    </div>
                    <h3 className={styles.statValue}>{loading ? '...' : summary.totalUpdates}</h3>
                    <p className={styles.statDesc}>Total berhasil update</p>
                </div>

                {/* Hari Ini Card */}
                <div className={`${styles.statCard} ${styles.opaque}`}>
                    <div className={styles.statHeader}>
                        <span className={styles.statLabel}>Hari ini</span>
                        <div className={styles.iconWrapper}>
                             {/* SVG Icon (tetap sama) */}
                             <svg width="18" height="18" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M8.62933 23.4238H5.9356C5.54673 23.4249 5.16417 23.3255 4.82504 23.1352C4.48591 22.9449 4.20173 22.6702 4.00007 22.3377C3.8064 22.0037 3.704 21.6247 3.70313 21.2386C3.70226 20.8526 3.80297 20.4731 3.99513 20.1383L8.87096 11.7119" stroke="white" strokeWidth="2.46565" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M13.5605 23.424H23.6734C24.0604 23.421 24.4402 23.3185 24.7761 23.1263C25.1121 22.9342 25.3929 22.6588 25.5917 22.3268C25.7827 21.9937 25.8832 21.6165 25.8832 21.2326C25.8832 20.8487 25.7827 20.4715 25.5917 20.1385L24.0803 17.5249" stroke="white" strokeWidth="2.46565" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M17.259 19.7251L13.5605 23.4236L17.259 27.1221" stroke="white" strokeWidth="2.46565" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M10.2224 16.7616L8.86997 11.7119L3.82031 13.0656" stroke="white" strokeWidth="2.46565" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M11.5195 7.16421L12.867 4.8317C13.0605 4.4944 13.3379 4.21283 13.6723 4.01432C14.0066 3.81581 14.3867 3.7071 14.7754 3.69873C15.1612 3.69802 15.5404 3.79879 15.875 3.99095C16.2095 4.1831 16.4876 4.45987 16.6814 4.79348L21.5424 13.2297" stroke="white" strokeWidth="2.46565" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M16.4941 11.8757L21.5438 13.2293L22.8962 8.17969" stroke="white" strokeWidth="2.46565" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </div>
                    </div>
                    <h3 className={styles.statValue}>{loading ? '...' : summary.updatesToday}</h3>
                    <p className={styles.statDesc}>Total berhasil update Hari ini</p>
                </div>

                {/* Minggu Ini Card */}
                <div className={`${styles.statCard} ${styles.opaque}`}>
                    <div className={styles.statHeader}>
                        <span className={styles.statLabel}>Minggu ini</span>
                        <div className={styles.iconWrapper}>
                            {/* SVG Icon (tetap sama) */}
                            <svg width="18" height="18" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M8.62933 23.4238H5.9356C5.54673 23.4249 5.16417 23.3255 4.82504 23.1352C4.48591 22.9449 4.20173 22.6702 4.00007 22.3377C3.8064 22.0037 3.704 21.6247 3.70313 21.2386C3.70226 20.8526 3.80297 20.4731 3.99513 20.1383L8.87096 11.7119" stroke="white" strokeWidth="2.46565" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M13.5605 23.424H23.6734C24.0604 23.421 24.4402 23.3185 24.7761 23.1263C25.1121 22.9342 25.3929 22.6588 25.5917 22.3268C25.7827 21.9937 25.8832 21.6165 25.8832 21.2326C25.8832 20.8487 25.7827 20.4715 25.5917 20.1385L24.0803 17.5249" stroke="white" strokeWidth="2.46565" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M17.259 19.7251L13.5605 23.4236L17.259 27.1221" stroke="white" strokeWidth="2.46565" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M10.2224 16.7616L8.86997 11.7119L3.82031 13.0656" stroke="white" strokeWidth="2.46565" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M11.5195 7.16421L12.867 4.8317C13.0605 4.4944 13.3379 4.21283 13.6723 4.01432C14.0066 3.81581 14.3867 3.7071 14.7754 3.69873C15.1612 3.69802 15.5404 3.79879 15.875 3.99095C16.2095 4.1831 16.4876 4.45987 16.6814 4.79348L21.5424 13.2297" stroke="white" strokeWidth="2.46565" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M16.4941 11.8757L21.5438 13.2293L22.8962 8.17969" stroke="white" strokeWidth="2.46565" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </div>
                    </div>
                    <h3 className={styles.statValue}>{loading ? '...' : summary.updatesThisWeek}</h3>
                    <p className={styles.statDesc}>Total berhasil update Minggu ini</p>
                </div>
            </div>
        </section>

        {/* Daftar Sampah Section */}
        <section className={styles.listSection}>
          <div className={styles.listHeader}>
            <h2 className={styles.listTitle}>Daftar Sampah Terbaru</h2>
            <button className={styles.addButton} onClick={() => navigate('/scan')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                 <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                 <line x1="14" y1="14" x2="14" y2="17"/><line x1="14" y1="21" x2="21" y2="21"/>
                 <line x1="21" y1="14" x2="21" y2="17"/><line x1="17" y1="14" x2="21" y2="14"/>
              </svg>
              Pindai QR
            </button>
          </div>

          <div className={styles.listContainer}>
              {loading ? (
                  <p style={{textAlign: 'center', fontSize:'12px', color: '#737373'}}>Memuat data...</p>
              ) : activities.length > 0 ? (
                  activities.map((item) => (
                    <div key={item.id} className={styles.listItem}>
                        <div className={styles.itemIcon}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFF5E9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                                <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                                <line x1="12" y1="22.08" x2="12" y2="12"></line>
                            </svg>
                        </div>
                        <div className={styles.itemDetails}>
                            <h3 className={styles.itemName}>{item.title}</h3>
                            <div className={styles.itemMeta}>
                                <span className={styles.gtinText}>GTIN: {item.gtin}</span>
                                <span className={styles.dot}>•</span>
                                <span className={styles.dateText}>{item.date}</span>
                            </div>
                        </div>
                    </div>
                  ))
              ) : (
                  <p style={{textAlign: 'center', fontSize:'12px', color: '#737373'}}>Belum ada aktivitas scan sampah.</p>
              )}
          </div>
        </section>

      </main>
    </div>
  );
};

export default PetugasDashboard;