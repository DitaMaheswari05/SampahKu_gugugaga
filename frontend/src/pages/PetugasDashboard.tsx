import React from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import styles from '../styles/PetugasDashboard.module.css';
import { getPetugasDashboard, PetugasActivityItem } from '../services/petugas.service';

type StatCard = {
  label: string;
  value: string;
  icon: React.ReactNode;
  iconClassName: string;
};

const PetugasDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [profileName, setProfileName] = React.useState('Memuat...');
  const [profileEmail, setProfileEmail] = React.useState('');
  const [totalUpdates, setTotalUpdates] = React.useState(0);
  const [tpsName, setTpsName] = React.useState<string | null>(null);
  const [tpsType, setTpsType] = React.useState<string | null>(null);
  const [tpsActions, setTpsActions] = React.useState<string[]>([]);
  const [activities, setActivities] = React.useState<PetugasActivityItem[]>([]);

  React.useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      setError('');

      try {
        const data = await getPetugasDashboard();
        setProfileName(data.profile.name);
        setProfileEmail(data.profile.email);
        setTotalUpdates(data.summary.totalUpdates);
        setActivities(data.activities);

        if (data.tps) {
          setTpsName(data.tps.name);
          setTpsType(data.tps.type);
          setTpsActions(data.tps.allowed_actions || []);
        }
      } catch (e: any) {
        setError(e.message || 'Gagal memuat dashboard petugas');
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const stats: StatCard[] = [
    {
      label: 'Total Pembaruan',
      value: `${totalUpdates}`,
      iconClassName: styles.iconBlue,
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 14l5-5 4 4 7-7" />
          <path d="M14 6h6v6" />
        </svg>
      ),
    },
    {
      label: 'TPS',
      value: tpsName || 'Belum terikat',
      iconClassName: styles.iconOrange,
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      ),
    },
  ];

  return (
    <div className={styles.page}>
      <Header />

      <main className={styles.content}>
        {error && <div className={styles.errorBanner}>{error}</div>}

        <section className={styles.profileCard}>
          <div className={styles.profileMain}>
            <div className={styles.avatar} aria-hidden="true">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>

            <div className={styles.profileText}>
              <h1 className={styles.profileName}>{profileName}</h1>
              <p className={styles.profileEmail}>{profileEmail || ' '}</p>
              <span className={styles.roleBadge}>Petugas Pengelola Sampah</span>
            </div>
          </div>

          <button className={styles.scanButton} onClick={() => navigate('/scan')} disabled={loading}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 7V4h3" />
              <path d="M20 7V4h-3" />
              <path d="M4 17v3h3" />
              <path d="M20 17v3h-3" />
              <path d="M7 7h10v10H7z" />
            </svg>
            Pindai QR
          </button>
        </section>

        <section className={styles.statsGrid}>
          {stats.map((stat) => (
            <article key={stat.label} className={styles.statCard}>
              <div className={styles.statHeader}>
                <div className={`${styles.statIcon} ${stat.iconClassName}`}>{stat.icon}</div>
                <span className={styles.statLabel}>{stat.label}</span>
              </div>
              <div className={styles.statValue}>{stat.value}</div>
            </article>
          ))}
        </section>

        {/* TPS Info Section */}
        {tpsName && (
          <section className={styles.progressCard}>
            <div className={styles.progressHeader}>
              <span>Info TPS — {tpsType}</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '8px 0' }}>
              {tpsActions.map((action) => (
                <span key={action} style={{
                  fontSize: '11px',
                  fontWeight: 500,
                  padding: '4px 10px',
                  borderRadius: '16px',
                  background: '#fff3e0',
                  color: '#e65100',
                }}>
                  {action}
                </span>
              ))}
            </div>
            <p className={styles.progressNote}>Aksi yang diperbolehkan oleh TPS Anda</p>
          </section>
        )}

        <section className={styles.activitySection}>
          <h2 className={styles.sectionTitle}>Riwayat Aktivitas</h2>

          <div className={styles.activityList}>
            {activities.map((activity) => (
              <article key={activity.id} className={styles.activityItem}>
                <div className={styles.activityText}>
                  <h3 className={styles.activityTitle}>{activity.title}</h3>
                  <p className={styles.activityMeta}>
                    <span>{activity.date}</span>
                    <span className={styles.metaDot}>•</span>
                    <span>{activity.location}</span>
                  </p>
                </div>
              </article>
            ))}

            {!loading && activities.length === 0 && !error && (
              <div className={styles.emptyState}>Belum ada riwayat aktivitas petugas.</div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default PetugasDashboard;