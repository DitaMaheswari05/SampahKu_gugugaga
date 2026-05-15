import React, { useState, useEffect, useRef, useCallback } from 'react';

import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import Header from '../components/Header';
import {
  resolveGS1Link,
  uploadEvidence,
  scanInstance,
  scanBarcode,
  resolveBarcode,
  getPetugasDashboard,
  ProductInstanceResolved,
  ResolvedBarcodeProduct,
  ScanPayload,
} from '../services/petugas.service';
import styles from '../styles/KonsumenScan.module.css';

/** Supported barcode formats — include all common 1D + QR */
const SUPPORTED_FORMATS = [
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
];

/** Map TPS type → facility_type value for the scan payload */
const TPS_TYPE_TO_FACILITY: Record<string, string> = {
  'TPS': 'TPS',
  'TPS3R': 'TPS',
  'Bank Sampah': 'BANK_SAMPAH',
  'TPST': 'TPS',
  'TPA': 'TPA',
  'Pengepul': 'PENGEPUL',
  'Recycler': 'RECYCLER',
};

/** Human-readable labels for biz_step values */
const BIZ_STEP_LABELS: Record<string, string> = {
  collecting: 'Pickup (Collecting)',
  receiving: 'Terima di Fasilitas (Receiving)',
  inspecting: 'Sortir (Inspecting)',
  shipping: 'Kirim (Shipping)',
  recycling: 'Daur Ulang (Recycling)',
  disposing: 'Landfill (Disposing)',
};

const createFallbackBarcodeProduct = (gtin: string): ResolvedBarcodeProduct => ({
  gtin,
  product_name: 'Produk Tidak Dikenal',
  category: 'Tidak diketahui',
  source: 'OFF_AUTO',
  image_url: null,
});

type ScanStep = 'scan' | 'preview' | 'success' | 'error';

