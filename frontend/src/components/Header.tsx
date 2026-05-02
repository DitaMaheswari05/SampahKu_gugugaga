import React from 'react';
import styles from '../styles/Header.module.css';

const Header: React.FC = () => {
  return (
    <header className={styles.header}>
      {/* Bagian Kiri: Logo & Nama App */}
      <div className={styles.leftSection}>
        <div className={styles.logoBox}>
          {/* Icon Recycle */}
          <svg 
            className={styles.logoIcon} 
            viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <polyline points="21 8 21 2 15 2"></polyline>
            <polyline points="3 16 3 22 9 22"></polyline>
            <path d="M21 8 13 16"></path>
            <path d="M3 16 11 8"></path>
            <path d="M15 22h6v-6"></path>
            <path d="M9 2H3v6"></path>
          </svg>
        </div>
        <h1 className={styles.logoText}>SampahKu</h1>
      </div>

      {/* Bagian Kanan: Notifikasi, User, & Logout */}
      <div className={styles.rightSection}>
        <div className={styles.notification}>
          <svg 
            className={styles.bellIcon} 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
          <span className={styles.badge}>3</span>
        </div>

        <div className={styles.userInfo}>
          <span className={styles.greetingText}>
            Halo, <span className={styles.userName}>Alice Maharani</span>
          </span>
        </div>

        <button className={styles.logoutBtn} aria-label="Keluar">
          <svg 
            className={styles.logoutIcon} 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
        </button>
      </div>
    </header>
  );
};

export default Header;