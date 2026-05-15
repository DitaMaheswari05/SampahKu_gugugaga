# SampahKu — Implementation Plan (Feedback Juri)

## Perubahan Database

### Skema Sekarang (relevant tables)

#### `products` (PERLU PENAMBAHAN KOLOM)
```sql
id               uuid PK
gtin             varchar UNIQUE
sku              varchar
brand_id         uuid FK → profiles.id    -- NULL untuk Tier 2 (auto-created via OFF)
source           text CHECK IN ('BRAND_MANUAL','OFF_AUTO')
product_name     text NOT NULL
material_passport jsonb NOT NULL
category         text
weight_grams     integer
off_last_synced_at timestamptz
created_at       timestamptz
```

#### `product_instances` (PERLU NORMALISASI IDENTITAS)
```sql
id                  uuid PK
product_id          uuid FK → products.id
identification_type text CHECK IN ('BATCH', 'UNIQUE')
identity_number     bigint NOT NULL        -- input mentah angka saja dari form
batch_number        text                   -- generated/derived: BATCH-{identity_number}
serial_number       text                   -- generated/derived: SERIAL-{identity_number}
current_status      text DEFAULT 'IN_MARKET'
last_updated        timestamptz
```

#### `brand_gtin_prefixes` (BARU)
```sql
id              uuid PK
brand_id        uuid FK → profiles.id
prefix          varchar NOT NULL            -- contoh: 8992753
is_active       boolean DEFAULT true
verified_at     timestamptz
created_at      timestamptz
```

#### `activities` (SEKARANG)
```sql
id              uuid PK
instance_id     uuid FK → product_instances.id   -- ⚠️ sekarang NOT NULL
actor_id        uuid FK → profiles.id
tps_id          uuid FK → tps_facilities.id
event_type      text DEFAULT 'ObjectEvent'
biz_step        text
location_name   text
facility_type   text CHECK (...)
coordinates     jsonb
epcis_body      jsonb
timestamp       timestamptz DEFAULT now()
blockchain_hash text
evidence_url    text
```

---

### Perubahan 1: ALTER TABLE `activities`

```sql
-- 1a. Tier 2 activities tidak punya product_instance individual
--     Sehingga instance_id harus nullable
ALTER TABLE activities ALTER COLUMN instance_id DROP NOT NULL;

-- 1b. Tambah kolom aggregate_id (FK ke tabel baru sku_aggregates)
--     Diisi saat activity berasal dari scan barcode biasa (Tier 2)
ALTER TABLE activities ADD COLUMN aggregate_id uuid;

-- 1c. Tambah kolom gtin langsung di activity
--     Dipakai untuk query wallet konsumen Tier 2 tanpa harus join instance → product
--     Untuk Tier 1, tetap pakai instance_id → product_instances → products.gtin
ALTER TABLE activities ADD COLUMN gtin varchar;
```

**Skema `activities` setelah perubahan:**
```sql
id              uuid PK
instance_id     uuid FK → product_instances.id   -- ✅ NULLABLE (NULL untuk Tier 2)
aggregate_id    uuid FK → sku_aggregates.id       -- ✅ BARU (NULL untuk Tier 1)
gtin            varchar                           -- ✅ BARU (diisi untuk Tier 2)
actor_id        uuid FK → profiles.id
tps_id          uuid FK → tps_facilities.id
event_type      text DEFAULT 'ObjectEvent'
biz_step        text
location_name   text
facility_type   text CHECK (...)
coordinates     jsonb
epcis_body      jsonb
timestamp       timestamptz DEFAULT now()
blockchain_hash text
evidence_url    text
```

> [!IMPORTANT]
> **Constraint**: Setiap row activities harus punya SALAH SATU dari `instance_id` (Tier 1) atau `gtin` + `aggregate_id` (Tier 2). Keduanya tidak boleh NULL bersamaan.

```sql
ALTER TABLE activities ADD CONSTRAINT chk_tier
  CHECK (instance_id IS NOT NULL OR gtin IS NOT NULL);
```

---

### Perubahan 2: CREATE TABLE `sku_aggregates` (BARU)

Tabel ini adalah **scan event counter** per GTIN × TPS × biz_step. Bukan unit counter.

```sql
CREATE TABLE sku_aggregates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gtin            varchar NOT NULL,              -- Barcode GTIN (EAN-13)
  product_id      uuid REFERENCES products(id),  -- FK ke products (jika resolved dari OFF)
  tps_id          uuid REFERENCES tps_facilities(id),  -- TPS tempat scan terjadi
  biz_step        text NOT NULL,                 -- collecting, inspecting, recycling, dll
  count           integer NOT NULL DEFAULT 1,    -- Jumlah scan events (bukan unit unik!)
  last_scanned_at timestamptz DEFAULT now(),     -- Timestamp scan terakhir
  created_at      timestamptz DEFAULT now(),
  
  UNIQUE(gtin, tps_id, biz_step)  -- 1 row per kombinasi GTIN × TPS × biz_step
);
```

> [!WARNING]
> `count` = jumlah **scan events**, BUKAN jumlah unit unik. Karena kita tidak tahu apakah scan baru = unit baru atau unit yang sama, kita hanya bisa menghitung throughput, bukan recovery rate.

**Contoh data:**

| gtin | tps_id | biz_step | count |
|------|--------|----------|-------|
| 8992753020012 | TPS-Kebayoran | collecting | 150 |
| 8992753020012 | TPS-Kebayoran | inspecting | 120 |
| 8992753020012 | TPS-Menteng | collecting | 80 |
| 8992753020012 | TPS-Menteng | recycling | 65 |

---

### Perubahan 3: Tambah FK constraint

```sql
-- FK dari activities.aggregate_id ke sku_aggregates
ALTER TABLE activities 
  ADD CONSTRAINT fk_activities_aggregate 
  FOREIGN KEY (aggregate_id) REFERENCES sku_aggregates(id);
```

---

### Perubahan 4: Registrasi Prefix GTIN per Produsen (BARU)

Untuk memastikan produk Tier 1 yang didaftarkan produsen valid secara kepemilikan prefix GTIN.

```sql
CREATE TABLE IF NOT EXISTS brand_gtin_prefixes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  prefix      varchar NOT NULL,
  is_active   boolean NOT NULL DEFAULT true,
  verified_at timestamptz,
  created_at  timestamptz DEFAULT now(),
  UNIQUE (brand_id, prefix)
);

CREATE INDEX IF NOT EXISTS idx_brand_gtin_prefixes_prefix
  ON brand_gtin_prefixes(prefix) WHERE is_active = true;
```

**Constraint bisnis produk:**
1. Produk buatan produsen (`source='BRAND_MANUAL'`) wajib punya `brand_id`.
2. GTIN produk buatan produsen harus match salah satu prefix aktif milik produsen pada `brand_gtin_prefixes`.
3. Produk hasil OFF (`source='OFF_AUTO'`) boleh `brand_id = NULL`.

Implementasi constraint di database menggunakan trigger `BEFORE INSERT/UPDATE` pada `products`:

```sql
-- Pseudocode trigger rule
IF NEW.source = 'BRAND_MANUAL' THEN
  assert NEW.brand_id IS NOT NULL;
  assert EXISTS (
    SELECT 1
    FROM brand_gtin_prefixes p
    WHERE p.brand_id = NEW.brand_id
      AND p.is_active = true
      AND NEW.gtin LIKE p.prefix || '%'
  );
END IF;
```

---

### Perubahan 5: Normalisasi Pendaftaran Instance (input angka saja)

Target UX: saat create instance, produsen hanya input angka (`12345`), sistem yang format menjadi `BATCH-12345` atau `SERIAL-12345`.

```sql
-- 5a. Tambah kolom identity_number sebagai source-of-truth
ALTER TABLE product_instances
  ADD COLUMN IF NOT EXISTS identity_number bigint;

-- 5b. Backfill dari data lama (contoh parsing)
-- BATCH-00123 -> 123
-- SERIAL-98765 -> 98765

-- 5c. Setelah backfill sukses
ALTER TABLE product_instances
  ALTER COLUMN identity_number SET NOT NULL;

-- 5d. Constraint konsistensi format turunan
ALTER TABLE product_instances
  ADD CONSTRAINT chk_instance_identity_positive
  CHECK (identity_number > 0);
```

**Aturan aplikasi + DB untuk instance:**
1. `identification_type='BATCH'` -> simpan `identity_number`, derive `batch_number='BATCH-' || identity_number`, `serial_number=NULL`.
2. `identification_type='UNIQUE'` -> simpan `identity_number`, derive `serial_number='SERIAL-' || identity_number`, `batch_number=NULL`.
3. UI tidak lagi meminta user mengetik prefix `BATCH-`/`SERIAL-` secara manual.

