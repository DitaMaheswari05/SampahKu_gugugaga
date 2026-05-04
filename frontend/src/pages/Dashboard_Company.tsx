import React, { useEffect, useMemo, useState } from 'react';
import { getProductDetail, getProducts, Product, ProductDetail } from '../services/product.service';
import Header from '../components/Header';
import styles from '../styles/DashboardCompany.module.css';

type TrendPoint = {
  label: string;
  total: number;
  recycled: number;
};

type CategorySlice = {
  name: string;
  value: number;
  percent: number;
  color: string;
};

type TopProduct = {
  gtin: string;
  name: string;
  total: number;
  trendPercent: number;
};

type DashboardData = {
  totalTracked: number;
  recycledTotal: number;
  recoveryRate: number;
  activeParticipation: number;
  trend: TrendPoint[];
  categories: CategorySlice[];
  topProducts: TopProduct[];
};

const CATEGORY_COLORS = ['#19b381', '#4f86ee', '#f59f2f', '#8a63d2', '#ef5f87', '#00a6a6'];

const numberFormatter = new Intl.NumberFormat('id-ID');

function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return '0%';
  return `${Math.round(value)}%`;
}

function getMonthKey(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}`;
}

function getMonthLabel(date: Date): string {
  return date.toLocaleDateString('id-ID', { month: 'short' });
}

function getLastMonths(monthCount: number): Date[] {
  const now = new Date();
  const months: Date[] = [];

  for (let i = monthCount - 1; i >= 0; i--) {
    months.push(new Date(now.getFullYear(), now.getMonth() - i, 1));
  }

  return months;
}

function getInstanceTrendPercent(
  instances: { gtin: string; last_updated: string }[],
  gtin: string
): number {
  const now = new Date();

  const currentStart = new Date(now);
  currentStart.setDate(now.getDate() - 30);

  const previousStart = new Date(now);
  previousStart.setDate(now.getDate() - 60);

  const current = instances.filter((item) => {
    if (item.gtin !== gtin) return false;
    const updated = new Date(item.last_updated);
    return updated >= currentStart;
  }).length;

  const previous = instances.filter((item) => {
    if (item.gtin !== gtin) return false;
    const updated = new Date(item.last_updated);
    return updated >= previousStart && updated < currentStart;
  }).length;

  if (previous === 0) return current > 0 ? 100 : 0;

  return Math.round(((current - previous) / previous) * 100);
}

function buildDashboardData(products: Product[], details: ProductDetail[]): DashboardData {
  const totalTracked = products.reduce((sum, product) => sum + product.stats.total, 0);
  const recycledTotal = products.reduce((sum, product) => sum + product.stats.recycled, 0);
  const inMarket = products.reduce((sum, product) => sum + product.stats.in_market, 0);
  const inProgress = products.reduce((sum, product) => sum + product.stats.in_progress, 0);
  const activeParticipation = inMarket + inProgress;
  const recoveryRate = totalTracked > 0 ? (recycledTotal / totalTracked) * 100 : 0;

  const months = getLastMonths(6);
  const totalByMonth = new Map<string, number>();
  const recycledByMonth = new Map<string, number>();

  months.forEach((month) => {
    totalByMonth.set(getMonthKey(month), 0);
    recycledByMonth.set(getMonthKey(month), 0);
  });

  const flatInstances: { gtin: string; current_status: string; last_updated: string }[] = [];

  for (const detail of details) {
    for (const instance of detail.instances) {
      flatInstances.push({
        gtin: instance.gtin,
        current_status: instance.current_status,
        last_updated: instance.last_updated,
      });

      const updated = new Date(instance.last_updated);
      const monthKey = getMonthKey(new Date(updated.getFullYear(), updated.getMonth(), 1));

      if (!totalByMonth.has(monthKey)) continue;

      totalByMonth.set(monthKey, (totalByMonth.get(monthKey) || 0) + 1);

      if (instance.current_status === 'RECYCLED') {
        recycledByMonth.set(monthKey, (recycledByMonth.get(monthKey) || 0) + 1);
      }
    }
  }

  const trend = months.map((month) => {
    const key = getMonthKey(month);

    return {
      label: getMonthLabel(month),
      total: totalByMonth.get(key) || 0,
      recycled: recycledByMonth.get(key) || 0,
    };
  });

  const categoryMap = new Map<string, number>();

  for (const product of products) {
    const key = product.category || 'Lainnya';
    categoryMap.set(key, (categoryMap.get(key) || 0) + product.stats.total);
  }

  const categoriesRaw = Array.from(categoryMap.entries())
    .map(([name, value]) => ({ name, value }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);

  const categories = categoriesRaw.map((item, idx) => ({
    ...item,
    percent: totalTracked > 0 ? (item.value / totalTracked) * 100 : 0,
    color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
  }));

  const topProducts = [...products]
    .sort((a, b) => b.stats.total - a.stats.total)
    .slice(0, 5)
    .map((product) => ({
      gtin: product.gtin,
      name: product.product_name,
      total: product.stats.total,
      trendPercent: getInstanceTrendPercent(flatInstances, product.gtin),
    }));

  return {
    totalTracked,
    recycledTotal,
    recoveryRate,
    activeParticipation,
    trend,
    categories,
    topProducts,
  };
}

function buildLinePath(values: number[], width: number, height: number, padding: number): string {
  const max = Math.max(...values, 1);
  const stepX = values.length > 1 ? (width - padding * 2) / (values.length - 1) : 0;

  return values
    .map((value, idx) => {
      const x = padding + stepX * idx;
      const y = height - padding - (value / max) * (height - padding * 2);

      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

function buildPieGradient(categories: CategorySlice[]): string {
  if (categories.length === 0) {
    return 'conic-gradient(#dbe5d1 0deg 360deg)';
  }

  let start = 0;

  const segments = categories.map((item) => {
    const end = start + (item.percent / 100) * 360;
    const segment = `${item.color} ${start}deg ${end}deg`;
    start = end;
    return segment;
  });

  return `conic-gradient(${segments.join(', ')})`;
}

const DashboardCompany: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);

  const loadDashboard = async () => {
    setLoading(true);
    setError('');

    try {
      const products = await getProducts();

      const detailResults = await Promise.allSettled(
        products.map((product) => getProductDetail(product.gtin))
      );

      const details = detailResults
        .filter((result): result is PromiseFulfilledResult<ProductDetail> => result.status === 'fulfilled')
        .map((result) => result.value);

      setDashboardData(buildDashboardData(products, details));
    } catch (e: any) {
      const message = e?.message || '';

      if (/invalid token|unauthorized|jwt/i.test(message)) {
        setError('Sesi login habis. Silakan login ulang untuk melihat dashboard.');
      } else {
        setError(message || 'Gagal memuat dashboard perusahaan');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const trendChart = useMemo(() => {
    if (!dashboardData || dashboardData.trend.length === 0) {
      return {
        totalPath: '',
        recycledPath: '',
        max: 1,
      };
    }

    const totals = dashboardData.trend.map((item) => item.total);
    const recycled = dashboardData.trend.map((item) => item.recycled);
    const max = Math.max(...totals, ...recycled, 1);
    const scale = (values: number[]) => values.map((value) => Math.round((value / max) * 1000));

    return {
      totalPath: buildLinePath(scale(totals), 640, 260, 34),
      recycledPath: buildLinePath(scale(recycled), 640, 260, 34),
      max,
    };
  }, [dashboardData]);

  const pieBackground = useMemo(() => {
    if (!dashboardData) return 'conic-gradient(#dbe5d1 0deg 360deg)';
    return buildPieGradient(dashboardData.categories);
  }, [dashboardData]);

  return (
    <div className={styles.page}>
      <Header />

      <main className={styles.mainContent}>
        <section className={styles.pageTitleBlock}>
          <h1>Executive Dashboard</h1>
          <p>Ringkasan performa pengelolaan sampah produk Anda</p>
        </section>

        {loading ? (
          <section className={styles.stateCard}>Memuat data dashboard...</section>
        ) : error ? (
          <section className={styles.stateCardError}>
            <p>{error}</p>
            <button className={styles.retryBtn} onClick={loadDashboard}>
              Coba lagi
            </button>
          </section>
        ) : dashboardData ? (
          <>
            <section className={styles.kpiGrid}>
              <article className={styles.kpiCard}>
                <div className={styles.kpiHeader}>
                  <h3>Total Produk Terlacak</h3>
                  <span className={styles.kpiIcon}>
                    <img src="/assets/kotak.png" alt="" className={styles.kpiIconImage} />
                  </span>
                </div>
                <strong>{numberFormatter.format(dashboardData.totalTracked)}</strong>
                <p className={styles.kpiHint}>Total seluruh instance yang tercatat</p>
              </article>

              <article className={styles.kpiCard}>
                <div className={styles.kpiHeader}>
                  <h3>Berhasil Didaur Ulang</h3>
                  <span className={styles.kpiIcon}>
                    <img src="/assets/naik.png" alt="" className={styles.kpiIconImage} />
                  </span>
                </div>
                <strong>{numberFormatter.format(dashboardData.recycledTotal)}</strong>
                <p className={styles.kpiHint}>Jumlah instance dengan status RECYCLED</p>
              </article>

              <article className={styles.kpiCard}>
                <div className={styles.kpiHeader}>
                  <h3>Recovery Rate</h3>
                  <span className={styles.kpiIcon}>
                    <img src="/assets/grafik.png" alt="" className={styles.kpiIconImage} />
                  </span>
                </div>
                <strong>{formatPercent(dashboardData.recoveryRate)}</strong>
                <p className={styles.kpiHint}>Persentase berhasil didaur ulang</p>
              </article>

              <article className={styles.kpiCard}>
                <div className={styles.kpiHeader}>
                  <h3>Partisipasi Aktif</h3>
                  <span className={styles.kpiIcon}>
                    <img src="/assets/people.png" alt="" className={styles.kpiIconImage} />
                  </span>
                </div>
                <strong>{numberFormatter.format(dashboardData.activeParticipation)}</strong>
                <p className={styles.kpiHint}>Status IN_MARKET + IN_PROGRESS</p>
              </article>
            </section>

            <section className={styles.chartsRow}>
              <article className={styles.chartCard}>
                <h2>Tren Pengelolaan Sampah</h2>

                <div className={styles.lineChartWrap}>
                  <svg
                    className={styles.lineChart}
                    viewBox="0 0 640 260"
                    preserveAspectRatio="none"
                    aria-label="Tren pengelolaan"
                  >
                    <g>
                      {[0, 1, 2, 3, 4].map((idx) => (
                        <line
                          key={idx}
                          x1="34"
                          y1={34 + idx * 48}
                          x2="606"
                          y2={34 + idx * 48}
                          className={styles.gridLine}
                        />
                      ))}
                    </g>

                    <path d={trendChart.totalPath} className={styles.totalPath} />
                    <path d={trendChart.recycledPath} className={styles.recycledPath} />

                    {dashboardData.trend.map((point, idx) => {
                      const max = Math.max(
                        ...dashboardData.trend.map((x) => x.total),
                        ...dashboardData.trend.map((x) => x.recycled),
                        1
                      );

                      const x = 34 + (idx * (640 - 68)) / Math.max(dashboardData.trend.length - 1, 1);
                      const yTotal = 260 - 34 - (point.total / max) * (260 - 68);
                      const yRecycle = 260 - 34 - (point.recycled / max) * (260 - 68);

                      return (
                        <g key={point.label}>
                          <circle cx={x} cy={yTotal} r="4" className={styles.totalDot} />
                          <circle cx={x} cy={yRecycle} r="4" className={styles.recycledDot} />
                        </g>
                      );
                    })}
                  </svg>
                </div>

                <div className={styles.monthAxis}>
                  {dashboardData.trend.map((point) => (
                    <span key={point.label}>{point.label}</span>
                  ))}
                </div>

                <div className={styles.legend}>
                  <span>
                    <i className={styles.legendBlue} />
                    Terkumpul
                  </span>
                  <span>
                    <i className={styles.legendGreen} />
                    Didaur Ulang
                  </span>
                </div>
              </article>

              <article className={styles.chartCard}>
                <h2>Distribusi Kategori Sampah</h2>

                <div className={styles.pieArea}>
                  <div className={styles.pieChart} style={{ background: pieBackground }}>
                    <div className={styles.pieHole} />
                  </div>

                  <div className={styles.pieLegend}>
                    {dashboardData.categories.length === 0 ? (
                      <p className={styles.emptyText}>Belum ada data kategori.</p>
                    ) : (
                      dashboardData.categories.map((category) => (
                        <div className={styles.legendRow} key={category.name}>
                          <span
                            className={styles.legendDot}
                            style={{ backgroundColor: category.color }}
                          />
                          <span>{category.name}</span>
                          <strong>{formatPercent(category.percent)}</strong>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </article>
            </section>

            <section className={styles.tableCard}>
              <h2>Produk Paling Banyak Dilacak</h2>

              <div className={styles.tableWrap}>
                <table>
                  <thead>
                    <tr>
                      <th>Nama Produk</th>
                      <th>GTIN</th>
                      <th>Jumlah</th>
                      <th>Tren</th>
                    </tr>
                  </thead>

                  <tbody>
                    {dashboardData.topProducts.length === 0 ? (
                      <tr>
                        <td colSpan={4} className={styles.emptyCell}>
                          Belum ada produk terlacak.
                        </td>
                      </tr>
                    ) : (
                      dashboardData.topProducts.map((product, index) => (
                        <tr key={product.gtin}>
                          <td>
                            <div className={styles.productCell}>
                              <span className={styles.rank}>{index + 1}</span>
                              <span>{product.name}</span>
                            </div>
                          </td>
                          <td className={styles.gtinCell}>{product.gtin}</td>
                          <td>
                            <strong>{numberFormatter.format(product.total)}</strong>
                          </td>
                          <td>
                            <span className={product.trendPercent >= 0 ? styles.trendUp : styles.trendDown}>
                              {product.trendPercent >= 0 ? '↗' : '↘'} {Math.abs(product.trendPercent)}%
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
};

export default DashboardCompany;