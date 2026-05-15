import React, { useState, useEffect, useCallback } from 'react';
import {
  getProducts,
  getProductDetail,
  createProduct,
  createInstance,
  getInstanceQR,
  Product,
  ProductDetail,
  ProductInstance,
} from '../services/product.service';
import Header from '../components/Header';
import styles from '../styles/ProductManagement.module.css';

const STATUS_LABELS: Record<string, string> = {
  IN_MARKET: 'Di Pasaran',
  DISCARDED: 'Dibuang',
  PICKED_UP: 'Diambil Petugas',
  AT_TPS: 'Di TPS',
  SORTED: 'Disortir',
  IN_TRANSIT: 'Dalam Perjalanan',
  AT_FACILITY: 'Di Fasilitas',
  RECYCLED: 'Didaur Ulang',
  DISPOSED: 'Di TPA',
};

const STATUS_COLOR: Record<string, string> = {
  IN_MARKET: '#6b7280',
  DISCARDED: '#f59e0b',
  PICKED_UP: '#3b82f6',
  AT_TPS: '#8b5cf6',
  SORTED: '#06b6d4',
  IN_TRANSIT: '#f97316',
  AT_FACILITY: '#10b981',
  RECYCLED: '#16a34a',
  DISPOSED: '#ef4444',
};

function statusBadgeClass(status: string): string {
  switch (status) {
    case 'RECYCLED': return styles.badgeGreen;
    case 'DISPOSED': return styles.badgeRed;
    case 'IN_MARKET': return styles.badgeGray;
    default: return styles.badgeOrange;
  }
}

function pct(n: number, total: number): string {
  if (total === 0) return '0%';
  return Math.round((n / total) * 100) + '%';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * Renders instance cards for the expanded product detail.
 * - UNIQUE instances → one card per instance (single status badge)
 * - BATCH instances  → grouped by batch_number → one card per batch group
 *   with per-status breakdown chips and total item count
 */
function renderInstanceCards(
  instances: ProductInstance[],
  onViewQR: (id: string) => void
): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];

  const uniqueInsts = instances.filter(i => i.identification_type === 'UNIQUE');
  const batchInsts  = instances.filter(i => i.identification_type === 'BATCH');

  // ── UNIQUE: one card per instance ─────────────────────────────────────
  uniqueInsts.forEach(inst => {
    nodes.push(
      <div className={styles.instanceCard} key={inst.id}>
        <span className={styles.instanceType}>SERIAL</span>
        <strong style={{ fontSize: '0.9rem' }}>{inst.serial_number || '—'}</strong>
        <span className={styles.instanceId}>{inst.id}</span>
        <div className={styles.instanceBottom}>
          <span className={`${styles.badge} ${statusBadgeClass(inst.current_status)}`}>
            {STATUS_LABELS[inst.current_status] || inst.current_status}
          </span>
          <button className={styles.btnLink} onClick={() => onViewQR(inst.id)}>
            <QRIcon /> QR
          </button>
        </div>
      </div>
    );
  });

  // ── BATCH: group by batch_number, show one card per group ───────────────
  const batchGroups: Record<string, ProductInstance[]> = {};
  batchInsts.forEach(inst => {
    const key = inst.batch_number || inst.id;
    if (!batchGroups[key]) batchGroups[key] = [];
    batchGroups[key].push(inst);
  });

  Object.entries(batchGroups).forEach(([batchNumber, group]) => {
    const total = group.length;
    const statusCounts: Record<string, number> = {};
    group.forEach(inst => {
      statusCounts[inst.current_status] = (statusCounts[inst.current_status] || 0) + 1;
    });
    const primaryId = group[0].id; // all items in a batch share the same QR URL

    nodes.push(
      <div className={styles.instanceCard} key={`batch-${batchNumber}`}>
        <span className={styles.instanceType}>BATCH</span>
        <strong style={{ fontSize: '0.9rem' }}>{batchNumber}</strong>
        <span className={styles.instanceId}>{total} item fisik</span>

        {/* Multi-status breakdown */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.5rem' }}>
          {Object.entries(statusCounts)
            .sort(([, a], [, b]) => b - a)
            .map(([status, count]) => {
              const color = STATUS_COLOR[status] || '#6b7280';
              return (
                <span
                  key={status}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                    background: color + '18', border: `1px solid ${color}40`,
                    borderRadius: '999px', padding: '0.15rem 0.55rem',
                    fontSize: '0.7rem', fontWeight: 600, color,
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
                  {STATUS_LABELS[status] || status}: {count}
                </span>
              );
            })}
        </div>

        <div className={styles.instanceBottom} style={{ marginTop: '0.5rem' }}>
          <button className={styles.btnLink} onClick={() => onViewQR(primaryId)}>
            <QRIcon /> QR
          </button>
        </div>
      </div>
    );
  });

  return nodes;
}