---

### Perubahan 6: OFF Resolution Metadata untuk Histori Konsumen & Update Petugas

Agar GTIN yang belum terdaftar tetap bisa dipakai lintas alur:

```sql
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'BRAND_MANUAL',
  ADD COLUMN IF NOT EXISTS off_last_synced_at timestamptz;

ALTER TABLE products
  ADD CONSTRAINT chk_products_source
  CHECK (source IN ('BRAND_MANUAL','OFF_AUTO'));
```

`source='OFF_AUTO'` menandai produk auto-created dari Open Food Facts sehingga:
- Petugas tetap bisa update status detail berbasis `biz_step` (collecting/sorting/recycling).
- Konsumen tetap bisa baca histori agregat produk (bukan timeline unit unik).

---

### Diagram Relasi Setelah Perubahan

```
auth.users (Supabase built-in)
    │
    └──► profiles (id FK → auth.users.id)
              │
              ├──► tps_facilities (admin_id FK → profiles.id)
              │         │
              │         ├──► profiles.tps_id FK → tps_facilities.id
              │         │
              │         └──► sku_aggregates (tps_id FK) ← BARU
              │
              ├──► products (brand_id FK → profiles.id)
              │         │                                    ▲
              │         ├──► product_instances               │ product_id FK
              │         │         │                          │
              │         │         └──► activities ◄──────────┤
              │         │              (instance_id FK)      │
              │         │                                    │
              │         └──► sku_aggregates (product_id FK) ─┘
              │                   │
              │                   └──► activities (aggregate_id FK)
              │
              └──► activities (actor_id FK → profiles.id)
```

**Tier 1 flow**: `products` → `product_instances` → `activities` (via `instance_id`)
**Tier 2 flow**: `products` → `sku_aggregates` → `activities` (via `aggregate_id` + `gtin`)

---

### SQL Migration Script (lengkap)

```sql
-- ============================================================
-- SampahKu Two-Tier Migration
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Create sku_aggregates table
CREATE TABLE IF NOT EXISTS sku_aggregates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gtin            varchar NOT NULL,
  product_id      uuid REFERENCES products(id),
  tps_id          uuid REFERENCES tps_facilities(id),
  biz_step        text NOT NULL,
  count           integer NOT NULL DEFAULT 1,
  last_scanned_at timestamptz DEFAULT now(),
  created_at      timestamptz DEFAULT now(),
  UNIQUE(gtin, tps_id, biz_step)
);

-- 2. Alter activities table
ALTER TABLE activities ALTER COLUMN instance_id DROP NOT NULL;

ALTER TABLE activities ADD COLUMN IF NOT EXISTS aggregate_id uuid
  REFERENCES sku_aggregates(id);

ALTER TABLE activities ADD COLUMN IF NOT EXISTS gtin varchar;

-- 3. Add check constraint (at least one tier identifier must be present)
ALTER TABLE activities ADD CONSTRAINT chk_tier
  CHECK (instance_id IS NOT NULL OR gtin IS NOT NULL);

-- 4. Index for wallet query (Tier 2 entries by konsumen)
CREATE INDEX IF NOT EXISTS idx_activities_gtin_actor
  ON activities(actor_id, gtin) WHERE gtin IS NOT NULL AND instance_id IS NULL;

-- 5. Index for aggregate stats query
CREATE INDEX IF NOT EXISTS idx_sku_aggregates_gtin
  ON sku_aggregates(gtin);

-- 6. Brand GTIN prefixes (ownership)
CREATE TABLE IF NOT EXISTS brand_gtin_prefixes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  prefix      varchar NOT NULL,
  is_active   boolean NOT NULL DEFAULT true,
  verified_at timestamptz,
  created_at  timestamptz DEFAULT now(),
  UNIQUE (brand_id, prefix)
);

CREATE INDEX IF NOT EXISTS idx_brand_gtin_prefixes_prefix
  ON brand_gtin_prefixes(prefix) WHERE is_active = true;

-- 7. Products metadata for OFF resolution
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'BRAND_MANUAL',
  ADD COLUMN IF NOT EXISTS off_last_synced_at timestamptz;

ALTER TABLE products
  DROP CONSTRAINT IF EXISTS chk_products_source;

ALTER TABLE products
  ADD CONSTRAINT chk_products_source
  CHECK (source IN ('BRAND_MANUAL','OFF_AUTO'));

-- 8. Instance identity normalization
ALTER TABLE product_instances
  ADD COLUMN IF NOT EXISTS identity_number bigint;

ALTER TABLE product_instances
  DROP CONSTRAINT IF EXISTS chk_instance_identity_positive;

ALTER TABLE product_instances
  ADD CONSTRAINT chk_instance_identity_positive
  CHECK (identity_number IS NULL OR identity_number > 0);
```

