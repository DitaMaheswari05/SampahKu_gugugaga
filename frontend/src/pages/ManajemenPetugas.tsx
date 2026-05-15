import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { getMyTps, getTpsPetugas, createPetugas, TpsData, PetugasItem } from '../services/tps.service';
import styles from '../styles/ManajemenPetugas.module.css';

interface PetugasExtended extends PetugasItem {
  phone: string;
  area: string;
  totalUpdates: number;
  status: 'ACTIVE' | 'INACTIVE';
}

const ManajemenPetugas: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [petugasList, setPetugasList] = useState<PetugasExtended[]>([]);
  const [stats, setStats] = useState({ active: 0, total: 0 });
  const [tpsId, setTpsId] = useState<string | null>(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [petugasName, setPetugasName] = useState('');
  const [petugasEmail, setPetugasEmail] = useState('');
  const [petugasPassword, setPetugasPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError('');
      try {
        const tpsData: TpsData | null = await getMyTps();
        if (tpsData) {
          setTpsId(tpsData.id);
          const petugasData = await getTpsPetugas(tpsData.id);
          
          // Map data dari DB dan beri fallback data (mock) untuk field yang belum terdukung BE
          const mappedPetugas: PetugasExtended[] = petugasData.map((p) => ({
            ...p,
            phone: '-', // Fallback (Bisa diganti jika endpoint sudah menyediakan phone_number)
            area: tpsData.city || 'Tidak diketahui',
            totalUpdates: 0, // Fallback
            status: 'ACTIVE' // Default ACTIVE
          }));

          setPetugasList(mappedPetugas);

          // Kalkulasi Summary (Hanya Active + Total)
          const activeCount = mappedPetugas.filter(p => p.status === 'ACTIVE').length;

          setStats({
            active: activeCount,
            total: mappedPetugas.length,
          });
        } else {
          setError('Anda belum memiliki TPS yang terdaftar.');
        }
      } catch (e: any) {
        setError(e.message || 'Gagal memuat data petugas');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleDelete = (id: string) => {
    // Fungsi hapus dapat diintegrasikan dengan BE nantinya
    if(window.confirm('Hapus petugas ini?')) {
       console.log('Menghapus petugas dengan ID:', id);
    }
  };

  const handleCreatePetugas = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tpsId) return;
    setSubmitting(true);
    try {
      await createPetugas(tpsId, { name: petugasName, email: petugasEmail, password: petugasPassword });
      setPetugasName(''); setPetugasEmail(''); setPetugasPassword('');
      setShowModal(false);
      
      // Reload Data
      const tpsData = await getMyTps();
      if (tpsData) {
        const petugasData = await getTpsPetugas(tpsData.id);
        const mappedPetugas: PetugasExtended[] = petugasData.map((p) => ({
          ...p, phone: '-', area: tpsData.city || 'Tidak diketahui', totalUpdates: 0, status: 'ACTIVE'
        }));
        setPetugasList(mappedPetugas);
        setStats(prev => ({ active: mappedPetugas.filter(p => p.status === 'ACTIVE').length, total: mappedPetugas.length }));
      }
    } catch (e: any) {
      setError(e.message || 'Gagal membuat akun petugas');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <Header />
        <main className={styles.content}>
          <div className={styles.loadingContainer}>Memuat Data Petugas...</div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Header />

      <main className={styles.content}>
        <div className={styles.headerSection}>
          <div className={styles.headerTop}>
            <div>
              <h1 className={styles.title}>Manajemen Akun Petugas</h1>
              <p className={styles.subtitle}>Kelola akun petugas pengelola sampah</p>
            </div>
            {tpsId && (
              <button className={styles.addPetugasBtn} onClick={() => setShowModal(true)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                Tambah Petugas
              </button>
            )}
          </div>
        </div>

        {error && <div className={styles.errorBanner}>{error}</div>}

        {/* --- 2 Summary Cards (Grid) --- */}
        <div className={styles.summaryGrid}>
          {/* Card 1: Active */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={`${styles.cardTitle} ${styles.textActive}`}>Active</span>
              <div className={`${styles.iconBox} ${styles.iconActive}`}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/>
                </svg>
              </div>
            </div>
            <div className={styles.cardValue}>{stats.active}</div>
            <div className={styles.cardLabel}>Petugas Aktif</div>
          </div>

          {/* Card 2: Total (renamed from Card 3) */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={`${styles.cardTitle} ${styles.textTotal}`}>Total</span>
              <div className={`${styles.iconBox} ${styles.iconTotal}`}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
                </svg>
              </div>
            </div>
            <div className={styles.cardValue}>{stats.total}</div>
            <div className={styles.cardLabel}>Total Updates</div>
          </div>
        </div>

        {/* --- Table List --- */}
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nama Petugas</th>
                <th>Email</th>
                <th>No. Telepon</th>
                <th>Area Tugas</th>
                <th>Total Update</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {petugasList.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '24px' }}>
                    Belum ada petugas terdaftar.
                  </td>
                </tr>
              ) : (
                petugasList.map((petugas) => (
                  <tr key={petugas.id}>
                    <td>
                      <div className={styles.tdUser}>
                        <span className={styles.userName}>{petugas.name}</span>
                        <span className={styles.userDate}>
                          Sejak {new Date(petugas.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-')}
                        </span>
                      </div>
                    </td>
                    <td className={styles.textData}>{petugas.email}</td>
                    <td className={styles.textData}>{petugas.phone}</td>
                    <td>
                      <span className={styles.badgeArea}>{petugas.area}</span>
                    </td>
                    <td className={styles.textBoldData} style={{ textAlign: 'center' }}>{petugas.totalUpdates}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button className={styles.btnDelete} onClick={() => handleDelete(petugas.id)} aria-label="Hapus Petugas">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"/>
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Add Petugas Modal ── */}
        {showModal && (
          <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
            <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h3 className={styles.modalTitle}>Tambah Petugas Baru</h3>
                <button className={styles.modalCloseBtn} onClick={() => setShowModal(false)}>&times;</button>
              </div>
              <form onSubmit={handleCreatePetugas}>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Nama Lengkap</label>
                  <input type="text" className={styles.formInput} placeholder="Nama petugas" value={petugasName} onChange={e => setPetugasName(e.target.value)} required />
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Email</label>
                  <input type="email" className={styles.formInput} placeholder="email@contoh.com" value={petugasEmail} onChange={e => setPetugasEmail(e.target.value)} required />
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Password</label>
                  <input type="password" className={styles.formInput} placeholder="Minimal 6 karakter" value={petugasPassword} onChange={e => setPetugasPassword(e.target.value)} required minLength={6} />
                </div>
                <div className={styles.modalActions}>
                  <button type="button" className={styles.btnCancel} onClick={() => setShowModal(false)}>Batal</button>
                  <button type="submit" className={styles.submitBtn} disabled={submitting}>
                    {submitting ? 'Menyimpan...' : 'Simpan'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ManajemenPetugas;