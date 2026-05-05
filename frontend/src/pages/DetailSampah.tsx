import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Header from '../components/Header';
import { getInstanceActivities, InstanceActivitiesResponse } from '../services/konsumen.service';
import styles from '../styles/DetailSampah.module.css';

const BIZ_STEP_LABELS: Record<string, string> = {
  commissioning: 'Produk Terdaftar',
  discarding: 'Dibuang oleh Konsumen',
  collecting: 'Diambil Petugas',
  receiving: 'Diterima di Fasilitas',
  inspecting: 'Disortir',
  shipping: 'Dalam Pengiriman',
  recycling: 'Didaur Ulang',
  disposing: 'Masuk Landfill',
};

const BIZ_STEP_DESC: Record<string, string> = {
  commissioning: 'Produk resmi didaftarkan dan masuk ke pasar',
  discarding: 'Konsumen memindai dan mengkonfirmasi produk dibuang',
  collecting: 'Petugas mengambil sampah dari titik kumpul',
  receiving: 'Sampah diterima di fasilitas pengelolaan',
  inspecting: 'Sampah dipilah berdasarkan jenis material',
  shipping: 'Sampah dimuat dan dikirim ke fasilitas akhir',
  recycling: 'Proses daur ulang selesai',
  disposing: 'Sampah dikirim ke landfill/TPA',
};

const STATUS_LABELS: Record<string, string> = {
  IN_MARKET: 'Di Pasaran',
  DISCARDED: 'Dibuang',
  PICKED_UP: 'Diambil',
  AT_TPS: 'Di TPS',
  SORTED: 'Disortir',
  IN_TRANSIT: 'Dalam Perjalanan',
  AT_FACILITY: 'Di Fasilitas',
  RECYCLED: 'Didaur Ulang',
  DISPOSED: 'Di TPA',
};

