import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import Header from '../components/Header';
import styles from '../styles/KonsumenScan.module.css';

const API_URL = 'http://localhost:5000';

type ScanStep = 'scan' | 'preview' | 'success' | 'error';

export default function KonsumenScan() {
  const navigate = useNavigate();
  const [step, setStep] = useState<ScanStep>('scan');
  const [instance, setInstance] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pastikan hanya role konsumen yang menggunakan halaman ini
  useEffect(() => {
    const role = localStorage.getItem('role');
    if (role && role !== 'KONSUMEN') {
      if (role === 'PETUGAS') navigate('/scan');
      else if (role === 'BRAND') navigate('/products');
    }
  }, [navigate]);

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  const startScanner = async () => {
    setErrorMsg('');
    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode("qr-reader");
      }
      
      await html5QrCodeRef.current.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        onScanSuccess,
        onScanFailure
      );
      setIsCameraOpen(true);
    } catch (err: any) {
      console.error("Gagal memulai kamera:", err);
      setErrorMsg("Gagal mengakses kamera. Pastikan izin kamera telah diberikan.");
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (err) {
        console.error("Gagal menghentikan kamera:", err);
      }
    }
    setIsCameraOpen(false);
  };

  const onScanSuccess = async (decodedText: string) => {
    await stopScanner(); // Otomatis matikan kamera saat berhasil scan
    resolveGS1Link(decodedText);
  };

  const onScanFailure = (err: any) => {
  };

  // Fungsi Scan dari Upload File Gambar
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      setErrorMsg('');
      
      // Pastikan kamera mati sebelum upload file
      await stopScanner();

      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode("qr-reader");
      }
      
      const decodedText = await html5QrCodeRef.current.scanFile(file, true);
      html5QrCodeRef.current.clear();
      resolveGS1Link(decodedText);
    } catch (err: any) {
      setErrorMsg("Gagal membaca QR code dari gambar. Pastikan gambar jelas.");
      setStep('scan');
    } finally {
      setLoading(false);
      // Reset input agar bisa upload file yang sama lagi
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Resolve GS1 Link ke Backend
  const resolveGS1Link = async (url: string) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const parts = url.split('/');
      const gtinIndex = parts.indexOf('01') + 1;
      const serialIndex = parts.indexOf('21') + 1;
      const batchIndex = parts.indexOf('10') + 1;

      const gtin = parts[gtinIndex];
      const serial = serialIndex > 0 ? parts[serialIndex] : null;
      const batch = batchIndex > 0 ? parts[batchIndex] : null;

      if (!gtin || (!serial && !batch)) {
        throw new Error('Format QR bukan GS1 Digital Link yang valid.');
      }

      let query = `?gtin=${gtin}`;
      if (serial) query += `&serial=${serial}`;
      if (batch) query += `&batch=${batch}`;

      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/products/resolve${query}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Gagal memuat data produk');
      
      setInstance(data.data);
      setStep('preview');
    } catch (err: any) {
      setErrorMsg(err.message);
      setStep('scan'); // Kembali ke mode scan jika lookup gagal
    } finally {
      setLoading(false);
    }
  };

  // Submit Aktivitas (Konfirmasi Buang Sampah)
  const handleConfirm = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const token = localStorage.getItem('token');
      const payload = {
        biz_step: 'discarding',
        location_name: 'Pembuangan Konsumen',
        facility_type: 'RUMAH'
      };

      const res = await fetch(`${API_URL}/instances/${instance.id}/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Gagal menyimpan data sampah');

      setStep('success');
    } catch (err: any) {
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  // Reset State ke Awal Pemindaian
  const handleRetake = () => {
    setInstance(null);
    setErrorMsg('');
    setStep('scan');
  };

  return (
    <div className={styles.mobileContainer}>
      <Header />
      
      <main className={styles.content}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>Pindai QR Code</h1>
          <p className={styles.subtitle}>Pindai QR code pada produk sebelum membuang sampah</p>
        </div>

        {errorMsg && step === 'scan' && <div className={styles.errorAlert}>{errorMsg}</div>}

        <div className={styles.card}>
          
          {/* STATE 1: SCANNING */}
          {step === 'scan' && (
            <>
              <div className={styles.cameraBox}>
                {/* DIV INI WAJIB ADA AGAR HTML5-QRCODE BISA ME-RENDER KAMERA */}
                <div id="qr-reader" className={styles.scannerContainer}></div>
                
                {loading && <p className={styles.loadingText}>Memproses...</p>}
                
                {!loading && !isCameraOpen && (
                  <>
                    <p className={styles.cameraText}>Arahkan kamera ke QR code</p>
                    <p className={styles.cameraSubText}>atau gunakan tombol di bawah</p>
                  </>
                )}
              </div>

              {/* Dynamic Button untuk Kamera */}
              {!isCameraOpen ? (
                <button 
                  className={styles.btnPrimary} 
                  onClick={startScanner}
                >
                  Mulai Pemindaian
                </button>
              ) : (
                <button 
                  className={styles.btnPrimary} 
                  onClick={stopScanner}
                  style={{ backgroundColor: '#FB2C36' }} // Menggunakan warna merah saat aktif
                >
                  Stop Pemindaian
                </button>
              )}

              <button 
                className={styles.btnSecondary} 
                onClick={() => fileInputRef.current?.click()}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                Upload Gambar QR Code
              </button>
              
              <input 
                type="file" 
                accept="image/*" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                onChange={handleFileUpload} 
              />
            </>
          )}

          {/* STATE 2: PREVIEW DATA SEBELUM KONFIRMASI */}
          {step === 'preview' && instance && (
            <>
              <div className={styles.qrPlaceholder}>
                <img src="/assets/logo_qr.png" alt="QR Preview" className={styles.qrImage} />
              </div>

              <div className={styles.infoContainer}>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Nama Produk</span>
                  <span className={styles.infoValue}>{instance.products?.product_name || 'Tidak diketahui'}</span>
                </div>

                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>GTIN</span>
                  <span className={`${styles.infoValue} ${styles.infoValueMono}`}>{instance.gtin}</span>
                </div>

                <div className={styles.infoGrid}>
                  <div className={styles.infoRow}>
                    <span className={`${styles.infoLabel} ${styles.infoLabelBrand}`}>Brand</span>
                    <span className={styles.infoValue}>
                       {instance.products?.profiles?.name || 'Brand Terdaftar'}
                    </span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={`${styles.infoLabel} ${styles.infoLabelBrand}`}>Kategori</span>
                    <span className={styles.infoValue}>{instance.products?.category || 'Tidak diketahui'}</span>
                  </div>
                </div>

                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Produsen</span>
                  <span className={styles.infoValue}>{instance.products?.profiles?.name || 'Tidak diketahui'}</span>
                </div>
              </div>

              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '10px' }}>
                <button 
                  className={styles.btnPrimary} 
                  onClick={handleConfirm}
                  disabled={loading}
                >
                  {loading ? 'Menyimpan...' : 'Konfirmasi'}
                </button>
                <button 
                  className={styles.btnSecondary} 
                  onClick={handleRetake}
                  disabled={loading}
                >
                  Pindai Ulang
                </button>
              </div>
            </>
          )}

          {/* STATE 3: BERHASIL (SUCCESS) */}
          {step === 'success' && (
            <div className={styles.statusContainer}>
              <div className={`${styles.iconCircle} ${styles.iconGreen}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'white' }}>
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="8 12 11 15 16 9"></polyline>
                </svg>
              </div>
              <div>
                <h2 className={styles.statusTitle}>Berhasil!</h2>
                <p className={styles.statusDesc}>Sampah berhasil ditambahkan ke Circular Wallet</p>
              </div>
              <div style={{ width: '100%', marginTop: '10px' }}>
                <button 
                  className={styles.btnPrimary} 
                  onClick={() => navigate('/dashboard')}
                >
                  Kembali ke Dashboard
                </button>
              </div>
            </div>
          )}

          {/* STATE 4: GAGAL (ERROR) */}
          {step === 'error' && (
            <div className={styles.statusContainer}>
              <div className={`${styles.iconCircle} ${styles.iconRed}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'white' }}>
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="15" y1="9" x2="9" y2="15"></line>
                  <line x1="9" y1="9" x2="15" y2="15"></line>
                </svg>
              </div>
              <div>
                <h2 className={styles.statusTitle}>Gagal!</h2>
                <p className={styles.statusDesc}>Sampah gagal ditambahkan ke Circular Wallet</p>
              </div>
              <div style={{ width: '100%', marginTop: '10px' }}>
                <button 
                  className={styles.btnSecondary} 
                  onClick={handleRetake}
                >
                  Pindai Ulang
                </button>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}