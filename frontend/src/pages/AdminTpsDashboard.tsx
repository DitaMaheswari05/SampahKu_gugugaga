import React, { useState, useEffect, useCallback } from 'react';
import Header from '../components/Header';
import {
  getMyTps,
  registerTps,
  getTpsPetugas,
  TpsData,
  PetugasItem,
} from '../services/tps.service';
import styles from '../styles/AdminTpsDashboard.module.css';

const ALL_BIZ_STEPS = [
  { value: 'collecting', label: 'Collecting' },
  { value: 'receiving', label: 'Receiving' },
  { value: 'inspecting', label: 'Inspecting' },
  { value: 'shipping', label: 'Shipping' },
  { value: 'recycling', label: 'Recycling' },
  { value: 'disposing', label: 'Disposing' },
];

const TPS_TYPES = ['TPS', 'TPS3R', 'Bank Sampah', 'TPST', 'TPA', 'Pengepul', 'Recycler'];

// Mock Leaderboard Data (Fallback/Requirement)
const MOCK_LEADERBOARD = [
  { id: 1, name: 'Botol Aqua 600ml', gtin: '8992753020012', total: '8,420', trend: 12, up: true },
  { id: 2, name: 'Kemasan Indomie', gtin: '8992775001034', total: '6,230', trend: 8, up: true },
  { id: 3, name: 'Botol Teh Pucuk', gtin: '8992753030023', total: '5,180', trend: 3, up: false },
  { id: 4, name: 'Kaleng Coca-Cola', gtin: '8992761111045', total: '4,560', trend: 15, up: true },
  { id: 5, name: 'Botol Sprite', gtin: '8992761111052', total: '3,920', trend: 5, up: true },
];

const Icons = {
  Download: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>,
  Volume: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>,
  Total: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>,
  CalendarDay: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
  CalendarWeek: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /><line x1="8" y1="14" x2="16" y2="14" /></svg>,
  TrendUp: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>,
  TrendDown: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6" /><polyline points="17 18 23 18 23 12" /></svg>,
  Location: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>,
  Radius: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" /></svg>,
  Action: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"></path></svg>,
  Plus: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>,
  SampahKu: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>,
  Bell: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#101828" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>,
  Logout: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#101828" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
};

const AdminTpsDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tps, setTps] = useState<TpsData | null>(null);
  const [petugasList, setPetugasList] = useState<PetugasItem[]>([]);

  // Register Form State
  const [tpsName, setTpsName] = useState('');
  const [tpsType, setTpsType] = useState('TPS');
  const [tpsAddress, setTpsAddress] = useState('');
  const [tpsCity, setTpsCity] = useState('');
  const [tpsProvince, setTpsProvince] = useState('');
  const [tpsLat, setTpsLat] = useState('');
  const [tpsLng, setTpsLng] = useState('');
  const [tpsRadius, setTpsRadius] = useState('200');
  const [tpsCapacity, setTpsCapacity] = useState('');
  const [tpsActions, setTpsActions] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const tpsData = await getMyTps();
      setTps(tpsData);

      if (tpsData) {
        const petugas = await getTpsPetugas(tpsData.id);
        setPetugasList(petugas);
      }
    } catch (e: any) {
      setError(e.message || 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleAction = (action: string) => {
    setTpsActions((prev) =>
      prev.includes(action) ? prev.filter((a) => a !== action) : [...prev, action]
    );
  };

  const handleRegisterTps = async (e: React.FormEvent) => {
    e.preventDefault();
    if (tpsActions.length === 0) return setError('Pilih minimal satu aksi yang diperbolehkan.');

    setSubmitting(true);
    try {
      await registerTps({
        name: tpsName,
        type: tpsType,
        address: tpsAddress,
        city: tpsCity,
        province: tpsProvince,
        capacity_tons_per_day: tpsCapacity ? parseFloat(tpsCapacity) : undefined,
        coordinates: { type: 'Point', coordinates: [parseFloat(tpsLng), parseFloat(tpsLat)] },
        radius_m: parseInt(tpsRadius, 10),
        allowed_actions: tpsActions,
      });
      await loadData();
    } catch (e: any) {
      setError(e.message || 'Gagal mendaftarkan TPS');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.mobileContainer}>
        <div className={styles.loadingContainer}>Memuat Dashboard...</div>
      </div>
    );
  }

  return (
    <div className={styles.mobileContainer}>
      {/* ── Header ── */}
      <Header />

      <main className={styles.content}>
        {error && <div className={styles.errorBanner}>{error}</div>}

        {!tps && (
          <div className={styles.chartCard}>
            <h2 className={styles.chartTitle} style={{ textAlign: 'left' }}>Daftarkan TPS Anda</h2>
            <p style={{ color: '#737373', fontSize: '13px', marginBottom: '20px', fontFamily: 'Inter' }}>Isi informasi fasilitas untuk melacak analitik & kelola petugas.</p>
            <form onSubmit={handleRegisterTps}>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Nama TPS</label>
                <input type="text" className={styles.formInput} placeholder="TPS3R Kelurahan Menteng" value={tpsName} onChange={(e) => setTpsName(e.target.value)} required />
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Tipe TPS</label>
                <select className={styles.formSelect} value={tpsType} onChange={(e) => setTpsType(e.target.value)} required>
                  {TPS_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Kota</label>
                  <input type="text" className={styles.formInput} placeholder="Jakarta Selatan" value={tpsCity} onChange={(e) => setTpsCity(e.target.value)} required />
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Provinsi</label>
                  <input type="text" className={styles.formInput} placeholder="DKI Jakarta" value={tpsProvince} onChange={(e) => setTpsProvince(e.target.value)} required />
                </div>
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Alamat Lengkap</label>
                <textarea className={styles.formTextarea} placeholder="Jl. Contoh No. 123..." value={tpsAddress} onChange={(e) => setTpsAddress(e.target.value)} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Latitude</label>
                  <input type="number" step="any" className={styles.formInput} value={tpsLat} onChange={(e) => setTpsLat(e.target.value)} required />
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Longitude</label>
                  <input type="number" step="any" className={styles.formInput} value={tpsLng} onChange={(e) => setTpsLng(e.target.value)} required />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Radius (m)</label>
                  <input type="number" className={styles.formInput} value={tpsRadius} onChange={(e) => setTpsRadius(e.target.value)} required min={50} />
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Kapasitas (ton)</label>
                  <input type="number" step="0.1" className={styles.formInput} value={tpsCapacity} onChange={(e) => setTpsCapacity(e.target.value)} />
                </div>
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Aksi Diperbolehkan</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {ALL_BIZ_STEPS.map((step) => (
                    <label key={step.value} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', background: tpsActions.includes(step.value) ? '#4C9100' : '#f5f5f5', color: tpsActions.includes(step.value) ? '#fff' : '#333', padding: '6px 12px', borderRadius: '12px', cursor: 'pointer', fontFamily: 'Inter' }}>
                      <input type="checkbox" style={{ display: 'none' }} checked={tpsActions.includes(step.value)} onChange={() => toggleAction(step.value)} />
                      {step.label}
                    </label>
                  ))}
                </div>
              </div>
              <button type="submit" className={styles.submitBtn} disabled={submitting} style={{ marginTop: '8px' }}>
                {submitting ? 'Menyimpan...' : 'Daftarkan TPS'}
              </button>
            </form>
          </div>
        )}

        {tps && (
          <>
            {/* ── Dashboard Title ── */}
            <div className={styles.dashboardTitleArea}>
              <h1 className={styles.dashboardTitle}>Dashboard Admin <span>{tps.name}</span></h1>
              <p className={styles.dashboardSubtitle}>Ringkasan performa pengelolaan sampah produk Anda</p>
              <button className={styles.exportBtn}>
                <Icons.Download /> Ekspor PDF
              </button>
            </div>

            {/* ── Info Cards Horizontal Scroll ── */}
            <div className={styles.infoScrollWrapper}>
              <div className={styles.infoCard}>
                <div className={styles.infoHeader}>
                  <span className={styles.infoTitle}>Lokasi</span>
                  <div className={styles.infoIconBox}><Icons.Location /></div>
                </div>
                <div>
                  <h3 className={styles.infoValue}>{tps.city || 'Belum Diatur'}</h3>
                  <p className={styles.infoSubText}>{tps.province || tps.address}</p>
                </div>
              </div>

              <div className={styles.infoCard}>
                <div className={styles.infoHeader}>
                  <span className={styles.infoTitle}>Jangkauan Lokasi</span>
                  <div className={styles.infoIconBox}><Icons.Radius /></div>
                </div>
                <div>
                  <h3 className={styles.infoValue}>{tps.radius_m}</h3>
                  <p className={styles.infoSubText}>Jangkauan area pemindaian</p>
                </div>
              </div>

              <div className={styles.infoCard}>
                <div className={styles.infoHeader}>
                  <span className={styles.infoTitle}>Tahapan</span>
                  <div className={styles.infoIconBox}><Icons.Action /></div>
                </div>
                <div>
                  <p className={styles.infoSubText} style={{ marginBottom: '8px' }}>Tahapan yang dapat dilakukan</p>
                  <div className={styles.badges}>
                    {tps.allowed_actions.slice(0, 3).map(action => {
                      let mapClass = 'Lainnya';
                      if (action === 'inspecting') mapClass = 'Dipilah';
                      if (action === 'recycling') mapClass = 'Diproses';
                      return <span key={action} className={`${styles.badge} ${styles[mapClass]}`}>{action}</span>;
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Stats Grid 2x2 ── */}
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statHeader}>
                  <span className={styles.statTitle}>Volume Sampah</span>
                  <div className={styles.statIconBox}><Icons.Volume /></div>
                </div>
                <h3 className={styles.statValue}>1,2 Ton</h3>
                <div className={styles.statTrend}><Icons.TrendUp /> +12% dari bulan lalu</div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statHeader}>
                  <span className={styles.statTitle}>Total Sampah</span>
                  <div className={styles.statIconBox}><Icons.Total /></div>
                </div>
                <h3 className={styles.statValue}>28,350</h3>
                <div className={styles.statTrend}><Icons.TrendUp /> +15% dari bulan lalu</div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statHeader}>
                  <span className={styles.statTitle}>Hari ini</span>
                  <div className={styles.statIconBox}><Icons.CalendarDay /></div>
                </div>
                <h3 className={styles.statValue}>211</h3>
                <div className={styles.statTrend}><Icons.TrendUp /> +6% dari hari lalu</div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statHeader}>
                  <span className={styles.statTitle}>Minggu ini</span>
                  <div className={styles.statIconBox}><Icons.CalendarWeek /></div>
                </div>
                <h3 className={styles.statValue}>2,450</h3>
                <div className={styles.statTrend}><Icons.TrendUp /> +8% dari minggu lalu</div>
              </div>
            </div>

            {/* ── Donut Charts ── */}
            <div className={styles.chartCard}>
              <h2 className={styles.chartTitle}>Tahap Pengelolaan Sampah</h2>
              <div className={styles.donutContainer}>
                <div className={styles.donutWrapper}>
                  <div className={styles.donutStage}></div>
                  <div className={styles.donutCenter}>Diproses : 28</div>
                </div>
                <div className={styles.legendGrid}>
                  <div className={styles.legendItem}>
                    <div className={styles.legendColor} style={{ background: '#10B981' }}></div> Didaur Ulang: 42%
                  </div>
                  <div className={styles.legendItem}>
                    <div className={styles.legendColor} style={{ background: '#3B82F6' }}></div> Diproses: 28%
                  </div>
                  <div className={styles.legendItem}>
                    <div className={styles.legendColor} style={{ background: '#FD9D24' }}></div> Terkumpul: 18%
                  </div>
                  <div className={styles.legendItem}>
                    <div className={styles.legendColor} style={{ background: '#8B5CF6' }}></div> Diterima: 12%
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.chartCard}>
              <h2 className={styles.chartTitle}>Distribusi Kategori Sampah</h2>
              <div className={styles.donutContainer}>
                <div className={styles.donutWrapper}>
                  <div className={styles.donutCategory}></div>
                  <div className={styles.donutCenter}>Plastik PP : 28</div>
                </div>
                <div className={styles.legendGrid}>
                  <div className={styles.legendItem}>
                    <div className={styles.legendColor} style={{ background: '#10B981' }}></div> Plastik PET: 42%
                  </div>
                  <div className={styles.legendItem}>
                    <div className={styles.legendColor} style={{ background: '#3B82F6' }}></div> Plastik PP: 28%
                  </div>
                  <div className={styles.legendItem}>
                    <div className={styles.legendColor} style={{ background: '#FD9D24' }}></div> Aluminium: 18%
                  </div>
                  <div className={styles.legendItem}>
                    <div className={styles.legendColor} style={{ background: '#8B5CF6' }}></div> Kertas: 12%
                  </div>
                </div>
              </div>
            </div>

            {/* ── Leaderboard Table ── */}
            <div className={styles.tableCard}>
              <h2 className={styles.chartTitle} style={{ textAlign: 'left' }}>Produk Sampah Terbanyak</h2>
              <div className={styles.tableScroll}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}>Rank</th>
                      <th>Nama Produk</th>
                      <th>GTIN</th>
                      <th style={{ textAlign: 'right' }}>Jumlah</th>
                      <th style={{ textAlign: 'center' }}>Tren</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MOCK_LEADERBOARD.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div className={styles.rankBadge}>{item.id}</div>
                        </td>
                        <td className={styles.productName}>{item.name}</td>
                        <td><span className={styles.productGtin}>{item.gtin}</span></td>
                        <td className={styles.productTotal} style={{ textAlign: 'right' }}>{item.total}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`${styles.trendBadge} ${item.up ? styles.up : styles.down}`}>
                            {item.up ? <Icons.TrendUp /> : <Icons.TrendDown />}
                            {item.trend}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default AdminTpsDashboard;