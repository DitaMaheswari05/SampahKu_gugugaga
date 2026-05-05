import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import Header from '../components/Header';
import styles from '../styles/KonsumenScan.module.css';

import { API_BASE_URL as API_URL } from '../config';

type ScanStep = 'scan' | 'preview' | 'success' | 'error';

export default function PetugasScan() {
  const navigate = useNavigate();
  
  // UI & Scan States
  const [step, setStep] = useState<ScanStep>('scan');
  const [instance, setInstance] = useState<any>(null);
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

  // Pastikan hanya role petugas yang menggunakan halaman ini
  useEffect(() => {
    const role = localStorage.getItem('role');
    if (role && role !== 'PETUGAS') {
      if (role === 'KONSUMEN') navigate('/dashboard');
      else if (role === 'BRAND') navigate('/products');
    }
  }, [navigate]);

  // Cleanup kamera saat komponen di-unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  // --- KONTROL KAMERA SECARA MANUAL ---
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
    await stopScanner();
    resolveGS1Link(decodedText);
  };

  const onScanFailure = (err: any) => {
    // Abaikan error per-frame
  };

  // Fungsi Scan dari Upload File Gambar
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      setErrorMsg('');
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
      setStep('scan');
    } finally {
      setLoading(false);
    }
  };

  // Upload File Bukti Fisik
  const uploadEvidence = async (): Promise<string | null> => {
    if (!evidenceFile) return null;
    
    const formData = new FormData();
    formData.append('evidence', evidenceFile);
    const token = localStorage.getItem('token');
    
    const res = await fetch(`${API_URL}/upload/evidence`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Gagal upload foto');
    return data.data.evidence_url;
  };

  // Submit Aktivitas Petugas
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      let evidence_url = null;
      if (evidenceFile) {
        evidence_url = await uploadEvidence();
      }

      const token = localStorage.getItem('token');
      const payload = {
        biz_step: bizStep,
        location_name: locationName,
        facility_type: facilityType,
        material_type: bizStep === 'inspecting' ? materialType : undefined,
        evidence_url
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
      if (!res.ok) throw new Error(data.message || 'Gagal menyimpan data scan');

      setStep('success');
    } catch (err: any) {
      setErrorMsg(err.message);
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  // Reset State ke Awal
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

                <div className={styles.formField}>
                  <label className={styles.infoLabel}>Nama Lokasi</label>
                  <input type="text" value={locationName} onChange={e => setLocationName(e.target.value)} placeholder="Contoh: TPS Kelurahan X" required className={styles.inputStyle} />
                </div>

                {['receiving', 'collecting', 'inspecting', 'shipping', 'recycling', 'disposing'].includes(bizStep) && (
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
                )}

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

                <div className={styles.formField}>
                  <label className={styles.infoLabel}>Foto Bukti (Opsional)</label>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={e => setEvidenceFile(e.target.files?.[0] || null)} 
                    className={styles.fileInput}
                  />
                </div>

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
                <button 
                  className={styles.btnPrimary} 
                  onClick={() => handleRetake()}
                >
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
                <button 
                  className={styles.btnSecondary} 
                  onClick={handleRetake}
                >
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