//  Icons (inline SVG)
const PlusIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const PackageIcon = () => (
  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
  </svg>
);

const CloseIcon = () => (
  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const QRIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    <line x1="14" y1="14" x2="14" y2="17"/><line x1="14" y1="21" x2="21" y2="21"/>
    <line x1="21" y1="14" x2="21" y2="17"/><line x1="17" y1="14" x2="21" y2="14"/>
  </svg>
);

const ChevronDown = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

const ChevronUp = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24">
    <polyline points="18 15 12 9 6 15"/>
  </svg>
);

const DownloadIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

//  Main Component
const ProductManagement: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [qrError, setQrError] = useState('');

  // Modal states
  const [showCreateProduct, setShowCreateProduct] = useState(false);
  const [showCreateInstance, setShowCreateInstance] = useState<string | null>(null); // GTIN
  const [showQR, setShowQR] = useState<{ gs1Url: string; qrDataUrl: string } | null>(null);

  // Expanded row
  const [expandedGtin, setExpandedGtin] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<ProductDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // User info available via auth header on API calls — no client-side parse needed
  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getProducts();
      setProducts(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleExpand = async (gtin: string) => {
    if (expandedGtin === gtin) {
      setExpandedGtin(null);
      setDetailData(null);
      return;
    }
    setExpandedGtin(gtin);
    setDetailLoading(true);
    try {
      const data = await getProductDetail(gtin);
      setDetailData(data);
    } catch (e: any) {
      console.error(e);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleViewQR = async (instanceId: string) => {
    setQrError('');
    try {
      const data = await getInstanceQR(instanceId);
      setShowQR({ gs1Url: data.gs1Url, qrDataUrl: data.qrDataUrl });
    } catch (e: any) {
      setQrError('Gagal generate QR: ' + e.message);
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
      {/* Navbar */}
      <Header />

      {/* Content */}
      <div className={styles.content}>
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>Manajemen Produk</h1>
            <p className={styles.pageSubtitle}>Kelola identitas digital produk Anda</p>
          </div>
          <button className={styles.btnPrimary} onClick={() => setShowCreateProduct(true)} id="btn-add-product">
            <PlusIcon /> Tambah Produk
          </button>
        </div>

        {error && <div className={styles.errorBanner}>{error}</div>}
        {qrError && <div className={styles.errorBanner}>{qrError}</div>}

        {loading ? (
          <div className={styles.loading}>
            <div className={styles.spinner} />
            Memuat produk...
          </div>
        ) : products.length === 0 ? (
          <div className={styles.tableWrapper}>
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}><PackageIcon /></div>
              <h3 className={styles.emptyTitle}>Belum ada produk</h3>
              <p className={styles.emptyText}>Mulai daftarkan produk pertama Anda untuk pelacakan sampah end-to-end.</p>
              <button className={styles.btnPrimary} onClick={() => setShowCreateProduct(true)}>
                <PlusIcon /> Tambah Produk Pertama
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Nama Produk</th>
                  <th>Kategori</th>
                  <th>Instances</th>
                  <th>Recovery Rate</th>
                  <th>Status Breakdown</th>
                  <th>Dibuat</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <React.Fragment key={p.gtin}>
                    <tr>
                      <td>
                        <div className={styles.productNameCell}>
                          <div className={styles.productIcon}><PackageIcon /></div>
                          <div className={styles.productInfo}>
                            <span className={styles.productName}>{p.product_name}</span>
                            <span className={styles.productGtin}>{p.gtin}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`${styles.badge} ${styles.badgeBlue}`}>
                          {p.category || '—'}
                        </span>
                      </td>
                      <td>
                        <strong>{p.stats.total}</strong>
                      </td>
                      <td>
                        <span className={`${styles.badge} ${p.stats.total > 0 ? styles.badgeGreen : styles.badgeGray}`}>
                          {pct(p.stats.recycled, p.stats.total)}
                        </span>
                      </td>
                      <td>
                          <div>
                            <div className={styles.progressBar}>
                              <div className={styles.progressSegment} style={{ width: pct(p.stats.recycled, Math.max(p.stats.total, 1)), background: '#4caf50' }} />
                              <div className={styles.progressSegment} style={{ width: pct(p.stats.in_progress, Math.max(p.stats.total, 1)), background: '#ff9800' }} />
                              <div className={styles.progressSegment} style={{ width: pct(p.stats.disposed, Math.max(p.stats.total, 1)), background: '#f44336' }} />
                              <div className={styles.progressSegment} style={{ width: pct(p.stats.in_market, Math.max(p.stats.total, 1)), background: '#e0e0e0' }} />
                            </div>
                            <div className={styles.statsBar} style={{ marginTop: '0.35rem' }}>
                              <div className={styles.statItem}><span className={`${styles.statDot} ${styles.dotGreen}`} />{p.stats.recycled}</div>
                              <div className={styles.statItem}><span className={`${styles.statDot} ${styles.dotOrange}`} />{p.stats.in_progress}</div>
                              <div className={styles.statItem}><span className={`${styles.statDot} ${styles.dotRed}`} />{p.stats.disposed}</div>
                              <div className={styles.statItem}><span className={`${styles.statDot} ${styles.dotGray}`} />{p.stats.in_market}</div>
                            </div>
                          </div>
                      </td>
                      <td>{formatDate(p.created_at)}</td>
                      <td>
                        <div className={styles.actionsCell}>
                          <button className={styles.btnLink} onClick={() => setShowCreateInstance(p.gtin)} title="Buat Instance">
                            <PlusIcon /> Instance
                          </button>
                          <button className={styles.btnLink} onClick={() => handleExpand(p.gtin)} title="Detail">
                            {expandedGtin === p.gtin ? <ChevronUp /> : <ChevronDown />} Detail
                          </button>
                        </div>
                      </td>
                    </tr>
                    {/* Expanded detail row */}
                    {expandedGtin === p.gtin && (
                      <tr className={styles.detailRow}>
                        <td colSpan={7}>
                          {detailLoading ? (
                            <div className={styles.loading}><div className={styles.spinner} />Memuat detail...</div>
                          ) : detailData ? (
                            <div className={styles.detailContent}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <strong style={{ fontSize: '0.9rem' }}>
                                  Instances ({detailData.instances.length})
                                </strong>
                                <button className={styles.btnPrimary} style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem' }} onClick={() => setShowCreateInstance(p.gtin)}>
                                  <PlusIcon /> Tambah Instance
                                </button>
                              </div>
                              {detailData.instances.length > 0 ? (
                                <div className={styles.instancesGrid}>
                                  {renderInstanceCards(detailData.instances, handleViewQR)}
                                </div>
                              ) : (
                                <p style={{ color: '#9ca3af', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>
                                  Belum ada instance. Klik "+ Tambah Instance" untuk membuat.
                                </p>
                              )}
                            </div>
                          ) : null}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/*  Modal: Create Product  */}
      {showCreateProduct && (
        <CreateProductModal
          onClose={() => setShowCreateProduct(false)}
          onCreated={() => { setShowCreateProduct(false); loadProducts(); }}
        />
      )}

      {/*  Modal: Create Instance*/}
      {showCreateInstance && (
        <CreateInstanceModal
          gtin={showCreateInstance}
          onClose={() => setShowCreateInstance(null)}
          onCreated={(result) => {
            setShowCreateInstance(null);
            setShowQR({ gs1Url: result.gs1Url, qrDataUrl: result.qrDataUrl });
            loadProducts();
            // Refresh detail if expanded
            if (expandedGtin === showCreateInstance) {
              getProductDetail(showCreateInstance).then(setDetailData).catch(console.error);
            }
          }}
        />
      )}

      {/*Modal: QR Display*/}
      {showQR && (
        <div className={styles.modalOverlay} onClick={() => setShowQR(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>QR Code - GS1 Digital Link</h2>
              <button className={styles.modalClose} onClick={() => setShowQR(null)}><CloseIcon /></button>
            </div>
            <div className={styles.qrContent}>
              <img src={showQR.qrDataUrl} alt="QR Code" className={styles.qrImage} />
              <div className={styles.qrUrl}>{showQR.gs1Url}</div>
              <div className={styles.qrActions}>
                <button className={styles.btnPrimary} onClick={handleDownloadQR}>
                  <DownloadIcon /> Download QR
                </button>
                <button className={styles.btnCancel} onClick={() => setShowQR(null)}>Tutup</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Create Product Modal
interface CreateProductModalProps {
  onClose: () => void;
  onCreated: () => void;
}

const CreateProductModal: React.FC<CreateProductModalProps> = ({ onClose, onCreated }) => {
  const [form, setForm] = useState({
    product_name: '',
    category: '',
    weight_grams: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.product_name) {
      setError('Nama Produk wajib diisi');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await createProduct({
        product_name: form.product_name,
        category: form.category || undefined,
        weight_grams: form.weight_grams ? parseInt(form.weight_grams, 10) : undefined,
        material_passport: {
          '@context': 'https://schema.org/',
          '@type': 'Product',
          material: [],
          recyclingInstructions: '',
        },
      });
      onCreated();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Tambah Produk Baru</h2>
          <button className={styles.modalClose} onClick={onClose}><CloseIcon /></button>
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
            <button type="button" className={styles.btnCancel} onClick={onClose}>Batal</button>
            <button type="submit" className={styles.btnSave} disabled={saving} id="btn-save-product">
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

//  Create Instance Modal
interface CreateInstanceModalProps {
  gtin: string;
  onClose: () => void;
  onCreated: (result: { gs1Url: string; qrDataUrl: string }) => void;
}

const CreateInstanceModal: React.FC<CreateInstanceModalProps> = ({ gtin, onClose, onCreated }) => {
  const [type, setType] = useState<'BATCH' | 'UNIQUE'>('UNIQUE');
  const [identifier, setIdentifier] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier) {
      setError('Nomor identitas wajib diisi');
      return;
    }
    const identityNumber = Number(identifier);
    if (!Number.isInteger(identityNumber) || identityNumber <= 0) {
      setError('Nomor identitas harus berupa angka positif');
      return;
    }
    const qty = parseInt(quantity, 10);
    if (type === 'BATCH' && (isNaN(qty) || qty < 1)) {
      setError('Jumlah item harus minimal 1');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const result = await createInstance(gtin, {
        identification_type: type,
        identity_number: identityNumber,
        quantity: type === 'BATCH' ? qty : undefined,
      });
      onCreated({ gs1Url: result.gs1Url, qrDataUrl: result.qrDataUrl });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Buat Instance Baru</h2>
          <button className={styles.modalClose} onClick={onClose}><CloseIcon /></button>
        </div>

        {error && <div className={styles.errorBanner}>{error}</div>}

        <div style={{ marginBottom: '1rem', fontSize: '0.85rem', color: '#6b7280' }}>
          GTIN: <code style={{ background: '#f3f4f6', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>{gtin}</code>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Tipe Identifikasi</label>
            <div className={styles.toggleGroup}>
              <button
                type="button"
                className={`${styles.toggleBtn} ${type === 'UNIQUE' ? styles.toggleBtnActive : ''}`}
                onClick={() => { setType('UNIQUE'); setIdentifier(''); }}
              >
                Serial (UNIQUE)
              </button>
              <button
                type="button"
                className={`${styles.toggleBtn} ${type === 'BATCH' ? styles.toggleBtnActive : ''}`}
                onClick={() => { setType('BATCH'); setIdentifier(''); }}
              >
                Batch (BATCH)
              </button>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              Nomor Identitas
            </label>
            <input
              className={styles.formInput}
              placeholder={type === 'BATCH' ? 'Contoh: 12345' : 'Contoh: 98765'}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value.replace(/\D/g, ''))}
              id="input-identifier"
              inputMode="numeric"
              required
            />
            <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.35rem' }}>
              Sistem akan otomatis menyimpan sebagai <strong>{type === 'BATCH' ? `BATCH-${identifier || '...'}` : `SERIAL-${identifier || '...'}`}</strong>.
            </p>
          </div>

          {type === 'BATCH' && (
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Jumlah Item Fisik</label>
              <input
                className={styles.formInput}
                type="number"
                min="1"
                max="10000"
                placeholder="Contoh: 100"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value.replace(/\D/g, '') || '1')}
                id="input-quantity"
              />
              <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.35rem' }}>
                Satu QR Batch mewakili <strong>{parseInt(quantity) || 1} item fisik</strong>. Setiap item dapat dipindai secara terpisah oleh konsumen.
              </p>
            </div>
          )}

          <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '0.75rem', fontSize: '0.8rem', color: '#6b7280', marginBottom: '1rem' }}>
            <strong>GS1 Digital Link Preview:</strong><br />
            <code>
              {type === 'UNIQUE'
                ? `https://sampahku.id/01/${gtin}/21/SERIAL-${identifier || '...'}`
                : `https://sampahku.id/01/${gtin}/10/BATCH-${identifier || '...'}`
              }
            </code>
          </div>

          <div className={styles.modalActions}>
            <button type="button" className={styles.btnCancel} onClick={onClose}>Batal</button>
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
