import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { getMyCollections, CollectionItem } from '../services/konsumen.service';
import styles from '../styles/Dashboard.module.css';

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

const getStatusStyle = (status: string): string => {
  switch (status) {
    case 'RECYCLED': return styles.statusGreen;
    case 'DISPOSED': return styles.statusOrange;
    case 'IN_MARKET':
    case 'DISCARDED': return styles.statusBlue;
    case 'AT_TPS':
    case 'SORTED':
    case 'PICKED_UP':
    case 'IN_TRANSIT':
    case 'AT_FACILITY': return styles.statusYellow;
    default: return styles.statusDefault;
  }
};

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' });

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [collections, setCollections] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadCollections = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getMyCollections();
      setCollections(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCollections();
  }, [loadCollections]);

  // Hitung stats dari data nyata (Tier 1 only untuk conversion rate)
  const tier1Items = collections.filter(c => c.type === 'TIER_1');
  
  const totalItems = collections.length;
  const recycledItems = tier1Items.filter(c => c.current_status === 'RECYCLED').length;
  // Conversion rate hanya dari Tier 1
  const conversionRate = tier1Items.length > 0 ? Math.round((recycledItems / tier1Items.length) * 100) : 0;

  return (
    <div className={styles.mobileContainer}>
      <Header />

      <main className={styles.content}>
        {/* Banner Section */}
        <section className={styles.banner}>
          <img src="/assets/banner_dashboard.png" alt="Mascot" className={styles.bannerImage} />
        </section>

        {/* Circular Wallet Section */}
        <section className={styles.walletSection}>
          <div className={styles.walletHeader}>
            <h2 className={styles.sectionTitle}>Circular Wallet</h2>
            <p className={styles.sectionSubtitle}>Pantau perjalanan sampah yang Anda buang</p>
          </div>

          <div className={styles.statsScrollContainer}>
            {/* Card Total Sampah */}
            <div className={styles.statCard}>
              <div className={styles.statHeader}>
                <span className={styles.statLabel}>Total Sampah</span>
                <div className={styles.iconWrapper}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                    <line x1="12" y1="22.08" x2="12" y2="12"></line>
                  </svg>
                </div>
              </div>
              <h3 className={styles.statValue}>{loading ? '...' : totalItems}</h3>
              <p className={styles.statDesc}>Item terlacak</p>
            </div>

            {/* Card Didaur Ulang */}
            <div className={styles.statCard}>
              <div className={styles.statHeader}>
                <span className={styles.statLabel}>Didaur Ulang</span>
                <div className={styles.iconWrapper}>
                  <svg width="18" height="18" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8.63031 23.4238H5.93658C5.54771 23.425 5.16515 23.3255 4.82602 23.1352C4.48689 22.9449 4.2027 22.6702 4.00104 22.3377C3.80738 22.0038 3.70497 21.6247 3.70411 21.2387C3.70324 20.8526 3.80395 20.4732 3.99611 20.1383L8.87194 11.712" stroke="white" strokeWidth="2.46565" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M13.561 23.4239H23.6739C24.0609 23.4209 24.4407 23.3184 24.7766 23.1262C25.1125 22.9341 25.3934 22.6587 25.5922 22.3266C25.7832 21.9936 25.8837 21.6164 25.8837 21.2325C25.8837 20.8486 25.7832 20.4714 25.5922 20.1384L24.0807 17.5248" stroke="white" strokeWidth="2.46565" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M17.2595 19.7251L13.561 23.4236L17.2595 27.1221" stroke="white" strokeWidth="2.46565" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
              <h3 className={styles.statValue}>{loading ? '...' : recycledItems}</h3>
              <p className={styles.statDesc}>Berhasil didaur ulang</p>
            </div>

            {/* Card Conversion Rate */}
            <div className={styles.statCard}>
              <div className={styles.statHeader}>
                <span className={styles.statLabel}>Conversion Rate</span>
                <div className={styles.iconWrapper}>
                  <svg width="18" height="18" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M11.0942 22.1909L18.4912 14.7939L11.0942 7.39697" stroke="white" strokeWidth="2.46565" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
              <h3 className={styles.statValue}>{loading ? '...' : (tier1Items.length === 0 ? '—' : `${conversionRate}%`)}</h3>
              <p className={styles.statDesc}>Tingkat keberhasilan</p>
            </div>
          </div>
        </section>

        {/* Daftar Sampah Section */}
        <section className={styles.listSection}>
          <div className={styles.listHeader}>
            <h2 className={styles.sectionTitle}>Daftar Sampah</h2>
            <button className={styles.addButton} onClick={() => navigate('/tambah-sampah')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Tambah Sampah
            </button>
          </div>

          {error && (
            <div style={{ padding: '1rem', color: '#D4183D', textAlign: 'center', fontSize: '0.875rem' }}>
              {error}
            </div>
          )}

          <div className={styles.listContainer}>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className={styles.listItem} style={{ opacity: 0.5 }}>
                  <div className={styles.itemIcon} />
                  <div className={styles.itemDetails}>
                    <div style={{ background: '#e5e7eb', borderRadius: 4, height: 16, width: '60%', marginBottom: 8 }} />
                    <div style={{ background: '#e5e7eb', borderRadius: 4, height: 12, width: '40%' }} />
                  </div>
                </div>
              ))
            ) : collections.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af', fontSize: '0.875rem' }}>
                <p>Belum ada sampah terdaftar.</p>
                <p>Scan QR produk untuk mulai melacak!</p>
              </div>
            ) : (
              collections.map((item) => {
                // Tier 1: Unique/Batch timeline dengan status individual
                if (item.type === 'TIER_1') {
                  return (
                    <div
                      key={item.activity_id}
                      className={styles.listItem}
                      onClick={() => navigate(`/detail-sampah/${item.instance_id}`)}
                      role="button"
                      tabIndex={0}
                    >
                      <div className={styles.itemIcon}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFF5E9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                          <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                          <line x1="12" y1="22.08" x2="12" y2="12"></line>
                        </svg>
                      </div>

                      <div className={styles.itemDetails}>
                        <h4 className={styles.itemName}>{item.product_name}</h4>
                        <div className={styles.itemMeta}>
                          <span className={styles.statusBadge} style={{ background: '#E0F2FE', color: '#0369A1', fontSize: '10px' }}>
                            Tier 1
                          </span>
                          <span className={styles.gtinText}>GTIN: {item.gtin}</span>
                          <span className={styles.dot}>•</span>
                          <span className={styles.dateText}>{formatDate(item.collected_at)}</span>
                        </div>
                      </div>

                      <div className={styles.itemRight}>
                        <span className={`${styles.statusBadge} ${getStatusStyle(item.current_status || 'IN_MARKET')}`}>
                          {STATUS_LABELS[item.current_status || 'IN_MARKET'] || item.current_status}
                        </span>
                        <svg className={styles.chevron} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#BBBBBB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                      </div>
                    </div>
                  );
                }

                // Tier 2: Barcode scan aggregate view
                return (
                  <div
                    key={item.activity_id}
                    className={styles.listItem}
                    onClick={() => navigate(`/detail-barcode/${item.gtin}`)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className={styles.itemIcon} style={{ background: '#E8F5E9' }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="3" y1="6" x2="21" y2="6" />
                        <line x1="5" y1="6" x2="5" y2="18" />
                        <line x1="9" y1="6" x2="9" y2="18" />
                        <line x1="13" y1="6" x2="13" y2="18" />
                        <line x1="17" y1="6" x2="17" y2="18" />
                        <line x1="19" y1="6" x2="19" y2="18" />
                        <line x1="3" y1="18" x2="21" y2="18" />
                      </svg>
                    </div>

                    <div className={styles.itemDetails}>
                      <h4 className={styles.itemName}>{item.product_name}</h4>
                      <div className={styles.itemMeta}>
                        <span className={styles.statusBadge} style={{ background: '#E8F5E9', color: '#2E7D32', fontSize: '10px' }}>
                          Tier 2
                        </span>
                        <span className={styles.gtinText}>GTIN: {item.gtin}</span>
                        <span className={styles.dot}>•</span>
                        <span className={styles.dateText}>{formatDate(item.collected_at)}</span>
                      </div>
                    </div>

                    <div className={styles.itemRight}>
                      <span className={styles.statusBadge} style={{ background: '#E8F5E9', color: '#2E7D32' }}>
                        Barcode Scan
                      </span>
                      <svg className={styles.chevron} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#BBBBBB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6"></polyline>
                      </svg>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Dashboard;