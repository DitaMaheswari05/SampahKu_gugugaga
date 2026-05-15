import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import {
  getGtinAggregateStats,
  getGtinRecentActivities,
} from '../services/konsumen.service';
import { getProductDetail } from '../services/product.service';
import styles from '../styles/DetailSampah.module.css';

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Canonical order for the waste journey stages.
 * 'commissioning' is intentionally omitted for Tier 2 (barcode) view —
 * there are no individual instance commissioning events for aggregate GTINs.
 */
const JOURNEY_ORDER = [
  'discarding',
  'collecting',
  'receiving',
  'inspecting',
  'shipping',
  'recycling',
  'disposing',
];

const BIZ_STEP_LABELS: Record<string, string> = {
  discarding: 'Dibuang',
  collecting: 'Diambil Petugas',
  receiving: 'Diterima di Fasilitas',
  inspecting: 'Dipilah / Disortir',
  shipping: 'Dalam Pengiriman',
  recycling: 'Didaur Ulang',
  disposing: 'Masuk Landfill',
};

const BIZ_STEP_DESC: Record<string, string> = {
  discarding: 'Konsumen memindai dan mengkonfirmasi produk dibuang',
  collecting: 'Petugas mengambil sampah dari titik kumpul',
  receiving: 'Sampah diterima di fasilitas pengelolaan',
  inspecting: 'Sampah dipilah berdasarkan jenis material',
  shipping: 'Sampah dimuat dan dikirim ke fasilitas akhir',
  recycling: 'Proses daur ulang selesai',
  disposing: 'Sampah dikirim ke landfill/TPA',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

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

// ─── Types ────────────────────────────────────────────────────────────────────

interface RawActivity {
  activity_id: string;
  timestamp: string;
  biz_step: string;
  location_name: string | null;
  facility_type: string | null;
  tps_name: string | null;
  actor_name: string;
  actor_role: string | null;
}

/**
 * Aggregated per-step data for the timeline.
 * - `count`       : total scan events at this step (from activities rows)
 * - `tpsBreakdown`: per-TPS item count (empty for 'discarding' per spec)
 */
interface JourneyStep {
  biz_step: string;
  count: number;
  tpsBreakdown: Record<string, number>;
}

// ─── Main Component ───────────────────────────────────────────────────────────

const DetailBarcode: React.FC = () => {
  const { gtin } = useParams<{ gtin: string }>();
  const navigate = useNavigate();

  const [stats, setStats] = useState<any>(null);
  const [activities, setActivities] = useState<RawActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [productInfo, setProductInfo] = useState<any>(null);

  useEffect(() => {
    if (!gtin) return;
    const loadData = async () => {
      setLoading(true);
      setError('');
      try {
        const [statsData, activitiesData, detail] = await Promise.all([
          getGtinAggregateStats(gtin),
          getGtinRecentActivities(gtin, 500),
          getProductDetail(gtin),
        ]);
        setStats(statsData);
        setActivities(activitiesData);
        setProductInfo(detail.product);
      } catch (e: any) {
        setError(e.message || 'Gagal memuat data barcode');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [gtin]);

  // ── Total scan events ──────────────────────────────────────────────────────
  const totalScans = useMemo(() => {
    if (!stats) return 0;
    return Object.values(stats).reduce((sum: number, item: any) => sum + item.count, 0);
  }, [stats]);

  /**
   * Build the timeline journey from the `activities` table rows.
   *
   * Logic (mirrors DetailSampah BATCH view):
   * 1. Group activities by biz_step → count total events, count per TPS.
   * 2. For 'discarding' → skip TPS breakdown (per spec).
   * 3. For all other steps → TPS label = tps_name (from tps_facilities join) or
   *    location_name as fallback.
   * 4. If a step exists in sku_aggregates (stats) but NOT in the activities
   *    window (because limit was reached), fall back to the stats count with
   *    an empty TPS breakdown so the step still appears in the timeline.
   * 5. Sort by canonical JOURNEY_ORDER and skip steps with count === 0.
   */
  const journeySteps = useMemo((): JourneyStep[] => {
    const stepMap: Record<string, { count: number; tpsBreakdown: Record<string, number> }> = {};

    // -- Pass 1: build from real activity rows --
    activities.forEach((act) => {
      // Skip commissioning for Tier 2 view
      if (act.biz_step === 'commissioning') return;

      if (!stepMap[act.biz_step]) {
        stepMap[act.biz_step] = { count: 0, tpsBreakdown: {} };
      }
      stepMap[act.biz_step].count += 1;

      // For discarding: no TPS breakdown (consumer action, not TPS-based)
      if (act.biz_step !== 'discarding') {
        const tpsLabel = act.tps_name || act.location_name || 'TPS Tidak Diketahui';
        stepMap[act.biz_step].tpsBreakdown[tpsLabel] =
          (stepMap[act.biz_step].tpsBreakdown[tpsLabel] || 0) + 1;
      }
    });

    // -- Pass 2: fill in missing steps from sku_aggregates (stats) --
    // This covers steps where activities were beyond the fetch window.
    if (stats) {
      Object.entries(stats).forEach(([step, data]: [string, any]) => {
        if (step === 'commissioning') return; // always skip
        if (!stepMap[step] && data.count > 0) {
          stepMap[step] = { count: data.count, tpsBreakdown: {} };
        }
      });
    }

    return JOURNEY_ORDER
      .filter((step) => stepMap[step] && stepMap[step].count > 0)
      .map((step) => ({
        biz_step: step,
        count: stepMap[step].count,
        tpsBreakdown: stepMap[step].tpsBreakdown,
      }));
  }, [activities, stats]);

  // ── Loading / Error states ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div className={styles.mobileContainer}>
        <Header />
        <main className={styles.content}>
          <div className={styles.pageHeader}>
            <BackBtn onClick={() => navigate(-1)} />
            <h1 className={styles.pageTitle}>Detail Barcode</h1>
          </div>
          <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>
            Memuat data...
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.mobileContainer}>
        <Header />
        <main className={styles.content}>
          <div className={styles.pageHeader}>
            <BackBtn onClick={() => navigate(-1)} />
            <h1 className={styles.pageTitle}>Detail Barcode</h1>
          </div>
          <div style={{ textAlign: 'center', padding: '3rem', color: '#D4183D', fontSize: '0.875rem' }}>
            <p>{error}</p>
            <button
              onClick={() => navigate(-1)}
              style={{
                marginTop: '1rem', padding: '0.5rem 1rem', background: '#155DFC',
                color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer',
                fontWeight: 600, fontFamily: 'Inter, sans-serif',
              }}
            >
              Kembali
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.mobileContainer}>
      <Header />

      <main className={styles.content}>
        <div className={styles.pageHeader}>
          <BackBtn onClick={() => navigate(-1)} />
          <h1 className={styles.pageTitle}>Detail Barcode</h1>
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
            <h2 className={styles.productName}>
              {productInfo?.product_name || 'Unknown Product'}
            </h2>
          </div>

          <div className={styles.infoGrid}>
            <div className={styles.infoBlock}>
              <span className={styles.infoLabel}>GTIN</span>
              <span className={styles.infoValue} style={{ fontFamily: 'Consolas, monospace', fontSize: '0.8rem' }}>{gtin}</span>
            </div>
            <div className={styles.infoBlock}>
              <span className={styles.infoLabel}>Tipe</span>
              <span className={styles.infoValue}>Barcode Scan (Tier 2)</span>
            </div>
            <div className={styles.infoBlock}>
              <span className={styles.infoLabel}>Kategori</span>
              <span className={styles.infoValue}>{productInfo?.category || '—'}</span>
            </div>
            <div className={styles.infoBlock}>
              <span className={styles.infoLabel}>Total Scan</span>
              <span className={styles.infoValue} style={{ color: '#10B981' }}>{totalScans} Kali</span>
            </div>
          </div>
        </div>

        {/* ── Journey Timeline Card ────────────────────────────────────────── */}
        <div className={`${styles.card} ${styles.timelineSection}`}>
          <h2 className={styles.timelineTitle}>Perjalanan Sampah</h2>

          {journeySteps.length === 0 ? (
            <p style={{ color: '#9ca3af', fontSize: '0.875rem', textAlign: 'center', padding: '1rem 0' }}>
              Belum ada aktivitas tercatat.
            </p>
          ) : (
            <div className={styles.timelineList}>
              {journeySteps.map((step) => {
                // Sort TPS entries by item count descending
                const tpsEntries = Object.entries(step.tpsBreakdown).sort((a, b) => b[1] - a[1]);
                // Show per-TPS breakdown only for non-discarding steps that have TPS data
                const showTps = step.biz_step !== 'discarding' && tpsEntries.length > 0;

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

                        {/* Total scan events at this step */}
                        <div style={{ marginTop: '0.5rem', fontWeight: 700, color: 'var(--primary)', fontSize: '0.875rem' }}>
                          {step.count} item di tahap ini
                        </div>
                      </div>

                      {/* Per-TPS item breakdown */}
                      {showTps && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.5rem' }}>
                          {tpsEntries.map(([tpsName, cnt]) => (
                            <div
                              key={tpsName}
                              className={`${styles.timelineBadge} ${styles.badgeLocation}`}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', width: 'fit-content' }}
                            >
                              <LocationPin />
                              <span>{tpsName}</span>
                              <span style={{ fontWeight: 700, color: 'var(--primary)' }}>×{cnt}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default DetailBarcode;