export default function PetugasScan() {
  // TPS context
  const [tpsName, setTpsName] = useState<string | null>(null);
  const [tpsType, setTpsType] = useState<string | null>(null);
  const [allowedActions, setAllowedActions] = useState<string[]>([]);
  const [tpsLoading, setTpsLoading] = useState(true);

  // UI & Scan States
  const [step, setStep] = useState<ScanStep>('scan');
  const [instance, setInstance] = useState<ProductInstanceResolved | null>(null);
  const [scannedGtin, setScannedGtin] = useState<string | null>(null);
  const [scanType, setScanType] = useState<'TIER_1' | 'TIER_2' | null>(null);
  const [resolvedProduct, setResolvedProduct] = useState<ResolvedBarcodeProduct | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const [bizStep, setBizStep] = useState('');
  const [materialType, setMaterialType] = useState('Plastik PET');
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);

  // Geolocation
  const [geoCoords, setGeoCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoStatus, setGeoStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [geoError, setGeoError] = useState('');

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Fetch TPS context on mount ──
  useEffect(() => {
    const loadTpsContext = async () => {
      setTpsLoading(true);
      try {
        const data = await getPetugasDashboard();
        if (data.tps) {
          setTpsName(data.tps.name);
          setTpsType(data.tps.type);
          setAllowedActions(data.tps.allowed_actions);
          // Default biz_step to first allowed action
          if (data.tps.allowed_actions.length > 0) {
            setBizStep(data.tps.allowed_actions[0]);
          }
        }
      } catch (e: any) {
        console.error('Failed to load TPS context:', e);
      } finally {
        setTpsLoading(false);
      }
    };
    loadTpsContext();
  }, []);

  // ── Capture geolocation on mount ──
  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoStatus('error');
      setGeoError('Browser tidak mendukung geolocation.');
      return;
    }

    // Watch position for continuous updates
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setGeoCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoStatus('ok');
        setGeoError('');
      },
      (err) => {
        console.error('Geolocation error:', err);
        setGeoStatus('error');
        setGeoError('Gagal mendapatkan lokasi GPS. Pastikan izin lokasi aktif.');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // ── Cleanup camera on unmount ──
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

  const onScanSuccess = useCallback(async (decodedText: string) => {
    await stopScanner();
    setLoading(true);
    setErrorMsg('');
    try {
      // Detect: GS1 Digital Link (contains /01/) vs standard barcode (digits only, 8-14 chars)
      const isGS1DigitalLink = decodedText.includes('/01/');
      const isStandardBarcode = /^\d{8,14}$/.test(decodedText);

      if (isGS1DigitalLink) {
        // Tier 1: GS1 Digital Link
        const data = await resolveGS1Link(decodedText);
        setInstance(data);
        setScanType('TIER_1');
        setScannedGtin(null);
        setStep('preview');
      } else if (isStandardBarcode) {
        // Tier 2: Standard barcode (EAN/UPC) — resolve product info dari OFF
        setScannedGtin(decodedText);
        setScanType('TIER_2');
        setInstance(null);
        try {
          const product = await resolveBarcode(decodedText);
          setResolvedProduct(product);
        } catch {
          // Jika preview resolve gagal, tetap lanjut dengan snapshot fallback.
          // Backend tetap akan resolve/create produk via Open Food Facts saat submit.
          setResolvedProduct(createFallbackBarcodeProduct(decodedText));
        }
        setStep('preview');
      } else {
        throw new Error('Format QR/barcode tidak dikenali. Silakan gunakan GS1 Digital Link atau barcode standar (12-14 digit).');
      }
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
        html5QrCodeRef.current = new Html5Qrcode('qr-reader', {
          formatsToSupport: SUPPORTED_FORMATS,
          verbose: false,
        });
      }
      await html5QrCodeRef.current.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 300, height: 150 }, aspectRatio: 1.0 },
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
        html5QrCodeRef.current = new Html5Qrcode('qr-reader', {
          formatsToSupport: SUPPORTED_FORMATS,
          verbose: false,
        });
      }
      const decodedText = await html5QrCodeRef.current.scanFile(file, true);
      html5QrCodeRef.current.clear();

      // Detect: GS1 Digital Link vs standard barcode
      const isGS1DigitalLink = decodedText.includes('/01/');
      const isStandardBarcode = /^\d{8,14}$/.test(decodedText);

      if (isGS1DigitalLink) {
        const data = await resolveGS1Link(decodedText);
        setInstance(data);
        setScanType('TIER_1');
        setScannedGtin(null);
        setStep('preview');
      } else if (isStandardBarcode) {
        setScannedGtin(decodedText);
        setScanType('TIER_2');
        setInstance(null);
        try {
          const product = await resolveBarcode(decodedText);
          setResolvedProduct(product);
        } catch {
          setResolvedProduct(createFallbackBarcodeProduct(decodedText));
        }
        setStep('preview');
      } else {
        throw new Error('Format QR/barcode di gambar tidak dikenali.');
      }
    } catch (err: any) {
      setErrorMsg('Gagal membaca QR/barcode dari gambar. Pastikan gambar jelas.');
      setStep('scan');
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instance && !scannedGtin) return;

    if (geoStatus !== 'ok') {
      setErrorMsg('GPS belum aktif. Pastikan izin lokasi diberikan sebelum submit.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      let evidence_url: string | null = null;
      if (evidenceFile) {
        evidence_url = await uploadEvidence(evidenceFile);
      }

      const facilityType = TPS_TYPE_TO_FACILITY[tpsType || ''] || 'TPS';

      const payload: ScanPayload = {
        biz_step: bizStep,
        location_name: tpsName || '',
        facility_type: facilityType,
        material_type: bizStep === 'inspecting' ? materialType : undefined,
        evidence_url,
        coordinates: geoCoords || undefined,
      };

      // Tier 1: instance scan
      if (scanType === 'TIER_1' && instance) {
        await scanInstance(instance.id, payload);
      }
      // Tier 2: barcode scan
      else if (scanType === 'TIER_2' && scannedGtin) {
        await scanBarcode(scannedGtin, payload);
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
    setResolvedProduct(null);
    setErrorMsg('');
    setEvidenceFile(null);
    setStep('scan');
  };

  // Derive GPS indicator style
  const gpsIndicatorStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    fontWeight: 600,
    padding: '5px 12px',
    borderRadius: '20px',
    fontFamily: "'Poppins', sans-serif",
    ...(geoStatus === 'ok'
      ? { background: '#e8f5e9', color: '#2e7d32' }
      : geoStatus === 'loading'
        ? { background: '#fff3e0', color: '#e65100' }
        : { background: '#fef2f2', color: '#dc2626' }
    ),
  };

  return (
    <div className={styles.mobileContainer}>
      <Header />

      <main className={styles.content}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>Scanner Petugas</h1>
          <p className={styles.subtitle}>Pindai QR sampah untuk memperbarui status.</p>
        </div>

        {/* TPS Context Banner */}
        {!tpsLoading && tpsName && (
          <div style={{
            width: '100%',
            background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
            borderRadius: '14px',
            padding: '14px 16px',
            marginBottom: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxSizing: 'border-box',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2e7d32" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              <div>
                <div style={{ fontWeight: 700, fontSize: '13px', color: '#1b5e20', fontFamily: "'Poppins', sans-serif" }}>
                  {tpsName}
                </div>
                <div style={{ fontSize: '11px', color: '#388e3c', fontFamily: "'Poppins', sans-serif" }}>
                  {tpsType}
                </div>
              </div>
            </div>
            <span style={gpsIndicatorStyle}>
              {geoStatus === 'ok' ? '● GPS OK' : geoStatus === 'loading' ? '◌ GPS...' : '✕ GPS Gagal'}
            </span>
          </div>
        )}

        {!tpsLoading && !tpsName && (
          <div className={styles.errorAlert} style={{ marginBottom: '16px' }}>
            Anda belum terikat ke TPS manapun. Hubungi Admin TPS Anda.
          </div>
        )}

        {geoStatus === 'error' && <div className={styles.errorAlert}>{geoError}</div>}
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
                <button className={styles.btnPrimary} onClick={startScanner} disabled={!tpsName || tpsLoading}>
                  {tpsLoading ? 'Memuat TPS...' : !tpsName ? 'Tidak Terikat TPS' : 'Mulai Pemindaian'}
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
                disabled={!tpsName || tpsLoading}
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

          {/* STATE 2: PREVIEW & FORM PETUGAS (TIER 1: Instance/Unique) */}
          {step === 'preview' && scanType === 'TIER_1' && instance && (
            <>
              <div className={styles.infoContainer} style={{ marginBottom: '10px' }}>
                <div style={{ background: '#e3f2fd', borderRadius: '8px', padding: '8px 12px', marginBottom: '8px', fontSize: '12px', color: '#1565c0', fontWeight: 600, fontFamily: "'Poppins', sans-serif" }}>
                  📦 Tier 1 - Instance Unik
                </div>
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

              {/* FORM UPDATE PETUGAS - TIER 1 */}
              <form onSubmit={handleSubmit} className={styles.formGroup}>
                <div className={styles.formField}>
                  <label className={styles.infoLabel}>Aksi / Biz Step</label>
                  {allowedActions.length > 0 ? (
                    <select value={bizStep} onChange={e => setBizStep(e.target.value)} required className={styles.inputStyle}>
                      {allowedActions.map((action) => (
                        <option key={action} value={action}>
                          {BIZ_STEP_LABELS[action] || action}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div style={{ padding: '12px', background: '#fef2f2', borderRadius: '12px', fontSize: '13px', color: '#dc2626' }}>
                      TPS Anda tidak memiliki aksi yang diperbolehkan.
                    </div>
                  )}
                </div>

                {/* Lokasi otomatis dari TPS */}
                <div className={styles.formField}>
                  <label className={styles.infoLabel}>Lokasi</label>
                  <div style={{
                    padding: '12px',
                    borderRadius: '12px',
                    border: '1px solid #e5e7eb',
                    background: '#f3f4f6',
                    fontSize: '14px',
                    fontFamily: "'Poppins', sans-serif",
                    color: '#374151',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4caf50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                    {tpsName || '-'} ({tpsType || '-'})
                  </div>
                </div>

                {/* GPS status */}
                <div className={styles.formField}>
                  <label className={styles.infoLabel}>GPS</label>
                  <div style={{
                    padding: '10px 12px',
                    borderRadius: '12px',
                    border: '1px solid #e5e7eb',
                    background: geoStatus === 'ok' ? '#f0fdf4' : geoStatus === 'loading' ? '#fffbeb' : '#fef2f2',
                    fontSize: '13px',
                    fontFamily: "'Poppins', sans-serif",
                    color: geoStatus === 'ok' ? '#166534' : geoStatus === 'loading' ? '#92400e' : '#991b1b',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}>
                    {geoStatus === 'ok' && geoCoords && (
                      <>
                        <span style={{ fontSize: '16px' }}>📍</span>
                        {geoCoords.lat.toFixed(5)}, {geoCoords.lng.toFixed(5)}
                      </>
                    )}
                    {geoStatus === 'loading' && (
                      <>
                        <span style={{ fontSize: '16px' }}>⏳</span>
                        Mendapatkan lokasi GPS...
                      </>
                    )}
                    {geoStatus === 'error' && (
                      <>
                        <span style={{ fontSize: '16px' }}>❌</span>
                        GPS tidak tersedia — scan tidak bisa dilakukan
                      </>
                    )}
                  </div>
                </div>

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
                  <button
                    type="submit"
                    className={styles.btnPrimary}
                    disabled={loading || geoStatus !== 'ok' || allowedActions.length === 0}
                  >
                    {loading ? 'Menyimpan...' : geoStatus !== 'ok' ? 'Menunggu GPS...' : 'Simpan Pembaruan'}
                  </button>
                  <button type="button" className={styles.btnSecondary} onClick={handleRetake} disabled={loading}>
                    Batal / Pindai Ulang
                  </button>
                </div>
              </form>
            </>
          )}

          {/* STATE 2B: PREVIEW & FORM PETUGAS (TIER 2: Barcode/Aggregate) */}
          {step === 'preview' && scanType === 'TIER_2' && scannedGtin && (
            <>
              <div className={styles.infoContainer} style={{ marginBottom: '10px' }}>
                <div style={{ background: '#f3e5f5', borderRadius: '8px', padding: '8px 12px', marginBottom: '8px', fontSize: '12px', color: '#6a1b9a', fontWeight: 600, fontFamily: "'Poppins', sans-serif" }}>
                  📊 Tier 2 - Barcode Agregat
                </div>

                {/* Product image from OFF */}
                {resolvedProduct?.image_url && (
                  <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                    <img
                      src={resolvedProduct.image_url}
                      alt={resolvedProduct.product_name}
                      style={{ maxHeight: '120px', borderRadius: '10px', objectFit: 'contain', border: '1px solid #e5e7eb' }}
                    />
                  </div>
                )}

                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Nama Produk</span>
                  <span className={styles.infoValue}>
                    {resolvedProduct?.product_name || 'Produk Tidak Dikenal'}
                  </span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>GTIN / Barcode</span>
                  <span className={`${styles.infoValue} ${styles.infoValueMono}`}>{scannedGtin}</span>
                </div>
                <div className={styles.infoGrid}>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Kategori</span>
                    <span className={styles.infoValue}>{resolvedProduct?.category || 'Tidak diketahui'}</span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Sumber</span>
                    <span className={styles.infoValue} style={{ fontSize: '12px' }}>
                      {resolvedProduct?.source === 'OFF_AUTO' ? '🌐 Open Food Facts' : resolvedProduct?.source === 'BRAND_MANUAL' ? '🏭 Brand Terdaftar' : '—'}
                    </span>
                  </div>
                </div>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '8px', fontStyle: 'italic' }}>
                  📌 Scan agregat untuk semua unit dengan barcode ini
                </div>
              </div>

              {/* FORM UPDATE PETUGAS - TIER 2 */}
              <form onSubmit={handleSubmit} className={styles.formGroup}>
                <div className={styles.formField}>
                  <label className={styles.infoLabel}>Aksi / Biz Step</label>
                  {allowedActions.length > 0 ? (
                    <select value={bizStep} onChange={e => setBizStep(e.target.value)} required className={styles.inputStyle}>
                      {allowedActions.map((action) => (
                        <option key={action} value={action}>
                          {BIZ_STEP_LABELS[action] || action}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div style={{ padding: '12px', background: '#fef2f2', borderRadius: '12px', fontSize: '13px', color: '#dc2626' }}>
                      TPS Anda tidak memiliki aksi yang diperbolehkan.
                    </div>
                  )}
                </div>

                {/* Lokasi otomatis */}
                <div className={styles.formField}>
                  <label className={styles.infoLabel}>Lokasi</label>
                  <div style={{
                    padding: '12px',
                    borderRadius: '12px',
                    border: '1px solid #e5e7eb',
                    background: '#f3f4f6',
                    fontSize: '14px',
                    fontFamily: "'Poppins', sans-serif",
                    color: '#374151',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4caf50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                    {tpsName || '-'} ({tpsType || '-'})
                  </div>
                </div>

                {/* GPS status */}
                <div className={styles.formField}>
                  <label className={styles.infoLabel}>GPS</label>
                  <div style={{
                    padding: '10px 12px',
                    borderRadius: '12px',
                    border: '1px solid #e5e7eb',
                    background: geoStatus === 'ok' ? '#f0fdf4' : geoStatus === 'loading' ? '#fffbeb' : '#fef2f2',
                    fontSize: '13px',
                    fontFamily: "'Poppins', sans-serif",
                    color: geoStatus === 'ok' ? '#166534' : geoStatus === 'loading' ? '#92400e' : '#991b1b',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}>
                    {geoStatus === 'ok' && geoCoords && (
                      <>
                        <span style={{ fontSize: '16px' }}>📍</span>
                        {geoCoords.lat.toFixed(5)}, {geoCoords.lng.toFixed(5)}
                      </>
                    )}
                    {geoStatus === 'loading' && (
                      <>
                        <span style={{ fontSize: '16px' }}>⏳</span>
                        Mendapatkan lokasi GPS...
                      </>
                    )}
                    {geoStatus === 'error' && (
                      <>
                        <span style={{ fontSize: '16px' }}>❌</span>
                        GPS tidak tersedia — scan tidak bisa dilakukan
                      </>
                    )}
                  </div>
                </div>

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
                  <button
                    type="submit"
                    className={styles.btnPrimary}
                    disabled={loading || geoStatus !== 'ok' || allowedActions.length === 0}
                  >
                    {loading ? 'Menyimpan...' : geoStatus !== 'ok' ? 'Menunggu GPS...' : 'Simpan Scan Barcode'}
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
                <p className={styles.statusDesc}>Status sampah berhasil diperbarui.</p>
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