> [!IMPORTANT]
> Trigger detail untuk validasi prefix GTIN dan auto-format identifier dibuat di migration lanjutan (`CREATE FUNCTION + CREATE TRIGGER`) agar rollback lebih aman.

---

## Mekanisme Resolve GTIN Unregistered (OFF)

### A. Alur Petugas (update status detail)

1. Petugas scan barcode EAN/GTIN di halaman scan.
2. Backend cek `products` by `gtin`.
3. Jika tidak ada, panggil Open Food Facts: `GET /api/v2/product/{gtin}.json`.
4. Mapping OFF -> internal:
   - `product_name` <- `product_name`/fallback `generic_name`
   - `category` <- `categories_tags[0]` (atau kategori default)
   - `material_passport` <- ringkasan kemasan/bahan dari OFF
   - `source='OFF_AUTO'`, `brand_id=NULL`, `off_last_synced_at=now()`
5. Upsert `sku_aggregates (gtin, tps_id, biz_step)` -> `count = count + 1`.
6. Insert `activities` Tier 2 (`instance_id=NULL`, `aggregate_id`, `gtin`, `biz_step`, `actor_id`, `tps_id`).

**Output:** TPS punya statistik operasional detail per tahap pengelolaan walaupun tanpa serial.

### B. Alur Konsumen (read histori status)

1. Konsumen scan barcode biasa untuk discard -> simpan activity Tier 2 (`biz_step='discarding'`, `gtin`).
2. Saat buka detail wallet Tier 2 (`/detail-barcode/:gtin`):
   - Ambil metadata produk dari `products` (yang sudah resolved dari OFF).
   - Query agregat status dari `sku_aggregates`:
     ```sql
     SELECT biz_step, SUM(count) AS total_scans
     FROM sku_aggregates
     WHERE gtin = :gtin
     GROUP BY biz_step;
     ```
   - Query recent updates (opsional) dari `activities` Tier 2 untuk menampilkan aktivitas terakhir.

**Output:** Konsumen melihat persebaran aktivitas produk tersebut (berapa dipilah, didaur ulang, dll), bukan timeline unit personal.

### C. Fallback & Reliability Rules

1. Jika OFF tidak punya data GTIN: buat placeholder product (`product_name='Unknown Product'`, `source='OFF_AUTO'`) supaya proses scan tetap jalan.
2. OFF timeout/error: gunakan retry ringan, lalu fallback placeholder.
3. Produk OFF yang sudah pernah diresolve tidak dipanggil ulang setiap scan; cukup sync berkala via `off_last_synced_at`.

---

## Pemetaan Data Per Halaman

### 1. Landing Page (Homepage)

#### Hero Stats

| Stat | Source | Perubahan |
|------|--------|-----------|
| Recovery Rate (90%) | Tier 1 only: `recycled / total instances` | ✅ Tetap |
| Produk Terlacak (28K+) | `COUNT(*) FROM product_instances` | ✅ Tetap |
| Pengguna Aktif (2.4K+) | `COUNT(*) FROM profiles WHERE role='konsumen'` | ✅ Tetap |
| TPS Terdaftar | `COUNT(*) FROM tps_facilities` | ✅ Tetap |

#### Fitur Unggulan Cards

| Card | Perubahan |
|------|-----------|
| **QR Code Tracking** | ✅ Tetap |
| **Blockchain Verified** | ❌ **Ganti teks**: "Data diverifikasi dengan **hash-chain SHA-256** untuk menjamin integritas dan transparansi setiap **event**" |
| **Real-time Analytics** | ✅ Tetap |

#### Cara Kerja

| Step | Perubahan |
|------|-----------|
| 1. Pindai QR Code | ✅ Tetap |
| 2. Lacak Perjalanan | ✅ Tetap |
| 3. **Dapatkan Reward** | ❌ **Ganti**: **Lihat Transparansi** — "Pantau perjalanan sampah Anda secara real-time dan lihat kontribusi nyata terhadap lingkungan" |

#### Direktori TPS

| Kolom | Perubahan |
|-------|-----------|
| Nama, Lokasi, Tipe, Volume | ✅ Tetap |
| Total Update | 🔄 Include Tier 2: `COUNT activities + SUM(sku_aggregates.count)` per TPS |
| Tahap (%) | 🔄 Include Tier 2 aggregate counts per biz_step |

#### Hero Text

| Sekarang | Perubahan |
|----------|-----------|
| "...teknologi QR code dan **blockchain**" | ❌ **Ganti**: "...teknologi QR code dan **hash-chain** untuk integritas data" |

---

### 2. Halaman Konsumen — Circular Wallet (Dashboard.tsx)

#### Stat Cards

| Card | Perubahan |
|------|-----------|
| **Total Sampah** | 🔄 `Tier1.length + Tier2.length` |
| **Didaur Ulang** | ✅ Tetap — Tier 1 only (individual status) |
| **Conversion Rate** | 🔄 Formula: `recycledTier1 / totalTier1 × 100%`. Jika no Tier 1 items → "—" |

#### Daftar Sampah

**Tier 1 card** (existing): `📦 Nama • GTIN • Tanggal [Status Badge] →`
→ Klik navigasi ke `/detail-sampah/:instance_id`

**Tier 2 card** (BARU): `📊 Nama • GTIN • Tanggal [Barcode Scan] →`
→ Klik navigasi ke `/detail-barcode/:gtin`

**Backend query Tier 2 wallet**:
```sql
SELECT a.gtin, a.timestamp, p.product_name, p.category
FROM activities a
JOIN products p ON p.gtin = a.gtin
WHERE a.actor_id = :userId
  AND a.biz_step = 'discarding'
  AND a.instance_id IS NULL
  AND a.gtin IS NOT NULL
ORDER BY a.timestamp DESC
```

---

### 3. Detail Circular Wallet — Klik 1 Produk

#### Tier 1 SERIAL — TIDAK BERUBAH
- Timeline chronological per event

#### Tier 1 BATCH — TIDAK BERUBAH
- Aggregated journey: "X dari Y item mencapai tahap ini"

#### Tier 2 (BARU — `/detail-barcode/:gtin`)
- Product info dari Open Food Facts
- Tipe: "Barcode Scan"
- **Aggregate stats bar**: total scan per biz_step dari semua TPS

```
  Terkumpul     │██████████████│  500 scan
  Dipilah       │██████████   │  380 scan
  Didaur Ulang  │███████████  │  420 scan
  Dibuang (TPA) │██           │   30 scan
```

**Backend query**:
```sql
SELECT biz_step, SUM(count) as total_scans
FROM sku_aggregates
WHERE gtin = :gtin
GROUP BY biz_step
```

> [!NOTE]
> Tidak ada persentase atau recovery rate. Hanya jumlah scan events absolut.

---

### 4. Dashboard Produsen (Executive Dashboard)

**TIDAK ADA PERUBAHAN**. Semua data berasal dari Tier 1 (`product_instances WHERE brand_id = X`). Tier 2 items punya `brand_id = NULL` sehingga otomatis excluded.

---

### 5. Dashboard Admin TPS

| Widget | Perubahan |
|--------|-----------|
| Info cards (Lokasi, Jangkauan, Tahapan) | ✅ Tetap |
| **Volume Sampah** | 🔄 Include Tier 2 scans × estimated weight |
| **Total Sampah** | 🔄 `COUNT activities + SUM(sku_aggregates.count) WHERE tps_id = X` |
| **Hari ini / Minggu ini** | 🔄 Include Tier 2 scans by date |
| **Tahap Pengelolaan** (pie) | 🔄 Include Tier 2 aggregates per biz_step |
| **Distribusi Kategori** (pie) | 🔄 Include Tier 2 product categories |
| **Produk Terbanyak** (table) | 🔄 Include Tier 2 GTINs in ranking |

---

### 6. Manajemen Akun Petugas

| Card | Perubahan |
|------|-----------|
| **Petugas Aktif** | ✅ Tetap |
| **Petugas Nonaktif** | ❌ **Hapus** |
| **Total Updates** | ✅ Tetap |
| **Total Poin** | ❌ **Hapus** |

→ Sisa 2 stat card: Petugas Aktif + Total Updates

