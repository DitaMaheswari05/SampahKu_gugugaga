import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import styles from './ProductManagement.module.css';

const API_URL = 'http://localhost:5000';

export default function PetugasScan() {
  const [isScanning, setIsScanning] = useState(true);
  const [instance, setInstance] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const role = localStorage.getItem('role');
    if (role !== 'PETUGAS') {
      window.location.href = '/';
    }
  }, []);

  // Form State
  const [bizStep, setBizStep] = useState('collecting');
  const [locationName, setLocationName] = useState('');
  const [facilityType, setFacilityType] = useState('TPS');
  const [materialType, setMaterialType] = useState('Plastik');
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);

  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (isScanning && !scannerRef.current) {
      scannerRef.current = new Html5QrcodeScanner(
        "qr-reader",
        { fps: 10, qrbox: 250 },
        false
      );
      
      scannerRef.current.render(onScanSuccess, onScanFailure);
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
        scannerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isScanning]);

  const onScanSuccess = (decodedText: string) => {
    if (scannerRef.current) {
      scannerRef.current.clear();
      scannerRef.current = null;
    }
    setIsScanning(false);
    resolveGS1Link(decodedText);
  };

  const onScanFailure = (err: any) => {
    // console.warn(err);
  };

  const resolveGS1Link = async (url: string) => {
    setLoading(true);
    setError('');
    try {
      // Parse GS1 URL: https://sampahku.id/01/{gtin}/21/{serial}
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
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const uploadEvidence = async (): Promise<string | null> => {
    if (!evidenceFile) return null;
    
    const formData = new FormData();
    formData.append('evidence', evidenceFile);

    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/upload/evidence`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Gagal upload foto');

    return data.data.evidence_url;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

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

      alert('Berhasil memperbarui status sampah!');
      // Reset
      setInstance(null);
      setIsScanning(true);
      setEvidenceFile(null);
      setLocationName('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Petugas Scanner</h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>Scan QR sampah untuk memperbarui status.</p>

      {error && <div className={styles.errorAlert}>{error}</div>}

      {isScanning && (
        <div id="qr-reader" style={{ width: '100%', maxWidth: '400px', margin: '0 auto' }}></div>
      )}

      {loading && <p>Loading...</p>}

      {!isScanning && instance && !loading && (
        <div className={styles.modalContent} style={{ marginTop: '2rem' }}>
          <h3>Produk Ditemukan</h3>
          <div style={{ padding: '1rem', background: '#f5f6f8', borderRadius: '8px', marginBottom: '1.5rem' }}>
            <p><strong>Nama:</strong> {instance.products?.product_name}</p>
            <p><strong>GTIN:</strong> {instance.gtin}</p>
            <p><strong>Status Saat Ini:</strong> {instance.current_status}</p>
          </div>

          <form onSubmit={handleSubmit} className={styles.formGroup}>
            <div>
              <label>Aksi / Biz Step</label>
              <select value={bizStep} onChange={e => setBizStep(e.target.value)} required>
                <option value="collecting">Pickup (Collecting)</option>
                <option value="receiving">Terima di Fasilitas (Receiving)</option>
                <option value="inspecting">Sortir (Inspecting)</option>
                <option value="shipping">Kirim (Shipping)</option>
                <option value="recycling">Daur Ulang (Recycling)</option>
                <option value="disposing">Landfill (Disposing)</option>
              </select>
            </div>

            <div>
              <label>Nama Lokasi</label>
              <input type="text" value={locationName} onChange={e => setLocationName(e.target.value)} placeholder="Contoh: TPS Kelurahan X" required />
            </div>

            {(bizStep === 'receiving' || bizStep === 'collecting' || bizStep === 'inspecting' || bizStep === 'shipping' || bizStep === 'recycling' || bizStep === 'disposing') && (
              <div>
                <label>Tipe Fasilitas</label>
                <select value={facilityType} onChange={e => setFacilityType(e.target.value)} required>
                  <option value="TPS">TPS</option>
                  <option value="BANK_SAMPAH">Bank Sampah</option>
                  <option value="PENGEPUL">Pengepul</option>
                  <option value="TPA">TPA</option>
                  <option value="RECYCLER">Pabrik Daur Ulang</option>
                </select>
              </div>
            )}

            {bizStep === 'inspecting' && (
              <div>
                <label>Jenis Material</label>
                <select value={materialType} onChange={e => setMaterialType(e.target.value)} required>
                  <option value="Plastik PET">Plastik PET</option>
                  <option value="Plastik HDPE">Plastik HDPE</option>
                  <option value="Kertas">Kertas</option>
                  <option value="Kaca">Kaca</option>
                  <option value="Logam">Logam</option>
                  <option value="Organik">Organik</option>
                </select>
              </div>
            )}

            <div>
              <label>Foto Bukti (Opsional)</label>
              <input type="file" accept="image/*" onChange={e => setEvidenceFile(e.target.files?.[0] || null)} />
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              <button type="submit" className={styles.btnPrimary} disabled={loading}>
                Simpan & Dapatkan Poin
              </button>
              <button type="button" className={styles.btnSecondary} onClick={() => { setInstance(null); setIsScanning(true); }}>
                Batal / Scan Ulang
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
