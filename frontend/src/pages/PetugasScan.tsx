import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import Header from '../components/Header';
import {
  resolveGS1Link,
  uploadEvidence,
  scanInstance,
  ProductInstanceResolved,
  ScanPayload,
} from '../services/petugas.service';
import styles from '../styles/KonsumenScan.module.css';


type ScanStep = 'scan' | 'preview' | 'success' | 'error';

export default function PetugasScan() {
  const navigate = useNavigate();

  // UI & Scan States
  const [step, setStep] = useState<ScanStep>('scan');
  const [instance, setInstance] = useState<ProductInstanceResolved | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const [bizStep, setBizStep] = useState('collecting');
  const [locationName, setLocationName] = useState('');
  const [facilityType, setFacilityType] = useState('TPS');
  const [materialType, setMaterialType] = useState('Plastik PET');
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cleanup kamera saat komponen di-unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
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

  const onScanSuccess = useCallback(async (decodedText: string) => {
    await stopScanner();
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await resolveGS1Link(decodedText);
      setInstance(data);
      setStep('preview');
    } catch (err: any) {
      setErrorMsg(err.message);
      setStep('scan');
    } finally {
      setLoading(false);
    }
  }, [stopScanner]);

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

  // Scan dari Upload File Gambar
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

      const data = await resolveGS1Link(decodedText);
      setInstance(data);
      setStep('preview');
    } catch (err: any) {
      setErrorMsg('Gagal membaca QR code dari gambar. Pastikan gambar jelas.');
      setStep('scan');
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Submit Aktivitas Petugas
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instance) return;

    setLoading(true);
    setErrorMsg('');
    try {
      let evidence_url: string | null = null;
      if (evidenceFile) {
        evidence_url = await uploadEvidence(evidenceFile);
      }

      const payload: ScanPayload = {
        biz_step: bizStep,
        location_name: locationName,
        facility_type: facilityType,
        material_type: bizStep === 'inspecting' ? materialType : undefined,
        evidence_url,
      };

      await scanInstance(instance.id, payload);
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
    setErrorMsg('');
    setEvidenceFile(null);
    setLocationName('');
    setStep('scan');
  };

  return (
    <div className={styles.mobileContainer}>
      <Header />

      <main className={styles.content}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>Scanner Petugas</h1>
          <p className={styles.subtitle}>Pindai QR sampah untuk memantau dan memperbarui status.</p>
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
                <button
                  className={styles.btnPrimary}
                  onClick={stopScanner}
                  style={{ backgroundColor: '#FB2C36' }}
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

          {/* STATE 2: PREVIEW & FORM PETUGAS */}
          {step === 'preview' && instance && (
            <>
              <div className={styles.infoContainer} style={{ marginBottom: '10px' }}>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Nama Produk</span>
                  <span className={styles.infoValue}>{instance.products?.product_name || 'Tidak diketahui'}</span>
                </div>
                <div className={styles.infoGrid}>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>GTIN</span>
                    <span className={`${styles.infoValue} ${styles.infoValueMono}`}>{instance.gtin}</span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={`${styles.infoLabel} ${styles.infoLabelBrand}`}>Status</span>
                    <span className={styles.infoValue} style={{ fontSize: '13px' }}>{instance.current_status}</span>
                  </div>
                </div>
              </div>

              {/* FORM UPDATE PETUGAS */}
              <form onSubmit={handleSubmit} className={styles.formGroup}>
                
                {/* 1. Pilih Tipe Fasilitas Dulu */}
                <div className={styles.formField}>
                  <label className={styles.infoLabel}>Tipe Fasilitas</label>
                  <select value={facilityType} onChange={e => setFacilityType(e.target.value)} required className={styles.inputStyle}>
                    <option value="TPS">TPS</option>
                    <option value="BANK_SAMPAH">Bank Sampah</option>
                    <option value="PENGEPUL">Pengepul</option>
                    <option value="TPA">TPA</option>
                    <option value="RECYCLER">Pabrik Daur Ulang</option>
                  </select>
                </div>

                {/* 2. Masukkan Nama Lokasi */}
                <div className={styles.formField}>
                  <label className={styles.infoLabel}>Nama Lokasi</label>
                  <input
                    type="text"
                    value={locationName}
                    onChange={e => setLocationName(e.target.value)}
                    placeholder="Contoh: TPS Kelurahan X"
                    required
                    className={styles.inputStyle}
                  />
                </div>

                {/* 3. Tentukan Aksi / Biz Step */}
                <div className={styles.formField}>
                  <label className={styles.infoLabel}>Aksi / Biz Step</label>
                  <select value={bizStep} onChange={e => setBizStep(e.target.value)} required className={styles.inputStyle}>
                    <option value="collecting">Pickup (Collecting)</option>
                    <option value="receiving">Terima di Fasilitas (Receiving)</option>
                    <option value="inspecting">Sortir (Inspecting)</option>
                    <option value="shipping">Kirim (Shipping)</option>
                    <option value="recycling">Daur Ulang (Recycling)</option>
                    <option value="disposing">Landfill (Disposing)</option>
                  </select>
                </div>

                {/* Muncul jika Aksi = Sortir (Inspecting) */}
                {bizStep === 'inspecting' && (
                  <div className={styles.formField}>
                    <label className={styles.infoLabel}>Jenis Material</label>
                    <select value={materialType} onChange={e => setMaterialType(e.target.value)} required className={styles.inputStyle}>
                      <option value="Plastik PET">Plastik PET</option>
                      <option value="Plastik HDPE">Plastik HDPE</option>
                      <option value="Kertas">Kertas</option>
                      <option value="Kaca">Kaca</option>
                      <option value="Logam">Logam</option>
                      <option value="Organik">Organik</option>
                    </select>
                  </div>
                )}

                <div className={styles.formActions}>
                  <button type="submit" className={styles.btnPrimary} disabled={loading}>
                    {loading ? 'Menyimpan...' : 'Simpan & Dapatkan Poin'}
                  </button>
                  <button type="button" className={styles.btnSecondary} onClick={handleRetake} disabled={loading}>
                    Batal / Pindai Ulang
                  </button>
                </div>
              </form>
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
                <p className={styles.statusDesc}>Status sampah berhasil diperbarui. Poin telah ditambahkan ke akun Anda!</p>
              </div>
              <div style={{ width: '100%', marginTop: '10px' }}>
                <button className={styles.btnPrimary} onClick={handleRetake}>
                  Pindai Sampah Lainnya
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
                <p className={styles.statusDesc}>{errorMsg || 'Terjadi kesalahan saat memperbarui status sampah.'}</p>
              </div>
              <div style={{ width: '100%', marginTop: '10px' }}>
                <button className={styles.btnSecondary} onClick={handleRetake}>
                  Coba Pindai Ulang
                </button>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}