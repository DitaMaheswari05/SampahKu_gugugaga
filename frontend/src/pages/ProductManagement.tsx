import React, { useState, useEffect, useCallback } from 'react';
import {
  getProducts,
  getProductDetail,
  createProduct,
  createInstance,
  getInstanceQR,
  Product,
} from '../services/product.service';
import Header from '../components/Header';
import styles from '../styles/ProductManagement.module.css';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

const PlusIcon = () => (
  <svg
    width="16"
    height="16"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    viewBox="0 0 24 24"
  >
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const PackageIcon = () => (
  <svg
    width="20"
    height="20"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    viewBox="0 0 24 24"
  >
    <path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);

const CloseIcon = () => (
  <svg
    width="20"
    height="20"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    viewBox="0 0 24 24"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const DownloadIcon = () => (
  <svg
    width="16"
    height="16"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    viewBox="0 0 24 24"
  >
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const ProductManagement: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showCreateProduct, setShowCreateProduct] = useState(false);
  const [showCreateInstance, setShowCreateInstance] = useState<string | null>(null);
  const [showQR, setShowQR] = useState<{ gs1Url: string; qrDataUrl: string } | null>(null);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const data = await getProducts();
      setProducts(data);
    } catch (e: any) {
      setError(e.message || 'Gagal memuat produk');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleViewQR = async (instanceId: string) => {
    try {
      const data = await getInstanceQR(instanceId);
      setShowQR({
        gs1Url: data.gs1Url,
        qrDataUrl: data.qrDataUrl,
      });
    } catch (e: any) {
      alert('Gagal generate QR: ' + e.message);
    }
  };

  const handleViewProductQR = async (gtin: string) => {
    try {
      const detail = await getProductDetail(gtin);

      if (!detail.instances || detail.instances.length === 0) {
        alert('Produk ini belum punya QR. Buat instance terlebih dahulu.');
        setShowCreateInstance(gtin);
        return;
      }

      const firstInstance = detail.instances[0];
      await handleViewQR(firstInstance.id);
    } catch (e: any) {
      alert('Gagal membuka QR: ' + e.message);
    }
  };

  const handleDownloadQR = () => {
    if (!showQR) return;

    const link = document.createElement('a');
    link.download = 'qr-sampahku.png';
    link.href = showQR.qrDataUrl;
    link.click();
  };

  return (
    <div className={styles.pageContainer}>
      <Header />

      <main className={styles.content}>
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>Manajemen Produk</h1>
            <p className={styles.pageSubtitle}>Kelola identitas digital produk dan QR code</p>
          </div>

          <button
            className={styles.btnPrimary}
            onClick={() => setShowCreateProduct(true)}
            id="btn-add-product"
          >
            <PlusIcon />
            Tambah Produk
          </button>
        </div>

        {error && <div className={styles.errorBanner}>{error}</div>}

        {loading ? (
          <div className={styles.loading}>
            <div className={styles.spinner} />
            Memuat produk...
          </div>
        ) : products.length === 0 ? (
          <div className={styles.tableWrapper}>
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>
                <PackageIcon />
              </div>
              <h3 className={styles.emptyTitle}>Belum ada produk</h3>
              <p className={styles.emptyText}>
                Mulai daftarkan produk pertama Anda untuk pelacakan sampah end-to-end.
              </p>
              <button className={styles.btnPrimary} onClick={() => setShowCreateProduct(true)}>
                <PlusIcon />
                Tambah Produk Pertama
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Nama Produk</th>
                  <th>GTIN</th>
                  <th>Kategori</th>
                  <th>Berat</th>
                  <th>Tanggal Dibuat</th>
                  <th>Aksi</th>
                </tr>
              </thead>

              <tbody>
                {products.map((product) => (
                  <tr key={product.gtin}>
                    <td>
                      <div className={styles.productNameCell}>
                        <div className={styles.productIcon}>
                          <PackageIcon />
                        </div>
                        <span className={styles.productName}>{product.product_name}</span>
                      </div>
                    </td>

                    <td className={styles.gtinCell}>{product.gtin}</td>

                    <td>{product.category || '-'}</td>

                    <td>{product.weight_grams ? `${product.weight_grams}g` : '-'}</td>

                    <td>{formatDate(product.created_at)}</td>

                    <td>
                      <button
                        className={styles.qrButton}
                        onClick={() => handleViewProductQR(product.gtin)}
                      >
                        Lihat QR
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {showCreateProduct && (
        <CreateProductModal
          onClose={() => setShowCreateProduct(false)}
          onCreated={(createdGtin) => {
            setShowCreateProduct(false);
            setShowCreateInstance(createdGtin);
            loadProducts();
          }}
        />
      )}

      {showCreateInstance && (
        <CreateInstanceModal
          gtin={showCreateInstance}
          onClose={() => setShowCreateInstance(null)}
          onCreated={(result) => {
            setShowCreateInstance(null);
            setShowQR({
              gs1Url: result.gs1Url,
              qrDataUrl: result.qrDataUrl,
            });
            loadProducts();
          }}
        />
      )}

      {showQR && (
        <div className={styles.modalOverlay} onClick={() => setShowQR(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>QR Code - GS1 Digital Link</h2>
              <button className={styles.modalClose} onClick={() => setShowQR(null)}>
                <CloseIcon />
              </button>
            </div>

            <div className={styles.qrContent}>
              <img src={showQR.qrDataUrl} alt="QR Code" className={styles.qrImage} />

              <div className={styles.qrUrl}>{showQR.gs1Url}</div>

              <div className={styles.qrActions}>
                <button className={styles.btnPrimary} onClick={handleDownloadQR}>
                  <DownloadIcon />
                  Download QR
                </button>

                <button className={styles.btnCancel} onClick={() => setShowQR(null)}>
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface CreateProductModalProps {
  onClose: () => void;
  onCreated: (gtin: string) => void;
}

const CreateProductModal: React.FC<CreateProductModalProps> = ({ onClose, onCreated }) => {
  const [form, setForm] = useState({
    product_name: '',
    gtin: '',
    category: '',
    weight_grams: '',
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.product_name || !form.gtin) {
      setError('Nama Produk dan GTIN wajib diisi');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await createProduct({
        product_name: form.product_name,
        gtin: form.gtin,
        category: form.category || undefined,
        weight_grams: form.weight_grams ? parseInt(form.weight_grams, 10) : undefined,
        material_passport: {
          '@context': 'https://schema.org/',
          '@type': 'Product',
          material: [],
          recyclingInstructions: '',
        },
      });

      onCreated(form.gtin);
    } catch (e: any) {
      setError(e.message || 'Gagal menyimpan produk');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Tambah Produk Baru</h2>
          <button className={styles.modalClose} onClick={onClose}>
            <CloseIcon />
          </button>
        </div>

        {error && <div className={styles.errorBanner}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Nama Produk</label>
            <input
              className={styles.formInput}
              placeholder="Contoh: Botol Aqua 600ml"
              value={form.product_name}
              onChange={(e) => handleChange('product_name', e.target.value)}
              id="input-product-name"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>GTIN</label>
            <input
              className={styles.formInput}
              placeholder="Contoh: 8992753020012"
              value={form.gtin}
              onChange={(e) => handleChange('gtin', e.target.value)}
              id="input-gtin"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Kategori</label>
            <select
              className={styles.formSelect}
              value={form.category}
              onChange={(e) => handleChange('category', e.target.value)}
              id="select-category"
            >
              <option value="">Pilih kategori...</option>
              <option value="Plastik PET">Plastik PET</option>
              <option value="Plastik PP">Plastik PP</option>
              <option value="Kertas">Kertas</option>
              <option value="Kaca">Kaca</option>
              <option value="Logam">Logam</option>
              <option value="Organik">Organik</option>
              <option value="Elektronik">Elektronik</option>
              <option value="Tekstil">Tekstil</option>
              <option value="Lainnya">Lainnya</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Berat</label>
            <input
              className={styles.formInput}
              placeholder="Contoh: 15g"
              value={form.weight_grams}
              onChange={(e) => handleChange('weight_grams', e.target.value.replace(/\D/g, ''))}
              id="input-weight"
            />
          </div>

          <div className={styles.modalActions}>
            <button type="button" className={styles.btnCancel} onClick={onClose}>
              Batal
            </button>

            <button type="submit" className={styles.btnSave} disabled={saving} id="btn-save-product">
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface CreateInstanceModalProps {
  gtin: string;
  onClose: () => void;
  onCreated: (result: { gs1Url: string; qrDataUrl: string }) => void;
}

const CreateInstanceModal: React.FC<CreateInstanceModalProps> = ({
  gtin,
  onClose,
  onCreated,
}) => {
  const [type, setType] = useState<'BATCH' | 'UNIQUE'>('UNIQUE');
  const [identifier, setIdentifier] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!identifier) {
      setError(type === 'BATCH' ? 'Batch Number wajib diisi' : 'Serial Number wajib diisi');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const result = await createInstance(gtin, {
        identification_type: type,
        ...(type === 'BATCH' ? { batch_number: identifier } : { serial_number: identifier }),
      });

      onCreated({
        gs1Url: result.gs1Url,
        qrDataUrl: result.qrDataUrl,
      });
    } catch (e: any) {
      setError(e.message || 'Gagal membuat instance');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Buat Instance Baru</h2>
          <button className={styles.modalClose} onClick={onClose}>
            <CloseIcon />
          </button>
        </div>

        {error && <div className={styles.errorBanner}>{error}</div>}

        <div className={styles.gtinPreview}>
          GTIN:
          <code>{gtin}</code>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Tipe Identifikasi</label>

            <div className={styles.toggleGroup}>
              <button
                type="button"
                className={`${styles.toggleBtn} ${type === 'UNIQUE' ? styles.toggleBtnActive : ''}`}
                onClick={() => {
                  setType('UNIQUE');
                  setIdentifier('');
                }}
              >
                Serial
              </button>

              <button
                type="button"
                className={`${styles.toggleBtn} ${type === 'BATCH' ? styles.toggleBtnActive : ''}`}
                onClick={() => {
                  setType('BATCH');
                  setIdentifier('');
                }}
              >
                Batch
              </button>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              {type === 'BATCH' ? 'Batch Number' : 'Serial Number'}
            </label>

            <input
              className={styles.formInput}
              placeholder={type === 'BATCH' ? 'Contoh: BATCH-2026-001' : 'Contoh: SN-001'}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              id="input-identifier"
              required
            />
          </div>

          <div className={styles.gs1Preview}>
            <strong>GS1 Digital Link Preview:</strong>
            <code>
              {type === 'UNIQUE'
                ? `https://sampahku.id/01/${gtin}/21/${identifier || '...'}`
                : `https://sampahku.id/01/${gtin}/10/${identifier || '...'}`}
            </code>
          </div>

          <div className={styles.modalActions}>
            <button type="button" className={styles.btnCancel} onClick={onClose}>
              Batal
            </button>

            <button type="submit" className={styles.btnSave} disabled={saving} id="btn-save-instance">
              {saving ? 'Membuat...' : 'Buat & Generate QR'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductManagement;