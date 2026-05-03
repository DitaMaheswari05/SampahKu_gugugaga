import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Header from '../components/Header';
import styles from '../styles/DetailSampah.module.css';

// Tipe Data Dummy
interface TimelineEvent {
  id: string;
  statusTitle: string;
  description: string;
  location: string;
  date: string;
  actor: string;
}

interface TrashDetail {
  id: string;
  name: string;
  gtin: string;
  brand: string;
  category: string;
  weight: string;
  producer: string;
  isRecyclable: boolean;
  history: TimelineEvent[];
}

export default function DetailSampah() {
  const navigate = useNavigate();
  const { id } = useParams();

  // dummy
  const dummyDetail: TrashDetail = {
    id: id || '1',
    name: 'Botol Aqua 600ml',
    gtin: '8992753020012',
    brand: 'Danone Aqua',
    category: 'Plastik PET',
    weight: '15g',
    producer: 'PT Aqua Golden Mississippi',
    isRecyclable: true,
    history: [
      {
        id: 'ev1',
        statusTitle: 'Dipindai oleh Konsumen',
        description: 'Produk dipindai sebelum dibuang',
        location: 'Jakarta Selatan',
        date: '2026-04-20 08:30',
        actor: 'Budi Santoso',
      },
      {
        id: 'ev2',
        statusTitle: 'Terkumpul',
        description: 'Sampah terkumpul di TPS',
        location: 'TPS Kebayoran',
        date: '2026-04-20 14:15',
        actor: 'Agus Wijaya (Petugas)',
      },
      {
        id: 'ev3',
        statusTitle: 'Dipilah',
        description: 'Sampah dipilah berdasarkan jenis material',
        location: 'Pusat Pemilahan Jakarta',
        date: '2026-04-21 09:00',
        actor: 'Siti Rahayu (Petugas)',
      },
      {
        id: 'ev4',
        statusTitle: 'Diproses',
        description: 'Sampah dalam proses daur ulang',
        location: 'Fasilitas Daur Ulang Tangerang',
        date: '2026-04-22 11:20',
        actor: 'PT Recycle Indonesia',
      },
      {
        id: 'ev5',
        statusTitle: 'Didaur Ulang',
        description: 'Berhasil didaur ulang menjadi pelet plastik',
        location: 'Pabrik Daur Ulang Bekasi',
        date: '2026-04-23 16:45',
        actor: 'PT Plastik Baru',
      },
    ],
  };

  return (
    <div className={styles.mobileContainer}>
      <Header />
      
      <main className={styles.content}>
        
        {/* Navigasi Back */}
        <div className={styles.pageHeader}>
          <button className={styles.backBtn} onClick={() => navigate(-1)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#101828" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          <h1 className={styles.pageTitle}>Detail Sampah</h1>
        </div>

        {/* Section Atas: Info Produk */}
        <div className={styles.card}>
          <div className={styles.productHeader}>
            <div className={styles.productIcon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                <line x1="12" y1="22.08" x2="12" y2="12"></line>
              </svg>
            </div>
            <h2 className={styles.productName}>{dummyDetail.name}</h2>
          </div>

          <div className={styles.infoGrid}>
            <div className={styles.infoBlock}>
              <span className={styles.infoLabel}>GTIN</span>
              <span className={styles.infoValue} style={{fontFamily: 'Consolas, monospace'}}>{dummyDetail.gtin}</span>
            </div>
            <div className={styles.infoBlock}>
              <span className={styles.infoLabel}>Kategori</span>
              <span className={styles.infoValue}>{dummyDetail.category}</span>
            </div>
            <div className={styles.infoBlock}>
              <span className={styles.infoLabel}>Brand</span>
              <span className={styles.infoValue}>{dummyDetail.brand}</span>
            </div>
            <div className={styles.infoBlock}>
              <span className={styles.infoLabel}>Berat</span>
              <span className={styles.infoValue}>{dummyDetail.weight}</span>
            </div>
            <div className={styles.infoBlock} style={{ gridColumn: 'span 2' }}>
              <span className={styles.infoLabel}>Produsen</span>
              <span className={styles.infoValue}>{dummyDetail.producer}</span>
            </div>
          </div>

          {dummyDetail.isRecyclable && (
            <div className={styles.badgeDaurUlang}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              Dapat Didaur Ulang
            </div>
          )}
        </div>

        {/* Section Bawah: Timeline */}
        <div className={`${styles.card} ${styles.timelineSection}`}>
          <h2 className={styles.timelineTitle}>Perjalanan Sampah</h2>
          
          <div className={styles.timelineList}>
            {dummyDetail.history.map((event, index) => (
              <div className={styles.timelineItem} key={event.id}>
                {/* Lingkaran Hijau Checkmark */}
                <div className={styles.timelineIcon}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
                
                {/* Konten Event */}
                <div className={styles.timelineContent}>
                  <div className={styles.timelineHeader}>
                    <h3>{event.statusTitle}</h3>
                    <p>{event.description}</p>
                  </div>
                  
                  <div className={styles.timelineBadges}>
                    <div className={`${styles.timelineBadge} ${styles.badgeLocation}`}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                        <circle cx="12" cy="10" r="3"></circle>
                      </svg>
                      {event.location}
                    </div>
                    
                    <div className={`${styles.timelineBadge} ${styles.badgeDate}`}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#155DFC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                      </svg>
                      {event.date}
                    </div>

                    <div className={`${styles.timelineBadge} ${styles.badgeActor}`}>
                      Oleh: {event.actor}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </main>
    </div>
  );
}