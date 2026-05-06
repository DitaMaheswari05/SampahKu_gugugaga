import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Header from '../components/Header';
import { getInstanceActivities, InstanceActivitiesResponse } from '../services/konsumen.service';
import styles from '../styles/DetailSampah.module.css';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Canonical order for the waste journey stages */
const JOURNEY_ORDER = [
  'commissioning',
  'discarding',
  'collecting',
  'receiving',
  'inspecting',
  'shipping',
  'recycling',
  'disposing',
];

const BIZ_STEP_LABELS: Record<string, string> = {
  commissioning: 'Produk Terdaftar',
  discarding: 'Dibuang',
  collecting: 'Diambil Petugas',
  receiving: 'Diterima di Fasilitas',
  inspecting: 'Dipilah / Disortir',
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
  PICKED_UP: 'Diambil Petugas',
  AT_TPS: 'Di TPS',
  SORTED: 'Disortir',
  IN_TRANSIT: 'Dalam Perjalanan',
  AT_FACILITY: 'Di Fasilitas',
  RECYCLED: 'Didaur Ulang ✓',
  DISPOSED: 'Di TPA',
};

const STATUS_COLOR: Record<string, string> = {
  IN_MARKET: '#6b7280',
  DISCARDED: '#f59e0b',
  PICKED_UP: '#3b82f6',
  AT_TPS: '#8b5cf6',
  SORTED: '#06b6d4',
  IN_TRANSIT: '#f97316',
  AT_FACILITY: '#10b981',
  RECYCLED: '#16a34a',
  DISPOSED: '#ef4444',
};

const formatDateTime = (iso: string): string =>
  new Date(iso).toLocaleString('id-ID', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

// ─── Sub-components ───────────────────────────────────────────────────────────

interface StatusChipProps { status: string; count: number; total: number; }
const StatusChip: React.FC<StatusChipProps> = ({ status, count, total }) => {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  const color = STATUS_COLOR[status] || '#6b7280';
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
      background: color + '18', border: `1px solid ${color}40`,
      borderRadius: '999px', padding: '0.3rem 0.75rem',
      fontSize: '0.78rem', fontWeight: 600, color,
    }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
      {STATUS_LABELS[status] || status}: {count} ({pct}%)
    </div>
  );
};

const BackBtn: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button className={styles.backBtn} onClick={onClick}>
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#101828" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
    </svg>
  </button>
);

const LocationPin = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
  </svg>
);

