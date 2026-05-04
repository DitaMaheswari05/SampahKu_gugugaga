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

const statsTemplate: StatCard[] = [
  {
    label: 'Total Poin',
    value: '0',
    iconClassName: styles.iconOrange,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 17.5l-4.2 2.2 0.8-4.7-3.4-3.3 4.7-0.7L12 6.5l2.1 4.5 4.7 0.7-3.4 3.3 0.8 4.7z" />
      </svg>
    ),
  },
  {
    label: 'Total Pembaruan',
    value: '0',
    iconClassName: styles.iconBlue,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 14l5-5 4 4 7-7" />
        <path d="M14 6h6v6" />
      </svg>
    ),
  },
  {
    label: 'Progress Reward',
    value: '0%',
    iconClassName: styles.iconYellow,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 4h12v4a6 6 0 0 1-12 0V4z" />
        <path d="M6 8H4a2 2 0 0 0 0 4h2" />
        <path d="M18 8h2a2 2 0 0 1 0 4h-2" />
        <path d="M8 20h8" />
        <path d="M12 12v4" />
      </svg>
    ),
  },
];

const PetugasDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [profileName, setProfileName] = React.useState('Memuat...');
  const [profileEmail, setProfileEmail] = React.useState('');
  const [summary, setSummary] = React.useState({
    totalPoints: 0,
    totalUpdates: 0,
    progressReward: 0,
    remainingPoints: 0,
  });
  const [activities, setActivities] = React.useState<PetugasActivityItem[]>([]);

  React.useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      setError('');

      try {
        const data = await getPetugasDashboard();
        setProfileName(data.profile.name);
        setProfileEmail(data.profile.email);
        setSummary(data.summary);
        setActivities(data.activities);
      } catch (e: any) {
        setError(e.message || 'Gagal memuat dashboard petugas');
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const stats = React.useMemo(() => {
    return statsTemplate.map((item) => {
      if (item.label === 'Total Poin') {
        return { ...item, value: `${summary.totalPoints}` };
      }

      if (item.label === 'Total Pembaruan') {
        return { ...item, value: `${summary.totalUpdates}` };
      }

      return { ...item, value: `${Math.round(summary.progressReward)}%` };
    });
  }, [summary]);

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

        <section className={styles.progressCard}>
          <div className={styles.progressHeader}>
            <span>Progress ke Reward Berikutnya</span>
            <strong>{summary.totalPoints} / {summary.totalPoints + summary.remainingPoints}</strong>
          </div>

          <div className={styles.progressTrack} aria-hidden="true">
            <div className={styles.progressFill} style={{ width: `${summary.progressReward}%` }} />
          </div>

          <p className={styles.progressNote}>{summary.remainingPoints} poin lagi untuk reward spesial</p>
        </section>

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

                <div className={styles.pointsBadge}>{activity.points}</div>
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