const formatDateTime = (iso: string): string =>
  new Date(iso).toLocaleString('id-ID', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

export default function DetailSampah() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<InstanceActivitiesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const result = await getInstanceActivities(id);
        setData(result);
      } catch (e: any) {
        setError(e.message || 'Gagal memuat detail sampah');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) {
    return (
      <div className={styles.mobileContainer}>
        <Header />
        <main className={styles.content}>
          <div className={styles.pageHeader}>
            <button className={styles.backBtn} onClick={() => navigate(-1)}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#101828" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline>
              </svg>
            </button>
            <h1 className={styles.pageTitle}>Detail Sampah</h1>
          </div>
          <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>Memuat...</div>
        </main>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={styles.mobileContainer}>
        <Header />
        <main className={styles.content}>
          <div className={styles.pageHeader}>
            <button className={styles.backBtn} onClick={() => navigate(-1)}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#101828" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline>
              </svg>
            </button>
            <h1 className={styles.pageTitle}>Detail Sampah</h1>
          </div>
          <div style={{ textAlign: 'center', padding: '3rem', color: '#D4183D', fontSize: '0.875rem' }}>
            {error || 'Data tidak ditemukan'}
          </div>
        </main>
      </div>
    );
  }

  const { instance, activities } = data;
  const product = instance.products;
  const isRecyclable = ['RECYCLED', 'AT_FACILITY', 'SORTED', 'IN_TRANSIT'].includes(instance.current_status)
    || instance.current_status !== 'DISPOSED';
  const isBatch = instance.identification_type === 'BATCH';

  const displayActivities = useMemo(() => {
    if (!isBatch) return activities;

    const counts: Record<string, number> = {};
    const latestEvents: Record<string, any> = {};
    const totalDiscarded = activities.filter((a: any) => a.biz_step === 'discarding').length || 1;

    activities.forEach((a: any) => {
      counts[a.biz_step] = (counts[a.biz_step] || 0) + 1;
      if (!latestEvents[a.biz_step] || new Date(a.timestamp) > new Date(latestEvents[a.biz_step].timestamp)) {
        latestEvents[a.biz_step] = a;
      }
    });

    return Object.entries(latestEvents).map(([biz_step, event]) => ({
      ...event,
      count: counts[biz_step],
      percentage: Math.min(100, Math.round((counts[biz_step] / totalDiscarded) * 100))
    })).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [activities, isBatch]);

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
            <h2 className={styles.productName}>{product.product_name}</h2>
          </div>

          <div className={styles.infoGrid}>
            <div className={styles.infoBlock}>
              <span className={styles.infoLabel}>GTIN</span>
              <span className={styles.infoValue} style={{ fontFamily: 'Consolas, monospace', fontSize: '0.8rem' }}>{instance.gtin}</span>
            </div>
            <div className={styles.infoBlock}>
              <span className={styles.infoLabel}>Kategori</span>
              <span className={styles.infoValue}>{product.category || '—'}</span>
            </div>
            <div className={styles.infoBlock}>
              <span className={styles.infoLabel}>Berat</span>
              <span className={styles.infoValue}>{product.weight_grams ? `${product.weight_grams}g` : '—'}</span>
            </div>
            <div className={styles.infoBlock}>
              <span className={styles.infoLabel}>Status</span>
              <span className={styles.infoValue}>{STATUS_LABELS[instance.current_status] || instance.current_status}</span>
            </div>
            <div className={styles.infoBlock} style={{ gridColumn: 'span 2' }}>
              <span className={styles.infoLabel}>Produsen</span>
              <span className={styles.infoValue}>{product.profiles?.name || '—'}</span>
            </div>
          </div>

          {instance.current_status === 'RECYCLED' && (
            <div className={styles.badgeDaurUlang}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              Berhasil Didaur Ulang!
            </div>
          )}
        </div>

        {/* Section Bawah: Timeline */}
        <div className={`${styles.card} ${styles.timelineSection}`}>
          <h2 className={styles.timelineTitle}>Perjalanan Sampah</h2>

          {displayActivities.length === 0 ? (
            <p style={{ color: '#9ca3af', fontSize: '0.875rem', textAlign: 'center', padding: '1rem 0' }}>
              Belum ada aktivitas tercatat.
            </p>
          ) : (
            <div className={styles.timelineList}>
              {displayActivities.map((event: any) => (
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
                      <h3>{BIZ_STEP_LABELS[event.biz_step] || event.biz_step}</h3>
                      <p>{BIZ_STEP_DESC[event.biz_step] || ''}</p>
                      {isBatch && (
                        <div style={{ marginTop: '0.5rem', fontWeight: 'bold', color: 'var(--primary)', fontSize: '0.85rem' }}>
                          Sebanyak {event.percentage}% ({event.count} item) telah mencapai tahap ini
                        </div>
                      )}
                    </div>

                    <div className={styles.timelineBadges}>
                      {event.location_name && (
                        <div className={`${styles.timelineBadge} ${styles.badgeLocation}`}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                            <circle cx="12" cy="10" r="3"></circle>
                          </svg>
                          {event.location_name}
                        </div>
                      )}

                      <div className={`${styles.timelineBadge} ${styles.badgeDate}`}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#155DFC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                          <line x1="16" y1="2" x2="16" y2="6"></line>
                          <line x1="8" y1="2" x2="8" y2="6"></line>
                          <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                        {formatDateTime(event.timestamp)}
                      </div>

                      <div className={`${styles.timelineBadge} ${styles.badgeActor}`}>
                        Oleh: {event.profiles?.name || 'Sistem'} ({event.profiles?.role || '—'})
                      </div>

                      {event.evidence_url && (
                        <a
                          href={event.evidence_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`${styles.timelineBadge} ${styles.badgeLocation}`}
                          style={{ textDecoration: 'none' }}
                        >
                          📷 Lihat Bukti
                        </a>
                      )}

                      {event.blockchain_hash && (
                        <div className={`${styles.timelineBadge} ${styles.badgeDate}`} style={{ fontSize: '0.65rem', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                          🔗 Hash: {event.blockchain_hash.substring(0, 16)}...
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </main>
    </div>
  );
}