// ─── Main Component ───────────────────────────────────────────────────────────

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

  const isBatch = data?.instance?.identification_type === 'BATCH';
  const activities = data?.activities || [];
  const statusCounts = data?.status_counts || null;
  const siblingCount = data?.sibling_count ?? 1;

  /**
   * BATCH journey: group activities by biz_step, count per location,
   * sort in canonical JOURNEY_ORDER, skip steps with zero occurrences.
   * For 'discarding', location detail is omitted per spec.
   */
  const batchJourney = useMemo(() => {
    if (!isBatch || !activities.length) return [];

    const stepMap: Record<string, { count: number; locations: Record<string, number> }> = {};
    activities.forEach((a: any) => {
      // Filter out commissioning as requested
      if (a.biz_step === 'commissioning') return;

      if (!stepMap[a.biz_step]) stepMap[a.biz_step] = { count: 0, locations: {} };
      stepMap[a.biz_step].count += 1;
      const loc = a.location_name || 'Tidak diketahui';
      stepMap[a.biz_step].locations[loc] = (stepMap[a.biz_step].locations[loc] || 0) + 1;
    });

    return JOURNEY_ORDER
      .filter(step => stepMap[step] && stepMap[step].count > 0)
      .map(step => ({ biz_step: step, ...stepMap[step] }));
  }, [activities, isBatch]);

  // ── Loading / Error states ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className={styles.mobileContainer}>
        <Header />
        <main className={styles.content}>
          <div className={styles.pageHeader}><BackBtn onClick={() => navigate(-1)} /><h1 className={styles.pageTitle}>Detail Sampah</h1></div>
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
          <div className={styles.pageHeader}><BackBtn onClick={() => navigate(-1)} /><h1 className={styles.pageTitle}>Detail Sampah</h1></div>
          <div style={{ textAlign: 'center', padding: '3rem', color: '#D4183D', fontSize: '0.875rem' }}>
            {error || 'Data tidak ditemukan'}
          </div>
        </main>
      </div>
    );
  }

  const { instance } = data;
  const product = instance.products;
  const discardCount = isBatch ? activities.filter((a: any) => a.biz_step === 'discarding').length : 0;
  const totalBatchItems = siblingCount;

  return (
    <div className={styles.mobileContainer}>
      <Header />

      <main className={styles.content}>
        <div className={styles.pageHeader}>
          <BackBtn onClick={() => navigate(-1)} />
          <h1 className={styles.pageTitle}>Detail Sampah</h1>
        </div>

        {/* ── Product Info Card ───────────────────────────────────────────── */}
        <div className={styles.card}>
          <div className={styles.productHeader}>
            <div className={styles.productIcon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
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
              <span className={styles.infoLabel}>Tipe QR</span>
              <span className={styles.infoValue}>
                {isBatch
                  ? `Batch · ${totalBatchItems} item`
                  : 'Serial (Unik)'}
              </span>
            </div>
            <div className={styles.infoBlock}>
              <span className={styles.infoLabel}>Kategori</span>
              <span className={styles.infoValue}>{product.category || '—'}</span>
            </div>
            <div className={styles.infoBlock}>
              <span className={styles.infoLabel}>Berat</span>
              <span className={styles.infoValue}>{product.weight_grams ? `${product.weight_grams}g` : '—'}</span>
            </div>
            <div className={styles.infoBlock} style={{ gridColumn: 'span 2' }}>
              <span className={styles.infoLabel}>Produsen</span>
              <span className={styles.infoValue}>{product.profiles?.name || '—'}</span>
            </div>
          </div>

          {/* ── Status section ──────────────────────────────────────────────── */}
          {isBatch && statusCounts && Object.keys(statusCounts).length > 0 ? (
            <div>
              <span className={styles.infoLabel} style={{ display: 'block', marginBottom: '0.5rem' }}>Status Item Batch</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {Object.entries(statusCounts)
                  .sort(([, a], [, b]) => b - a)
                  .filter(([status]) => status !== 'IN_MARKET')
                  .map(([status, count]) => (
                    <StatusChip key={status} status={status} count={count} total={totalBatchItems} />
                  ))}
              </div>
            </div>
          ) : !isBatch ? (
            <div className={styles.infoBlock}>
              <span className={styles.infoLabel}>Status</span>
              <span className={styles.infoValue}>{STATUS_LABELS[instance.current_status] || instance.current_status}</span>
            </div>
          ) : null}

          {/* Recycled badge — for BATCH show if any are recycled, for UNIQUE show if status === RECYCLED */}
          {(!isBatch && instance.current_status === 'RECYCLED') ||
            (isBatch && statusCounts && (statusCounts['RECYCLED'] ?? 0) > 0) ? (
            <div className={styles.badgeDaurUlang} style={{ marginTop: '1rem' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {isBatch
                ? `${statusCounts!['RECYCLED']} item Berhasil Didaur Ulang!`
                : 'Berhasil Didaur Ulang!'}
            </div>
          ) : null}
        </div>

        {/* ── Timeline Card ─────────────────────────────────────────────────── */}
        <div className={`${styles.card} ${styles.timelineSection}`}>
          <h2 className={styles.timelineTitle}>Perjalanan Sampah</h2>

          {isBatch ? (
            /* ═══ BATCH: aggregated journey view ═══════════════════════════ */
            batchJourney.length === 0 ? (
              <p style={{ color: '#9ca3af', fontSize: '0.875rem', textAlign: 'center', padding: '1rem 0' }}>
                Belum ada aktivitas tercatat.
              </p>
            ) : (
              <div className={styles.timelineList}>
                {batchJourney.map((step, idx) => {
                  const locationEntries = Object.entries(step.locations).sort((a, b) => b[1] - a[1]);
                  const showLocations = step.biz_step !== 'discarding' && locationEntries.length > 0;
                  const isLast = idx === batchJourney.length - 1;

                  return (
                    <div className={styles.timelineItem} key={step.biz_step}>
                      <div className={styles.timelineIcon}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                      <div className={styles.timelineContent}>
                        <div className={styles.timelineHeader}>
                          <h3>{BIZ_STEP_LABELS[step.biz_step] || step.biz_step}</h3>
                          <p>{BIZ_STEP_DESC[step.biz_step] || ''}</p>
                          <div style={{ marginTop: '0.5rem', fontWeight: 700, color: 'var(--primary)', fontSize: '0.875rem' }}>
                            {step.count} dari {totalBatchItems} item mencapai tahap ini
                          </div>
                        </div>

                        {/* Location breakdown — omitted for 'discarding' per spec */}
                        {showLocations && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                            {locationEntries.map(([loc, cnt]) => (
                              <div
                                key={loc}
                                className={`${styles.timelineBadge} ${styles.badgeLocation}`}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', width: 'fit-content' }}
                              >
                                <LocationPin />
                                <span>{loc}</span>
                                {locationEntries.length > 1 && (
                                  <span style={{ fontWeight: 700, color: 'var(--primary)' }}>×{cnt}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            /* ═══ UNIQUE/SERIAL: full chronological timeline ════════════════ */
            activities.length === 0 ? (
              <p style={{ color: '#9ca3af', fontSize: '0.875rem', textAlign: 'center', padding: '1rem 0' }}>
                Belum ada aktivitas tercatat.
              </p>
            ) : (
              <div className={styles.timelineList}>
                {activities
                  .filter((event: any) => event.biz_step !== 'commissioning')
                  .map((event: any) => (
                    <div className={styles.timelineItem} key={event.id}>
                    <div className={styles.timelineIcon}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                    <div className={styles.timelineContent}>
                      <div className={styles.timelineHeader}>
                        <h3>{BIZ_STEP_LABELS[event.biz_step] || event.biz_step}</h3>
                        <p>{BIZ_STEP_DESC[event.biz_step] || ''}</p>
                      </div>
                      <div className={styles.timelineBadges}>
                        {event.location_name && (
                          <div className={`${styles.timelineBadge} ${styles.badgeLocation}`}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                            </svg>
                            {event.location_name}
                          </div>
                        )}
                        <div className={`${styles.timelineBadge} ${styles.badgeDate}`}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#155DFC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
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

                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </main>
    </div>
  );
}