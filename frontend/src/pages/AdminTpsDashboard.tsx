import React, { useState, useEffect, useCallback } from 'react';
import Header from '../components/Header';
import {
  getMyTps,
  registerTps,
  createPetugas,
  getTpsPetugas,
  TpsData,
  PetugasItem,
  CreateTpsPayload,
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

const AdminTpsDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tps, setTps] = useState<TpsData | null>(null);
  const [petugasList, setPetugasList] = useState<PetugasItem[]>([]);
  const [showModal, setShowModal] = useState(false);

  // Register TPS form state
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

  // Create petugas modal state
  const [petugasName, setPetugasName] = useState('');
  const [petugasEmail, setPetugasEmail] = useState('');
  const [petugasPassword, setPetugasPassword] = useState('');

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
    setError('');

    if (tpsActions.length === 0) {
      setError('Pilih minimal satu aksi yang diperbolehkan.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: CreateTpsPayload = {
        name: tpsName,
        type: tpsType,
        address: tpsAddress,
        city: tpsCity,
        province: tpsProvince,
        capacity_tons_per_day: tpsCapacity ? parseFloat(tpsCapacity) : undefined,
        coordinates: {
          type: 'Point',
          coordinates: [parseFloat(tpsLng), parseFloat(tpsLat)],
        },
        radius_m: parseInt(tpsRadius, 10),
        allowed_actions: tpsActions,
      };

      await registerTps(payload);
      await loadData();
    } catch (e: any) {
      setError(e.message || 'Gagal mendaftarkan TPS');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreatePetugas = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tps) return;
    setError('');
    setSubmitting(true);
    try {
      await createPetugas(tps.id, {
        name: petugasName,
        email: petugasEmail,
        password: petugasPassword,
      });
      setPetugasName('');
      setPetugasEmail('');
      setPetugasPassword('');
      setShowModal(false);
      const petugas = await getTpsPetugas(tps.id);
      setPetugasList(petugas);
    } catch (e: any) {
      setError(e.message || 'Gagal membuat akun petugas');
    } finally {
      setSubmitting(false);
    }
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation tidak didukung oleh browser Anda.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setTpsLat(pos.coords.latitude.toFixed(6));
        setTpsLng(pos.coords.longitude.toFixed(6));
      },
      () => {
        setError('Gagal mendapatkan lokasi. Pastikan izin GPS aktif.');
      }
    );
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <Header />
        <main className={styles.content}>
          <div className={styles.loadingContainer}>Memuat...</div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Header />

      <main className={styles.content}>
        {error && <div className={styles.errorBanner}>{error}</div>}

        {/* === STATE: NO TPS — Show Registration Form === */}
        {!tps && (
          <div className={styles.registerCard}>
            <h1 className={styles.registerTitle}>Daftarkan TPS Anda</h1>
            <p className={styles.registerSubtitle}>
              Isi informasi TPS untuk mulai mengelola petugas dan tracking sampah.
            </p>

            <form onSubmit={handleRegisterTps} className={styles.form}>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Nama TPS</label>
                <input
                  type="text"
                  className={styles.formInput}
                  placeholder="Contoh: TPS3R Kelurahan Menteng"
                  value={tpsName}
                  onChange={(e) => setTpsName(e.target.value)}
                  required
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.formLabel}>Tipe TPS</label>
                <select
                  className={styles.formSelect}
                  value={tpsType}
                  onChange={(e) => setTpsType(e.target.value)}
                  required
                >
                  {TPS_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className={styles.formField}>
                <label className={styles.formLabel}>Alamat Lengkap</label>
                <textarea
                  className={styles.formTextarea}
                  placeholder="Jl. Contoh No. 123, Kelurahan, Kecamatan"
                  value={tpsAddress}
                  onChange={(e) => setTpsAddress(e.target.value)}
                  required
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.formLabel}>Kota</label>
                <input
                  type="text"
                  className={styles.formInput}
                  placeholder="Contoh: Jakarta Selatan"
                  value={tpsCity}
                  onChange={(e) => setTpsCity(e.target.value)}
                  required
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.formLabel}>Provinsi</label>
                <input
                  type="text"
                  className={styles.formInput}
                  placeholder="Contoh: DKI Jakarta"
                  value={tpsProvince}
                  onChange={(e) => setTpsProvince(e.target.value)}
                  required
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.formLabel}>Koordinat (Lat, Lng)</label>
                <div className={styles.coordRow}>
                  <input
                    type="number"
                    step="any"
                    className={styles.formInput}
                    placeholder="Latitude"
                    value={tpsLat}
                    onChange={(e) => setTpsLat(e.target.value)}
                    required
                  />
                  <input
                    type="number"
                    step="any"
                    className={styles.formInput}
                    placeholder="Longitude"
                    value={tpsLng}
                    onChange={(e) => setTpsLng(e.target.value)}
                    required
                  />
                </div>
                <button
                  type="button"
                  onClick={useCurrentLocation}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary, #4caf50)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: '4px 0',
                    fontFamily: "'Poppins', sans-serif",
                  }}
                >
                  📍 Gunakan lokasi saat ini
                </button>
              </div>

              <div className={styles.formField}>
                <label className={styles.formLabel}>Radius Geofence (meter)</label>
                <input
                  type="number"
                  className={styles.formInput}
                  placeholder="200"
                  value={tpsRadius}
                  onChange={(e) => setTpsRadius(e.target.value)}
                  required
                  min={50}
                  max={5000}
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.formLabel}>Kapasitas (ton/hari)</label>
                <input
                  type="number"
                  step="0.1"
                  className={styles.formInput}
                  placeholder="Contoh: 45.5"
                  value={tpsCapacity}
                  onChange={(e) => setTpsCapacity(e.target.value)}
                  min={0}
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.formLabel}>Aksi yang Diperbolehkan</label>
                <div className={styles.checkboxGrid}>
                  {ALL_BIZ_STEPS.map((step) => (
                    <label
                      key={step.value}
                      className={`${styles.checkboxLabel} ${tpsActions.includes(step.value) ? styles.checkboxActive : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={tpsActions.includes(step.value)}
                        onChange={() => toggleAction(step.value)}
                      />
                      {step.label}
                    </label>
                  ))}
                </div>
              </div>

              <button type="submit" className={styles.submitBtn} disabled={submitting}>
                {submitting ? 'Mendaftarkan...' : 'Daftarkan TPS'}
              </button>
            </form>
          </div>
        )}

        {/* === STATE: TPS EXISTS — Show Info + Petugas Management === */}
        {tps && (
          <>
            {/* TPS Info Card */}
            <div className={styles.tpsCard}>
              <div className={styles.tpsHeader}>
                <div>
                  <h1 className={styles.tpsName}>{tps.name}</h1>
                  <span className={styles.tpsType}>{tps.type}</span>
                </div>
              </div>

              <div className={styles.tpsInfo}>
                <div className={styles.tpsInfoRow}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                  <span>{tps.address}</span>
                </div>

                <div className={styles.tpsInfoRow}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                  <span>Radius geofence: {tps.radius_m}m</span>
                </div>

                <div className={styles.tpsInfoRow}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 11 12 14 22 4"/>
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                  </svg>
                  <div>
                    <span>Aksi diperbolehkan:</span>
                    <div className={styles.actionBadges}>
                      {tps.allowed_actions.map((a) => (
                        <span key={a} className={styles.actionBadge}>{a}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Petugas Management */}
            <div className={styles.petugasSection}>
              <div className={styles.petugasSectionHeader}>
                <h2 className={styles.sectionTitle}>Petugas ({petugasList.length})</h2>
                <button className={styles.addPetugasBtn} onClick={() => setShowModal(true)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  Tambah
                </button>
              </div>

              <div className={styles.petugasList}>
                {petugasList.length === 0 ? (
                  <div className={styles.emptyState}>
                    Belum ada petugas terdaftar. Tambahkan petugas untuk mulai tracking.
                  </div>
                ) : (
                  petugasList.map((p) => (
                    <div key={p.id} className={styles.petugasItem}>
                      <div className={styles.petugasInfo}>
                        <h4>{p.name}</h4>
                        <p>{p.email}</p>
                      </div>
                      <span className={styles.petugasDate}>
                        {new Date(p.created_at).toLocaleDateString('id-ID', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Create Petugas Modal */}
            {showModal && (
              <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
                <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
                  <div className={styles.modalHeader}>
                    <h3 className={styles.modalTitle}>Tambah Petugas Baru</h3>
                    <button className={styles.modalCloseBtn} onClick={() => setShowModal(false)}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>

                  <form onSubmit={handleCreatePetugas} className={styles.form}>
                    <div className={styles.formField}>
                      <label className={styles.formLabel}>Nama Lengkap</label>
                      <input
                        type="text"
                        className={styles.formInput}
                        placeholder="Nama petugas"
                        value={petugasName}
                        onChange={(e) => setPetugasName(e.target.value)}
                        required
                      />
                    </div>
                    <div className={styles.formField}>
                      <label className={styles.formLabel}>Email</label>
                      <input
                        type="email"
                        className={styles.formInput}
                        placeholder="email@contoh.com"
                        value={petugasEmail}
                        onChange={(e) => setPetugasEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className={styles.formField}>
                      <label className={styles.formLabel}>Password</label>
                      <input
                        type="password"
                        className={styles.formInput}
                        placeholder="Minimal 6 karakter"
                        value={petugasPassword}
                        onChange={(e) => setPetugasPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                    </div>
                    <div className={styles.modalActions}>
                      <button type="button" className={styles.btnCancel} onClick={() => setShowModal(false)}>
                        Batal
                      </button>
                      <button type="submit" className={styles.submitBtn} disabled={submitting}>
                        {submitting ? 'Membuat...' : 'Buat Petugas'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default AdminTpsDashboard;
