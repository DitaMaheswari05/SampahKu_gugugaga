import React from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import styles from '../styles/Dashboard.module.css';

interface TrashItem {
  id: string;
  name: string;
  gtin: string;
  date: string;
  status: 'Didaur Ulang' | 'Diproses' | 'Dipilah' | 'Terkumpul';
}

//dummy data untuk daftar sampah
const trashListData: TrashItem[] = [
  { id: '1', name: 'Botol Aqua 600ml', gtin: '8992753020012', date: '2026-04-20', status: 'Didaur Ulang' },
  { id: '2', name: 'Kemasan Indomie', gtin: '8992775001034', date: '2026-04-22', status: 'Diproses' },
  { id: '3', name: 'Kaleng Coca-Cola', gtin: '8992761111045', date: '2026-04-24', status: 'Dipilah' },
  { id: '4', name: 'Botol Teh Pucuk', gtin: '8992753030023', date: '2026-04-25', status: 'Terkumpul' },
];

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Didaur Ulang': return styles.statusGreen;
      case 'Diproses': return styles.statusOrange;
      case 'Dipilah': return styles.statusYellow;
      case 'Terkumpul': return styles.statusBlue;
      default: return styles.statusDefault;
    }
  };

  const handleAddTrash = () => {
    navigate('/tambah-sampah');
  };

  const handleTrashDetail = (id: string) => {
    navigate(`/detail-sampah/${id}`);
  };

  return (
    <div className={styles.mobileContainer}>
      {/* Header Reusable Component */}
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
              <h3 className={styles.statValue}>4</h3>
              <p className={styles.statDesc}>Item terlacak</p>
            </div>

            {/* Card Didaur Ulang */}
            <div className={styles.statCard}>
              <div className={styles.statHeader}>
                <span className={styles.statLabel}>Didaur Ulang</span>
                <div className={styles.iconWrapper}>
                  <svg width="18" height="18" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8.63031 23.4238H5.93658C5.54771 23.425 5.16515 23.3255 4.82602 23.1352C4.48689 22.9449 4.2027 22.6702 4.00104 22.3377C3.80738 22.0038 3.70497 21.6247 3.70411 21.2387C3.70324 20.8526 3.80395 20.4732 3.99611 20.1383L8.87194 11.712" stroke="white" stroke-width="2.46565" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M13.561 23.4239H23.6739C24.0609 23.4209 24.4407 23.3184 24.7766 23.1262C25.1125 22.9341 25.3934 22.6587 25.5922 22.3266C25.7832 21.9936 25.8837 21.6164 25.8837 21.2325C25.8837 20.8486 25.7832 20.4714 25.5922 20.1384L24.0807 17.5248" stroke="white" stroke-width="2.46565" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M17.2595 19.7251L13.561 23.4236L17.2595 27.1221" stroke="white" stroke-width="2.46565" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M10.2224 16.7616L8.86997 11.712L3.82031 13.0656" stroke="white" stroke-width="2.46565" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M11.5205 7.16397L12.868 4.83146C13.0615 4.49415 13.3389 4.21259 13.6732 4.01408C14.0076 3.81557 14.3876 3.70686 14.7764 3.69849C15.1622 3.69777 15.5414 3.79855 15.8759 3.9907C16.2105 4.18286 16.4886 4.45963 16.6824 4.79324L21.5434 13.2295" stroke="white" stroke-width="2.46565" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M16.4932 11.8756L21.5428 13.2293L22.8952 8.17963" stroke="white" stroke-width="2.46565" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>

                </div>
              </div>
              <h3 className={styles.statValue}>1</h3>
              <p className={styles.statDesc}>Berhasil didaur ulang</p>
            </div>

            {/* Card Conversion Rate */}
            <div className={styles.statCard}>
              <div className={styles.statHeader}>
                <span className={styles.statLabel}>Conversion Rate</span>
                <div className={styles.iconWrapper}>
                  <svg width="18" height="18" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M11.0942 22.1909L18.4912 14.7939L11.0942 7.39697" stroke="white" stroke-width="2.46565" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>

                </div>
              </div>
              <h3 className={styles.statValue}>25%</h3>
              <p className={styles.statDesc}>Tingkat keberhasilan</p>
            </div>
          </div>
        </section>

        {/* Daftar Sampah Section */}
        <section className={styles.listSection}>
          <div className={styles.listHeader}>
            <h2 className={styles.sectionTitle}>Daftar Sampah</h2>
            <button className={styles.addButton} onClick={handleAddTrash}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Tambah Sampah
            </button>
          </div>

          <div className={styles.listContainer}>
            {trashListData.map((item) => (
              <div 
                key={item.id} 
                className={styles.listItem} 
                onClick={() => handleTrashDetail(item.id)}
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
                  <h4 className={styles.itemName}>{item.name}</h4>
                  <div className={styles.itemMeta}>
                    <span className={styles.gtinText}>GTIN: {item.gtin}</span>
                    <span className={styles.dot}>•</span>
                    <span className={styles.dateText}>{item.date}</span>
                  </div>
                </div>

                <div className={styles.itemRight}>
                  <span className={`${styles.statusBadge} ${getStatusStyle(item.status)}`}>
                    {item.status}
                  </span>
                  <svg className={styles.chevron} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#BBBBBB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Dashboard;