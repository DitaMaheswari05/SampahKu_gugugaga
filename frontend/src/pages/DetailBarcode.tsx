import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { getGtinAggregateStats, getGtinRecentActivities, GtinAggregateStats } from '../services/konsumen.service';
import styles from '../styles/DetailSampah.module.css';

const BIZ_STEP_LABELS: Record<string, string> = {
  commissioning: 'Terdaftar',
  discarding: 'Dibuang',
  collecting: 'Terkumpul',
  receiving: 'Diterima',
  inspecting: 'Dipilah',
  shipping: 'Diproses',
  recycling: 'Didaur Ulang',
  disposing: 'Dibuang (TPA)',
};

const BIZ_STEP_COLORS: Record<string, string> = {
  commissioning: '#3B82F6',
  discarding: '#FBBF24',
  collecting: '#10B981',
  receiving: '#8B5CF6',
  inspecting: '#EC4899',
  shipping: '#F59E0B',
  recycling: '#6366F1',
  disposing: '#DC2626',
};

interface RecentActivity {
  activity_id: string;
  timestamp: string;
  biz_step: string;
  location_name?: string;
  facility_type?: string;
  tps_name?: string;
  actor_name: string;
  actor_role: string;
}

const DetailBarcode: React.FC = () => {
  const { gtin } = useParams<{ gtin: string }>();
  const navigate = useNavigate();
  
  const [stats, setStats] = useState<GtinAggregateStats | null>(null);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [productInfo, setProductInfo] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError('');
      try {
        if (!gtin) throw new Error('GTIN tidak ditemukan');

        // Fetch aggregate stats
        const statsData = await getGtinAggregateStats(gtin);
        setStats(statsData);

        // Fetch recent activities
        const activitiesData = await getGtinRecentActivities(gtin, 5);
        setRecentActivities(activitiesData);

        // TODO: Fetch product info dari products table via API
        setProductInfo({
          product_name: 'Product Name',
          category: 'Category',
          gtin: gtin,
        });
      } catch (e: any) {
        setError(e.message || 'Gagal memuat data barcode');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [gtin]);

  if (loading) {
    return (
      <div style={{ background: '#F3F4F6', minHeight: '100vh' }}>
        <Header />
        <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
          Memuat data...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ background: '#F3F4F6', minHeight: '100vh' }}>
        <Header />
        <div style={{ textAlign: 'center', padding: '3rem', color: '#D4183D' }}>
          <p>{error}</p>
          <button onClick={() => navigate('/dashboard')} style={{
            marginTop: '1rem',
            padding: '0.5rem 1rem',
            background: '#8BC34A',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}>
            Kembali
          </button>
        </div>
      </div>
    );
  }

  const totalScans = stats ? Object.values(stats).reduce((sum: number, item: any) => sum + item.count, 0) : 0;

  return (
    <div style={{ background: '#F3F4F6', minHeight: '100vh' }}>
      <Header />

      <main style={{ maxWidth: '768px', margin: '0 auto', padding: '2rem 1rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            ←
          </button>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Detail Barcode</h1>
            <p style={{ margin: '0.25rem 0 0', color: '#666', fontSize: '0.875rem' }}>GTIN: {gtin}</p>
          </div>
        </div>

        {/* Product Info Card */}
        <div style={{
          background: 'white',
          borderRadius: '8px',
          padding: '1.5rem',
          marginBottom: '2rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}>
          <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem', fontWeight: 600 }}>
            {productInfo?.product_name || 'Unknown Product'}
          </h2>
          <p style={{ margin: '0.5rem 0', color: '#666', fontSize: '0.875rem' }}>
            <strong>Kategori:</strong> {productInfo?.category || 'Unknown'}
          </p>
          <p style={{ margin: '0.5rem 0', color: '#666', fontSize: '0.875rem' }}>
            <strong>Tipe:</strong> Barcode Scan (Tier 2)
          </p>
          <p style={{ margin: '1rem 0 0', fontSize: '1.125rem', fontWeight: 600, color: '#8BC34A' }}>
            Total Scan: {totalScans}
          </p>
        </div>

        {/* Aggregate Stats Bars */}
        <div style={{
          background: 'white',
          borderRadius: '8px',
          padding: '1.5rem',
          marginBottom: '2rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}>
          <h3 style={{ margin: '0 0 1.5rem', fontSize: '1rem', fontWeight: 600 }}>Persebaran Aktivitas</h3>

          {stats && Object.keys(stats).length > 0 ? (
            Object.entries(stats).map(([bizStep, data]: [string, any]) => {
              const percentage = totalScans > 0 ? Math.round((data.count / totalScans) * 100) : 0;
              return (
                <div key={bizStep} style={{ marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                      {BIZ_STEP_LABELS[bizStep] || bizStep}
                    </span>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#333' }}>
                      {data.count} scan ({percentage}%)
                    </span>
                  </div>
                  <div style={{
                    background: '#E5E7EB',
                    borderRadius: '4px',
                    height: '24px',
                    overflow: 'hidden',
                  }}>
                    <div
                      style={{
                        background: BIZ_STEP_COLORS[bizStep] || '#8BC34A',
                        height: '100%',
                        width: `${percentage}%`,
                        transition: 'width 0.3s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                      }}
                    >
                      {percentage > 10 && `${percentage}%`}
                    </div>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#999', marginTop: '0.25rem' }}>
                    Scan terakhir: {new Date(data.last_scanned_at).toLocaleDateString('id-ID')}
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ textAlign: 'center', color: '#999', padding: '1rem' }}>
              Belum ada data aktivitas
            </div>
          )}
        </div>

        {/* Recent Activities */}
        {recentActivities.length > 0 && (
          <div style={{
            background: 'white',
            borderRadius: '8px',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}>
            <h3 style={{ margin: '0 0 1.5rem', fontSize: '1rem', fontWeight: 600 }}>Aktivitas Terbaru</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {recentActivities.map((activity) => (
                <div key={activity.activity_id} style={{
                  borderLeft: `4px solid ${BIZ_STEP_COLORS[activity.biz_step] || '#8BC34A'}`,
                  paddingLeft: '1rem',
                  paddingTop: '0.5rem',
                  paddingBottom: '0.5rem',
                }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                    {BIZ_STEP_LABELS[activity.biz_step] || activity.biz_step}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
                    {new Date(activity.timestamp).toLocaleDateString('id-ID', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                  {activity.tps_name && (
                    <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
                      <strong>Lokasi:</strong> {activity.tps_name}
                    </div>
                  )}
                  <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
                    <strong>Oleh:</strong> {activity.actor_name} ({activity.actor_role})
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={() => navigate('/dashboard')}
          style={{
            marginTop: '2rem',
            width: '100%',
            padding: '0.75rem',
            background: '#8BC34A',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Kembali ke Wallet
        </button>
      </main>
    </div>
  );
};

export default DetailBarcode;