---

## Ringkasan Perubahan

### Database
| Objek | Tipe Perubahan | Detail |
|-------|---------------|--------|
| `sku_aggregates` | **CREATE TABLE** | Scan event counter per GTIN × TPS × biz_step |
| `brand_gtin_prefixes` | **CREATE TABLE** | Registrasi prefix GTIN yang dimiliki produsen |
| `activities.instance_id` | **ALTER** | `DROP NOT NULL` (nullable untuk Tier 2) |
| `activities.aggregate_id` | **ADD COLUMN** | FK ke `sku_aggregates.id` |
| `activities.gtin` | **ADD COLUMN** | GTIN langsung untuk Tier 2 wallet query |
| `products.source` | **ADD COLUMN** | Bedakan produk manual produsen vs auto OFF |
| `products.off_last_synced_at` | **ADD COLUMN** | Jejak sinkronisasi metadata OFF |
| `product_instances.identity_number` | **ADD COLUMN** | Input angka mentah untuk BATCH/SERIAL |
| `activities` constraint | **ADD** | `CHECK (instance_id IS NOT NULL OR gtin IS NOT NULL)` |
| Prefix/product triggers | **ADD** | Validasi GTIN prefix milik produsen + derivasi identitas instance |
| 3+ indexes | **CREATE INDEX** | Performance indexes untuk Tier 2 & prefix lookup |

### Halaman yang PERLU update:
| Halaman | Perubahan |
|---------|-----------|
| **Landing Page** | Teks "blockchain"→"hash-chain", "Reward"→"Transparansi", TPS directory include Tier 2 |
| **Konsumen Wallet** | Dual card, Conversion Rate Tier 1 only |
| **Detail Wallet** | View baru `/detail-barcode/:gtin` |
| **Dashboard TPS** | Stats include Tier 2 counts |
| **Manajemen Petugas** | Hapus "Inactive" dan "Points" card |

### Halaman yang TIDAK berubah:
- ✅ Dashboard Produsen
- ✅ Detail Sampah (Tier 1 Serial + Batch)

---

## Urutan Eksekusi

### Phase 1 — Database & Backend Core
1. DB migration (run SQL script above)
2. `openfoodfacts.service.ts` (NEW)
3. `product.service.ts` — `resolveOrCreateFromBarcode()` + validasi `brand_gtin_prefixes` saat create manual product
4. `instances.service.ts` — hash-chain upgrade + `recordAggregateScan()` + `recordBarcodeDiscard()` + format identitas dari `identity_number`
5. `konsumen.service.ts` (backend) — update `getMyCollections` + new `getGtinAggregateStats` + recent aggregate activities
6. Controllers + routes (new endpoints untuk scan/update/detail gtin)

### Phase 2 — Backend Stats
7. `public.service.ts` (backend) — TPS directory include Tier 2
8. `tps.service.ts` (backend) — dashboard stats include Tier 2

### Phase 3 — Frontend
9. Frontend services — new API functions
10. `PetugasScan.tsx` — dual-mode (GS1 vs EAN-13)
11. `KonsumenScan.tsx` — dual-mode
12. `Dashboard.tsx` — dual card + updated stats
13. `DetailBarcode.tsx` (NEW) — Tier 2 aggregate view
14. `Homepage.tsx` — text fixes
15. Manajemen Petugas — remove Inactive + Points

### Phase 4 — Docs
16. `context.md` — update schema, endpoints, AI notes

## Verification Plan

1. **Hash-chain**: 3 activities → hash ke-2 contains hash ke-1
2. **OFF resolve**: barcode Aqua → product data returned
3. **Petugas aggregate scan**: same GTIN 3× → `sku_aggregates.count = 3`
4. **Konsumen barcode discard**: masuk wallet sebagai Tier 2 card
5. **Wallet dual-view**: Tier 1 → timeline, Tier 2 → aggregate stats
6. **Prefix enforcement**: create product dengan GTIN yang prefix-nya tidak dimiliki brand -> rejected
7. **Instance identity input**: input `12345` + type `BATCH` -> tersimpan sebagai `BATCH-12345`
8. **Conversion rate**: calculated from Tier 1 only
9. **TPS dashboard**: stats include Tier 2 counts
10. **Landing page**: no "Reward", no "blockchain"
11. **Petugas management**: no "Inactive", no "Points"
12. **Build**: `npm run build` both frontend + backend pass