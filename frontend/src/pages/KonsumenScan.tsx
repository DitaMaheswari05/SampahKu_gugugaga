import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import Header from '../components/Header';
import { resolveGS1Link, discardInstance, discardBarcode } from '../services/konsumen.service';
import styles from '../styles/KonsumenScan.module.css';


type ScanStep = 'scan' | 'preview' | 'success' | 'error';

export default function KonsumenScan() {
  const navigate = useNavigate();
  const [step, setStep] = useState<ScanStep>('scan');
  const [instance, setInstance] = useState<any>(null);
  const [scannedGtin, setScannedGtin] = useState<string | null>(null);
  const [scanType, setScanType] = useState<'TIER_1' | 'TIER_2' | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => { stopScanner(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopScanner = useCallback(async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (err) {
        console.error('Gagal menghentikan kamera:', err);
      }
    }
    setIsCameraOpen(false);
  }, []);

  const handleResolved = useCallback(async (decodedText: string) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const isGS1DigitalLink = decodedText.includes('/01/');
      const isStandardBarcode = /^\d{8,14}$/.test(decodedText);

      if (isGS1DigitalLink) {
        const data = await resolveGS1Link(decodedText);
        setInstance(data);
        setScannedGtin(null);
        setScanType('TIER_1');
      } else if (isStandardBarcode) {
        setInstance(null);
        setScannedGtin(decodedText);
        setScanType('TIER_2');
      } else {
        throw new Error('Format QR/barcode tidak dikenali. Gunakan GS1 Digital Link atau barcode 8-14 digit.');
      }
      setStep('preview');
    } catch (err: any) {
      setErrorMsg(err.message);
      setStep('scan');
    } finally {
      setLoading(false);
    }
  }, []);

  const onScanSuccess = useCallback(async (decodedText: string) => {
    await stopScanner();
    handleResolved(decodedText);
  }, [stopScanner, handleResolved]);

  const startScanner = async () => {
    setErrorMsg('');
    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode('qr-reader');
      }
      await html5QrCodeRef.current.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        onScanSuccess,
        (_err: any) => { /* Abaikan error per-frame */ }
      );
      setIsCameraOpen(true);
    } catch (err: any) {
      console.error('Gagal memulai kamera:', err);
      setErrorMsg('Gagal mengakses kamera. Pastikan izin kamera telah diberikan.');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setErrorMsg('');
    await stopScanner();
    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode('qr-reader');
      }
      const decodedText = await html5QrCodeRef.current.scanFile(file, true);
      html5QrCodeRef.current.clear();
      await handleResolved(decodedText);
    } catch (err: any) {
      setErrorMsg('Gagal membaca QR code dari gambar. Pastikan gambar jelas.');
      setStep('scan');
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleConfirm = async () => {
    if (!instance && !scannedGtin) return;
    setLoading(true);
    setErrorMsg('');
    try {
      if (scanType === 'TIER_1' && instance) {
        await discardInstance(instance.id);
      } else if (scanType === 'TIER_2' && scannedGtin) {
        await discardBarcode(scannedGtin);
      }
      setStep('success');
    } catch (err: any) {
      setErrorMsg(err.message);
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  const handleRetake = () => {
    setInstance(null);
    setScannedGtin(null);
    setScanType(null);
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
                <div id="qr-reader" className={styles.scannerContainer}></div>
                {loading && <p className={styles.loadingText}>Memproses...</p>}
                {!loading && !isCameraOpen && (
                  <>
                    <p className={styles.cameraText}>Arahkan kamera ke QR code</p>
                    <p className={styles.cameraSubText}>atau gunakan tombol di bawah</p>
                  </>
                )}
              </div>

              {!isCameraOpen ? (
                <button className={styles.btnPrimary} onClick={startScanner}>
                  Mulai Pemindaian
                </button>
              ) : (
                <button className={styles.btnPrimary} onClick={stopScanner} style={{ backgroundColor: '#FB2C36' }}>
                  Stop Pemindaian
                </button>
              )}

              <button className={styles.btnSecondary} onClick={() => fileInputRef.current?.click()}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                Upload Gambar QR Code
              </button>

              <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} />
            </>
          )}

          {/* STATE 2: PREVIEW DATA SEBELUM KONFIRMASI */}
          {step === 'preview' && scanType === 'TIER_1' && instance && (
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
                    <span className={styles.infoValue}>{instance.products?.profiles?.name || 'Brand Terdaftar'}</span>
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
                <button className={styles.btnPrimary} onClick={handleConfirm} disabled={loading}>
                  {loading ? 'Menyimpan...' : 'Konfirmasi Buang Sampah'}
                </button>
                <button className={styles.btnSecondary} onClick={handleRetake} disabled={loading}>
                  Pindai Ulang
                </button>
              </div>
            </>
          )}

          {step === 'preview' && scanType === 'TIER_2' && scannedGtin && (
            <>
              <div className={styles.qrPlaceholder}>
                <img src="/assets/logo_qr.png" alt="Barcode Preview" className={styles.qrImage} />
              </div>

              <div className={styles.infoContainer}>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Tipe</span>
                  <span className={styles.infoValue}>Barcode Scan</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>GTIN</span>
                  <span className={`${styles.infoValue} ${styles.infoValueMono}`}>{scannedGtin}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Catatan</span>
                  <span className={styles.infoValue}>Produk akan dicatat sebagai histori agregat.</span>
                </div>
              </div>

              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '10px' }}>
                <button className={styles.btnPrimary} onClick={handleConfirm} disabled={loading}>
                  {loading ? 'Menyimpan...' : 'Konfirmasi Buang Barcode'}
                </button>
                <button className={styles.btnSecondary} onClick={handleRetake} disabled={loading}>
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
                <button className={styles.btnPrimary} onClick={() => navigate('/dashboard')}>
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
                <p className={styles.statusDesc}>{errorMsg || 'Sampah gagal ditambahkan ke Circular Wallet'}</p>
              </div>
              <div style={{ width: '100%', marginTop: '10px' }}>
                <button className={styles.btnSecondary} onClick={handleRetake}>
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
