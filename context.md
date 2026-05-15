# SampahKu — AI Context Document

> Dokumen ini merupakan referensi teknis utama untuk prompting AI dalam pengembangan proyek **SampahKu**. Baca seluruh dokumen ini sebelum menghasilkan kode apapun.

---

## 1. Gambaran Proyek

**SampahKu** adalah sistem pelacakan sampah berbasis identitas digital unik yang dirancang untuk hackathon. Tujuannya adalah menciptakan transparansi perjalanan sampah secara *end-to-end* di Indonesia, menghubungkan seluruh aktor dalam ekosistem pengelolaan sampah (konsumen, petugas, brand/produsen).

### Problem yang Diselesaikan
- ~75% sampah Indonesia belum terkelola dengan baik
- Sistem pencatatan manual yang sulit diverifikasi
- Kurangnya transparansi data untuk regulasi seperti ESPR dan EPR (Extended Producer Responsibility)
- Tidak adanya sistem pelacakan terintegrasi yang mendukung Digital Product Passport (DPP)

### Proposisi Nilai Utama
- **Transparansi end-to-end**: Setiap produk dapat dilacak dari konsumen hingga akhir daur ulang
- **Data terverifikasi**: Integritas data dijamin via hash-chain (SHA-256) dengan opsi anchoring ke blockchain (Hyperledger Fabric) untuk audit eksternal
- **Standar global**: Menggunakan GS1 Digital Link (GTIN), EPCIS 2.0, dan JSON-LD
- **TPS-centric**: Sistem tidak bergantung pada partisipasi konsumen — petugas TPS sebagai aktor utama pencatatan data

---

## 2. Aktor & Role Pengguna

| Role | Nilai di DB | Deskripsi | Aksi Utama |
|---|---|---|---|
| **KONSUMEN** | `KONSUMEN` | Pengguna akhir (opsional scan) | Scan QR produk (opsional), lihat transparansi perjalanan sampah |
| **ADMIN_TPS** | `ADMIN_TPS` | Kepala TPS / pengelola fasilitas | Daftar TPS resmi, buat akun petugas, monitor performa TPS |
| **PETUGAS** | `PETUGAS` | Petugas lapangan terikat 1 TPS | Scan QR sampah, update status — terbatas pada `allowed_actions` TPS-nya |
| **BRAND** | `BRAND` | Produsen/perusahaan pemilik produk | Daftarkan produk (GTIN), pantau daur ulang produk mereka, lihat data kepatuhan |

> **Penting**: `profiles.id` adalah UUID yang sama dengan `auth.users.id` dari Supabase Auth. Tabel `profiles` adalah ekstensi dari tabel auth bawaan Supabase.

> **Catatan TPS-Centric**: Sistem **tidak bergantung pada konsumen**. Jika konsumen tidak scan, petugas tetap bisa langsung memindai produk. Petugas hanya bisa dibuat oleh ADMIN_TPS dan terikat ke 1 TPS. Setiap scan petugas divalidasi secara geo-fencing (harus di dalam radius TPS).

> **Catatan Reward**: Sistem poin/reward sudah **DIHAPUS TOTAL**. Tidak ada tabel `point_history`, tidak ada kolom `profiles.points`. Value ke konsumen = transparansi. Value ke TPS = akses data dan dana EPR.

---

## 3. Tech Stack

### Backend
| Layer | Teknologi | Versi | Detail |
|---|---|---|---|
| Runtime | Node.js | LTS | - |
| Framework | Express.js | ^5.2.1 | REST API |
| Language | TypeScript | ^6.0.3 | Keseluruhan backend |
| Database Client | `@supabase/supabase-js` | ^2.105.1 | Koneksi ke Supabase |
| QR Generation | `qrcode` | ^1.5.x | Generate QR code dari GS1 Digital Link URL |
| Dev Server | `ts-node-dev` | ^2.0.0 | Hot-reload development |

**Entry point**: `backend/src/server.ts`
**Port default**: `5000`
**Supabase auth di backend**: Menggunakan **Service Role Key** (`SUPABASE_SERVICE_KEY`) untuk akses penuh (bypass RLS)

### Frontend
| Layer | Teknologi | Versi | Detail |
|---|---|---|---|
| Framework | React | ^19.2.5 | SPA |
| Language | TypeScript | ^4.9.5 | - |
| Build Tool | Create React App (react-scripts 5.0.1) | - | - |
| Styling | CSS Modules / Vanilla CSS | - | File ada di `frontend/src/styles/` |

**Port default**: `3000`
**Entry point**: `frontend/src/index.tsx` → `frontend/src/App.tsx`

### Database & Auth
| Komponen | Teknologi |
|---|---|
| Database | **Supabase** (PostgreSQL) |
| Auth | **Supabase Auth** (`auth.users`) |
| Storage | Supabase Storage (untuk `evidence_url` di activities). Frontend via API `/upload`. |
| Data Integrity | Hash-chain SHA-256 (setiap event di-hash dan dicatat di `activities.blockchain_hash`). Hyperledger Fabric diposisikan sebagai **lapisan anchoring opsional** — anchor hash periodik (batch harian) ke blockchain untuk audit eksternal, bukan per-transaksi. |

### Environment Variables

**Backend** (`.env` di `backend/`):
```env
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_KEY=<service_role_key>
PORT=5000
```

> Gunakan **Service Role Key** di backend, bukan Anon Key, karena backend perlu bypass Row Level Security (RLS).

---

## 4. Struktur Direktori

```
SampahKu_gugugaga/
├── context.md              ← Dokumen ini
├── README.md               ← Panduan setup & struktur folder
├── backend/
│   ├── .env                ← Environment variables (JANGAN commit!)
│   ├── .env.example        ← Template env
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── server.ts       ← Entry point, inisialisasi Express + listen port
│       ├── app.ts          ← Setup app (middleware, routing) — dipisah dari server
│       ├── config/
│       │   └── supabase.ts ← Singleton Supabase client (Service Role)
│       ├── constants.ts    ← ROLES enum, POINTS config
│       ├── controllers/
│       │   ├── auth.controller.ts       ← Register, login, getMe (dengan try/catch)
│       │   ├── instances.controller.ts  ← Scan instance (biz_step tracking)
│       │   ├── konsumen.controller.ts   ← getMyCollections, getInstanceActivities ✅
│       │   └── product.controller.ts   ← CRUD produk & instances, QR (BRAND only) ✅
│       ├── routes/
│       │   ├── auth.ts
│       │   ├── instances.ts    ← POST /:id/scan, GET /:id/activities ✅
│       │   ├── products.ts     ← /products/* endpoints ✅
│       │   └── users.ts        ← GET /users/me/collections ✅
│       ├── services/
│       │   ├── auth.service.ts      ← Register & Login via Ephemeral Client + profiles upsert ✅
│       │   ├── instances.service.ts ← recordScan (hash SHA-256 + activity + points) ✅
│       │   ├── konsumen.service.ts  ← getMyCollections, getInstanceActivities ✅
│       │   ├── points.service.ts
│       │   └── product.service.ts  ← createProduct, createInstance+QR, getProducts+stats ✅
│       ├── middlewares/
│       │   └── auth.middleware.ts   ← protect (JWT verify + profile fetch w/ user_metadata fallback) ✅
│       └── types/
│           └── express.d.ts         ← req.user, req.profile type extensions
└── frontend/
    ├── package.json
    ├── tsconfig.json
    └── src/
        ├── App.tsx         ← Root component, routing dengan ProtectedRoute (OCP-compliant) ✅
        ├── config.ts       ← Centralized API_URL (gunakan REACT_APP_API_URL env var) ✅
        ├── index.tsx       ← ReactDOM render
        ├── index.css       ← Global styles (CSS variables: --primary, --secondary, dll)
        ├── components/
        │   └── Header.tsx  ← Navbar universal (hamburger menu per role) ✅
        ├── constants/
        │   ├── roles.ts    ← ROLES const + UserRole type ✅
        │   └── routes.ts   ← ROLE_HOME_ROUTES + getHomeRouteByRole() ✅
        ├── pages/
        │   ├── Login.tsx               ← Login form (tabs role visual-only) ✅
        │   ├── Register.tsx            ← Register form (pilih role: KONSUMEN/PETUGAS/BRAND) ✅
        │   ├── Dashboard.tsx           ← Dashboard KONSUMEN (Circular Wallet) ✅
        │   ├── KonsumenScan.tsx        ← Scan QR & konfirmasi buang sampah ✅
        │   ├── DetailSampah.tsx        ← Timeline perjalanan sampah real-time ✅
        │   ├── PetugasScan.tsx         ← Scan & update status (PETUGAS) ✅
        │   ├── PetugasDashboard.tsx    ← Dashboard PETUGAS ✅
        │   ├── ProductManagement.tsx   ← CRUD produk & QR (BRAND) ✅
        │   ├── Dashboard_Company.tsx   ← Dashboard BRAND ✅
        │   ├── Homepage.tsx            ← Landing page ✅
        │   └── Logout.tsx              ← Konfirmasi logout ✅
        ├── hooks/          ← Custom React hooks (useAuth, dll) — belum diimplementasi
        ├── services/
        │   ├── auth.service.ts     ← login(), register(), logout(), getMe() ✅
        │   ├── konsumen.service.ts ← getMyCollections(), getInstanceActivities(),
        │   │                          discardInstance(), resolveGS1Link() ✅
        │   ├── petugas.service.ts  ← getPetugasDashboard(), resolveGS1Link(),
        │   │                          uploadEvidence(), scanInstance() ✅
        │   └── product.service.ts  ← getProducts(), createProduct(), createInstance(),
        │                              getInstanceQR(), getProductDetail() ✅
        ├── styles/         ← CSS Modules per halaman/komponen
        └── utils/          ← Helper functions — belum diimplementasi
```

---

## 5. Skema Database (Supabase/PostgreSQL)

### Diagram Relasi
```
auth.users (Supabase built-in)
    │
    └──► profiles (id FK → auth.users.id)
              │
              ├──► tps_facilities (admin_id FK → profiles.id) [role: ADMIN_TPS]
              │         │
              │         └──► profiles.tps_id FK → tps_facilities.id [role: PETUGAS]
              │
              ├──► products (brand_id FK → profiles.id) [role: BRAND]
              │         │
              │         └──► product_instances (product_id FK → products.id)
              │                     │
              │                     └──► activities (instance_id FK)
              │
              └──► activities (actor_id FK → profiles.id) [role: PETUGAS/KONSUMEN]
```

### Tabel Detail

#### `profiles`
Ekstensi dari `auth.users`. Dibuat saat user register; backend melakukan insert/`upsert` eksplisit.
```sql
id           uuid PK → auth.users.id
email        text UNIQUE NOT NULL
name         text NOT NULL
role         text CHECK (role IN ('KONSUMEN', 'PETUGAS', 'ADMIN_TPS', 'BRAND'))
tps_id       uuid FK → tps_facilities.id  -- (Hanya PETUGAS) TPS tempat petugas bertugas
gtin_prefix  text                         -- (Hanya BRAND) Prefix GTIN untuk generate kode produk
created_at   timestamptz
```

> **⚠️ DIHAPUS**: Kolom `points` sudah dihapus. Tabel `point_history` dan `user_collections` sudah di-DROP.

#### `tps_facilities`
Data TPS resmi yang terdaftar di platform. Didaftarkan oleh ADMIN_TPS.
```sql
id                    uuid PK
name                  text NOT NULL               -- Nama TPS, misal "TPS3R Kelurahan Menteng"
type                  text NOT NULL               -- Tipe: TPS, TPS3R, BANK_SAMPAH, TPST, TPA, PENGEPUL, RECYCLER
address               text NOT NULL               -- Alamat jalan (tanpa kota/provinsi)
city                  text                        -- Kota, misal "Jakarta Selatan"
province              text                        -- Provinsi, misal "DKI Jakarta"
coordinates           jsonb NOT NULL              -- GeoJSON Point: { "type": "Point", "coordinates": [lng, lat] }
radius_m              integer NOT NULL DEFAULT 200 -- Radius geofence (meter)
capacity_tons_per_day numeric DEFAULT 0           -- Kapasitas pengolahan (ton/hari)
allowed_actions       text[] NOT NULL DEFAULT '{}' -- biz_step yang boleh dilakukan petugas TPS ini
admin_id              uuid NOT NULL FK → profiles.id  -- ADMIN_TPS yang mengelola (1:1)
created_at            timestamptz
```

**Relasi**: 1 ADMIN_TPS : 1 TPS. 1 TPS : banyak PETUGAS (via `profiles.tps_id`).

**Geo-verification**: Saat petugas scan, backend menghitung jarak Haversine antara GPS petugas dan `coordinates` TPS. Jika jarak > `radius_m`, scan **ditolak**.

**Contoh `allowed_actions` per tipe TPS**:
| Tipe | allowed_actions |
|------|----------------|
| TPS | `['collecting', 'receiving']` |
| TPS3R | `['collecting', 'receiving', 'inspecting', 'shipping']` |
| Bank Sampah | `['receiving', 'inspecting', 'recycling']` |
| TPA | `['receiving', 'disposing']` |
| Recycler | `['receiving', 'inspecting', 'recycling']` |

#### `products`
Katalog produk dari dua sumber: didaftarkan BRAND atau auto-resolve Open Food Facts (OFF).
```sql
id               uuid PK
gtin             varchar UNIQUE
sku              varchar
brand_id         uuid FK → profiles.id
source           text CHECK (source IN ('BRAND_MANUAL', 'OFF_AUTO'))
product_name     text NOT NULL
material_passport jsonb NOT NULL
category         text
weight_grams     integer
off_last_synced_at timestamptz
created_at       timestamptz
```

**Aturan penting `products`:**
- `source='BRAND_MANUAL'`: produk manual brand, wajib valid prefix GTIN.
- `source='OFF_AUTO'`: hasil resolve Open Food Facts, `brand_id` harus `NULL`.

#### `brand_gtin_prefixes` (BARU)
Registrasi kepemilikan prefix GTIN per produsen.
```sql
id           uuid PK
brand_id     uuid FK → profiles.id
prefix       varchar NOT NULL   -- contoh: 8992753
is_active    boolean DEFAULT true
verified_at  timestamptz
created_at   timestamptz
```

#### `product_instances`
Representasi fisik dari sebuah produk (satu unit atau satu batch).
```sql
id                  uuid PK
product_id          uuid FK → products.id
identification_type text CHECK IN ('BATCH', 'UNIQUE')
identity_number     bigint
batch_number        text
serial_number       text
current_status      text DEFAULT 'IN_MARKET'
last_updated        timestamptz
```

**Normalisasi identitas instance:**
- Input dari UI cukup angka pada `identity_number`.
- Trigger DB auto-generate `BATCH-{identity_number}` atau `SERIAL-{identity_number}`.
- User tidak perlu mengetik prefix `BATCH-`/`SERIAL-` manual.

**Status lifecycle `current_status`** — biz_step bisa melompat (tidak harus linear):

```
IN_MARKET
    │
    ├──► [Jalur A: Konsumen scan dulu]
    │       │
    │       ▼
    │   DISCARDED (konsumen scan opsional)
    │       │
    │       ▼
    ├──► PICKED_UP → AT_TPS → SORTED → IN_TRANSIT → AT_FACILITY → RECYCLED/DISPOSED
    │
    ├──► [Jalur B: Petugas langsung scan]
    │       │
    │       ▼
    │   PICKED_UP → ... (tanpa DISCARDED)
    │
    └──► [Jalur C: Langsung Bank Sampah]
            │
            ▼
        AT_FACILITY → RECYCLED
```

#### `activities`
Inti sistem: setiap event dalam perjalanan sampah. Mengikuti standar **EPCIS 2.0**.
```sql
id              uuid PK
instance_id     uuid FK → product_instances.id  -- nullable untuk Tier 2
aggregate_id    uuid FK → sku_aggregates.id
gtin            varchar FK → products.gtin
actor_id        uuid FK → profiles.id
tps_id          uuid FK → tps_facilities.id  -- TPS tempat aktivitas terjadi (NULL untuk konsumen/brand)
event_type      text DEFAULT 'ObjectEvent'
biz_step        text
location_name   text
facility_type   text CHECK (facility_type IN ('RUMAH', 'TPS', 'BANK_SAMPAH', 'PENGEPUL', 'TPA', 'RECYCLER'))
coordinates     jsonb  -- { "lat": -6.200, "lng": 106.816 }
epcis_body      jsonb
timestamp       timestamptz DEFAULT now()
blockchain_hash text   -- SHA-256 integrity hash (bukan blockchain per-transaksi)
evidence_url    text
```

**Tier constraint `activities`:**
- Tier 1: `instance_id` terisi, `aggregate_id` dan `gtin` harus `NULL`.
- Tier 2: `instance_id` harus `NULL`, `aggregate_id` dan `gtin` wajib terisi.

#### `sku_aggregates` (BARU)
Counter scan event untuk produk unregistered/Tier 2.
```sql
id              uuid PK
gtin            varchar NOT NULL
product_id      uuid FK → products.id
tps_id          uuid FK → tps_facilities.id
biz_step        text NOT NULL
count           integer NOT NULL DEFAULT 1
last_scanned_at timestamptz
created_at      timestamptz
UNIQUE (gtin, tps_id, biz_step)
```

> **Catatan**: `count` adalah jumlah scan event, bukan jumlah unit unik. Tidak bisa dipakai untuk recovery rate.

> **Catatan `tps_id`**: Kolom ini diisi otomatis oleh backend saat PETUGAS scan (dari `profiles.tps_id`). Memungkinkan query agregasi TPS stats secara langsung tanpa join 3 tabel.

**Nilai `biz_step`** — dipetakan ke status lifecycle:
| biz_step | Status Baru | Aktor | Deskripsi |
|---|---|---|---|
| `commissioning` | `IN_MARKET` | BRAND | Produk didaftarkan |
| `discarding` | `DISCARDED` | KONSUMEN | Konsumen scan & konfirmasi buang (opsional) |
| `collecting` | `PICKED_UP` | PETUGAS | Petugas ambil sampah |
| `receiving` | `AT_TPS` / `AT_FACILITY` | PETUGAS | Sampah diterima (konteks dari facility_type) |
| `inspecting` | `SORTED` | PETUGAS | Sortir & pemilahan |
| `shipping` | `IN_TRANSIT` | PETUGAS | Dikirim ke fasilitas |
| `recycling` | `RECYCLED` | PETUGAS | Daur ulang selesai |
| `disposing` | `DISPOSED` | PETUGAS | Masuk landfill |

> **Validasi Petugas**: Backend HARUS cek bahwa `biz_step` ada di `allowed_actions` TPS petugas sebelum menerima scan. Juga HARUS cek geo-fence.

#### Tabel yang DIHAPUS
- ~~`point_history`~~ — sistem poin dihapus total
- ~~`user_collections`~~ — redundan, data dari `activities` (biz_step='discarding')
- ~~`hackathon_test`~~ — tidak digunakan

#### Trigger (DIHAPUS)
```
-- ⚠️ TRIGGER `on_auth_user_created` SUDAH DIHAPUS. JANGAN buat ulang.
-- Backend menangani pembuatan profil secara eksplisit via admin.createUser() + profiles.upsert()
```

---

## 6. Alur Utama Sistem

### Alur A: Konsumen Scan & Buang Sampah
```
1. Konsumen scan QR (Tier 1) ATAU barcode GTIN biasa (Tier 2)
2. Tier 1: resolve instance dari GS1 Digital Link
3. Tier 2: resolve product dari tabel products; jika belum ada, fetch Open Food Facts lalu auto-create product (`source='OFF_AUTO'`)
4. Konsumen konfirmasi buang sampah
5. Backend simpan activity:
   a. Tier 1: INSERT activities { instance_id, biz_step='discarding' }
   b. Tier 2: INSERT activities { gtin, aggregate_id, biz_step='discarding' }
6. Tier 1 update `product_instances.current_status='DISCARDED'`
7. Dashboard wallet menampilkan:
   - Tier 1: timeline instance personal
   - Tier 2: statistik agregat produk (collecting/inspecting/recycling/discarding)
```

### Alur B: Petugas Scan & Update (TPS-Centric)
```
** Validasi setiap scan petugas:
   - Cek role = PETUGAS & tps_id exists
   - Cek biz_step ∈ tps.allowed_actions
   - Cek GPS petugas dalam radius tps.coordinates (Haversine)
   - Jika gagal validasi → scan DITOLAK

[Titik scan 1: PICKED_UP]
1. Petugas buka app → Scan QR sampah (status bisa IN_MARKET atau DISCARDED)
2. App ambil GPS → kirim ke backend
3. Backend validasi → INSERT activities + UPDATE current_status

[Selanjutnya: AT_TPS → SORTED → IN_TRANSIT → AT_FACILITY → RECYCLED/DISPOSED]
4. Setiap tahap: scan QR → validasi → update status
   (biz_step bisa melompat sesuai allowed_actions TPS)

[Untuk barcode GTIN unregistered/Tier 2]
5. Petugas scan barcode biasa
6. Backend resolve product by GTIN; jika belum ada, fetch Open Food Facts lalu simpan sebagai `source='OFF_AUTO'`
7. Backend UPSERT ke `sku_aggregates` pada kombinasi (gtin, tps_id, biz_step) dengan `count + 1`
8. Backend INSERT `activities` Tier 2 (`instance_id=NULL`, `aggregate_id`, `gtin`)
```

### Alur C: Brand Daftarkan Produk
```
1. Brand login → Web dashboard brand
2. Isi form: product_name, GTIN, category, weight_grams, material_passport
3. Backend validasi GTIN harus match prefix aktif milik brand di `brand_gtin_prefixes`
4. Backend INSERT ke products table dengan `source='BRAND_MANUAL'`
5. Brand generate product_instances (BATCH/UNIQUE) dengan input angka `identity_number`
6. Trigger DB membentuk label final: `BATCH-{identity_number}` atau `SERIAL-{identity_number}`
7. Brand download QR → cetak di kemasan produk
```

### Alur D: TPS Registration (BARU)
```
1. ADMIN_TPS register via /register (role=ADMIN_TPS)
2. ADMIN_TPS login → Dashboard Admin TPS
3. Isi form "Daftarkan TPS":
   - Nama, tipe, alamat, koordinat (GeoJSON Point), radius geofence
   - Pilih allowed_actions (biz_step yang boleh dilakukan petugas)
4. Backend: INSERT tps_facilities
5. ADMIN_TPS buat akun petugas:
   - Isi nama, email, password
   - Backend: admin.createUser(role=PETUGAS) + SET profiles.tps_id
6. Petugas login → bisa scan sesuai allowed_actions TPS-nya
```

---

## 7. Format QR Code (GS1 Digital Link)

QR code yang digunakan mengikuti standar **GS1 Digital Link**:

```
Format URL: https://sampahku.id/01/{GTIN}/21/{serial_number}
Contoh:     https://sampahku.id/01/08999999123456/21/SN-001
            
Untuk BATCH: https://sampahku.id/01/{GTIN}/10/{batch_number}
Contoh:      https://sampahku.id/01/08999999123456/10/BATCH-2026-001
```

- `01` = AI (Application Identifier) untuk GTIN
- `21` = AI untuk Serial Number (identifikasi UNIQUE)
- `10` = AI untuk Batch Number (identifikasi BATCH)

Ketika QR di-scan, sistem resolve URL → lookup `product_instances` berdasarkan GTIN + serial/batch.

---

## 8. Konvensi Kode

### Backend (TypeScript / Express)
- **Pattern**: `routes/` → `controllers/` → `services/` → `supabase client`
- Controllers **hanya** menangani `req`/`res`, tidak ada business logic
- Services mengandung semua query Supabase dan kalkulasi
- Naming: `camelCase` untuk fungsi/variabel, `PascalCase` untuk types/interfaces
- File naming: `[domain].[layer].ts` → `product.service.ts`, `activity.controller.ts`
- Selalu gunakan `async/await`, bukan `.then()`
- Error response format:
  ```json
  { "status": "error", "message": "Pesan error", "code": "ERROR_CODE" }
  ```
- Success response format:
  ```json
  { "status": "success", "data": { ... } }
  ```

### Frontend (React / TypeScript)
- **Pattern**: `pages/` menggunakan komponen dari `components/`, memanggil `services/`, menggunakan `hooks/`
- Semua API calls **harus** melalui `services/` (jangan fetch langsung di komponen/halaman)
- **Constants**: gunakan `src/constants/roles.ts` (`ROLES`, `UserRole`) dan `src/constants/routes.ts` (`getHomeRouteByRole()`) — **jangan hardcode** string role seperti `'KONSUMEN'`, `'PETUGAS'`, `'BRAND'` atau path redirect di komponen
- **Config**: URL API diambil dari `src/config.ts` (`API_URL`) — **tidak boleh** ada `http://localhost:5000` hardcoded di service atau halaman manapun
- Custom hooks untuk logic yang dipakai di banyak tempat (`useAuth`, `useQRScanner`, dll)
- File naming: `PascalCase` untuk komponen (`.tsx`), `camelCase` untuk hooks/services (`.ts`)
- Styling: CSS Modules (`.module.css`) di folder `styles/`

### Supabase Client
- **Backend**: gunakan `SUPABASE_SERVICE_KEY` (Service Role) → bypass semua RLS
- **Frontend**: Frontend **SEPENUHNYA TERPISAH** dari Supabase. Tidak ada instalasi `@supabase/supabase-js` di frontend. Semua interaksi database dan autentikasi (termasuk generate URL Google OAuth) dilakukan melalui panggilan REST API ke backend.

---

## 9. API Endpoint Plan

Base URL: `http://localhost:5000` (dev)

### Auth ✅ IMPLEMENTED
| Method | Endpoint | Deskripsi | Role | Status |
|---|---|---|---|---|
| POST | `/auth/register` | Register user baru (KONSUMEN/ADMIN_TPS/BRAND) | Public | ✅ |
| POST | `/auth/login` | Login & dapat JWT | Public | ✅ |
| GET | `/auth/me` | Get profil user terautentikasi | All | ✅ |
| GET | `/auth/google` | Generate URL Supabase OAuth | Public | ✅ |

### TPS Management (BARU)
| Method | Endpoint | Deskripsi | Role | Status |
|---|---|---|---|---|
| POST | `/tps` | Register TPS baru | ADMIN_TPS | ⬜ TODO |
| GET | `/tps/me` | Get TPS milik admin | ADMIN_TPS | ⬜ TODO |
| POST | `/tps/:id/petugas` | Buat akun petugas terikat TPS | ADMIN_TPS | ⬜ TODO |
| GET | `/tps/:id/petugas` | List petugas di TPS | ADMIN_TPS | ⬜ TODO |

### Products ✅ IMPLEMENTED
| Method | Endpoint | Deskripsi | Role | Status |
|---|---|---|---|---|
| GET | `/products` | List produk milik brand + aggregated stats | BRAND | ✅ |
| GET | `/products/:gtin` | Detail produk + semua instances + stats | BRAND | ✅ |
| POST | `/products` | Daftarkan produk baru | BRAND | ✅ |
| POST | `/products/:gtin/instances` | Buat instance + generate QR | BRAND | ✅ |
| GET | `/products/instances/:instanceId/qr` | Generate QR code | BRAND | ✅ |

### Instances & Tracking
| Method | Endpoint | Deskripsi | Role | Status |
|---|---|---|---|---|
| GET | `/instances/:id/activities` | Timeline perjalanan instance | All | ✅ |
| POST | `/instances/:id/scan` | Scan & catat aktivitas (+ geo-verification untuk PETUGAS) | KONSUMEN / PETUGAS | ✅ |
| POST | `/instances/scan-barcode` | Scan/update untuk GTIN biasa (Tier 2, petugas) | PETUGAS | ⬜ TODO |
| POST | `/instances/discard-barcode` | Simpan discard GTIN ke wallet konsumen (Tier 2) | KONSUMEN | ⬜ TODO |
| GET | `/instances/:gtin/aggregate-stats` | Ambil statistik agregat per biz_step untuk GTIN | All | ⬜ TODO |

### Uploads
| Method | Endpoint | Deskripsi | Role | Status |
|---|---|---|---|---|
| POST | `/upload/evidence` | Upload foto bukti | PETUGAS / KONSUMEN | ✅ |

### User / Circular Wallet
| Method | Endpoint | Deskripsi | Role | Status |
|---|---|---|---|---|
| GET | `/users/me/collections` | Daftar sampah wallet konsumen (Tier 1 + Tier 2) | KONSUMEN | ✅ |

### Public
| Method | Endpoint | Deskripsi | Role | Status |
|---|---|---|---|---|
| GET | `/dashboard/stats` | Statistik agregat publik | Public | ✅ |
| GET | `/public/tps` | Daftar TPS publik + stats (sortable) | Public | ⬜ TODO |
| GET | `/products/resolve` | Resolve GS1 Digital Link → instance | Public | ✅ |
| GET | `/products/resolve-barcode` | Resolve GTIN via DB/OFF (tanpa instance) | Public | ⬜ TODO |

---

## 10. Desain UI/UX

Dari mockup yang tersedia, berikut adalah catatan desain:

### Palet Warna
- **Primary**: Hijau natural (≈ `#4CAF50` / emerald green variants)
- **Secondary**: Oranye/amber (≈ `#FF9800`) untuk aksen & CTA
- **Background**: Cream/off-white (≈ `#F5F5DC` atau `#FAFAF5`)
- **Text utama**: Dark green / charcoal (`#1B2A1B`)
- **Success/Recycled**: Hijau tua
- **Warning**: Oranye
- **Error**: Merah

### Halaman Utama (dari mockup)
**Konsumen (Mobile-first)**:
1. **Landing / Home** — Ilustrasi alam, tagline, CTA "Mulai Scan"
2. **Login / Register** — Form sederhana, pilih role ✅
3. **Scan QR** — Kamera scanner + form konfirmasi
4. **Detail Produk** — Info produk + timeline perjalanan sampah
5. **Dashboard Konsumen** — Circular Wallet (Tier 1 timeline + Tier 2 aggregate view)
6. **Detail Barcode** — Persebaran aktivitas produk per tahap (scan events)

**Petugas**:
1. **Dashboard Petugas** — List sampah yang perlu diproses
2. **Scan & Update** — Scan QR, pilih status baru, upload foto bukti ✅ **IMPLEMENTED** (`/scan`)
   - Mendukung scan lewat kamera (html5-qrcode) atau upload file gambar
   - Form dinamis sesuai `biz_step` (termasuk jenis material untuk `inspecting`)
3. **Riwayat Aktivitas** — History update yang dilakukan

**Brand (Web Dashboard)**:
1. **Dashboard Brand** — Statistik produk terdaftar, recovery rate
2. **Manajemen Produk** — CRUD produk + generate QR ✅ **IMPLEMENTED** (`/products`)
   - Tabel produk: nama, GTIN, kategori, total instances, recovery rate (% recycled), status breakdown (progress bar)
   - Modal "Tambah Produk Baru": form popup dengan input nama, GTIN, kategori (select), berat
   - Modal "Buat Instance Baru": toggle BATCH/UNIQUE, input identifier, live GS1 Digital Link preview
   - Modal QR Display: tampilkan QR code hasil generate, GS1 URL, tombol download PNG
   - Detail expandable: klik "Detail" pada baris produk → tampilkan grid instance cards dengan status badge & tombol QR per-instance
3. **Tracking Report** — Per-produk journey analytics

**Publik (Web)**:
1. **Public Dashboard** — Visualisasi agregat: total sampah terlacak, distribusi per kategori, peta sebaran

> **Catatan Implementasi**:
> 1. ~~Form pilihan `station_type` saat register khusus untuk Petugas~~ → **Dihapus**. Field `station_type` tidak ada di schema `profiles`.
> 2. Flow "Jalur B" (Konsumen setor langsung ke Bank Sampah tanpa lewat TPS) — belum diimplementasi di UI.
> 3. ~~Form input "Jenis Material" saat petugas melakukan proses SORTED/inspecting~~ → **Sudah diimplementasi** di `PetugasScan.tsx`.
> 4. Mode "Bulk Scan" untuk petugas agar bisa scan banyak item sekaligus tanpa delay — belum diimplementasi.
> 5. Halaman timeline end-to-end yang bisa dilihat publik — belum diimplementasi.

---

## 11. Standar & Regulasi yang Digunakan

| Standar | Penggunaan dalam Sistem |
|---|---|
| **GS1 Digital Link** | Format QR code menggunakan GTIN sebagai identifier global produk |
| **GTIN** (Global Trade Item Number) | Primary key untuk produk (`products.gtin`) |
| **EPCIS 2.0** | Format pencatatan event lifecycle sampah (`activities.epcis_body`) |
| **JSON-LD** | Format `material_passport` agar kompatibel dengan DPP (Digital Product Passport) |
| **Digital Product Passport (DPP)** | Target kompatibilitas untuk `material_passport` |
| **EPR** (Extended Producer Responsibility) | Justifikasi business case untuk brand/produsen |
| **ESPR** (Ecodesign for Sustainable Products Regulation) | Regulasi EU yang mendorong adopsi DPP |
| **Hash-chain + Hyperledger Fabric** | Integritas data via SHA-256 hash-chain per-event. Hyperledger Fabric sebagai lapisan anchoring opsional (batch periodik) untuk kebutuhan audit eksternal dan compliance — **bukan** per-transaksi |

---

## 12. Hal Penting untuk AI

1. **Jangan pernah** gunakan Supabase Anon Key di backend — selalu Service Role Key.
2. **Selalu** ikuti konvensi folder: controllers tipis, logic di services.
3. **Status lifecycle** `current_status` harus selalu diupdate di `product_instances` setiap ada aktivitas baru.
4. **Poin DIHAPUS** — sistem poin sudah dihapus total. Tidak ada `point_history`, tidak ada `profiles.points`.
5. **`epcis_body`** adalah JSONB — simpan full EPCIS 2.0 event payload, bukan ringkasan.
6. **QR code** mewakili `product_instances`, bukan `products`. Satu GTIN bisa punya banyak instances.
7. **`blockchain_hash`** di `activities` diisi otomatis oleh backend dengan *hash* SHA-256 (`crypto`) dari *payload* aktivitas. Ini adalah implementasi **hash-chain** — setiap hash menjadi bukti integritas (tamper-evidence). Hyperledger Fabric diposisikan sebagai lapisan anchoring opsional untuk audit eksternal, **bukan** blockchain per-transaksi.
8. **`evidence_url`** adalah URL file di Supabase Storage — di-*upload* langsung dari frontend ke bucket `evidences`.
9. Frontend menggunakan **React 19** dan **TypeScript 4.9** — perhatikan compatibility.
10. Backend menggunakan **Express 5** — syntax beberapa hal berbeda dari Express 4 (misal: async error handling otomatis, tidak perlu `next(err)` manual di async routes). **Perhatikan**: `req.params` di Express 5 bertipe `string | string[]`, perlu cast ke `string` saat pass ke function.
11. **Lifecycle** tidak harus linear — sistem harus memfasilitasi "Jalur A" (via TPS) dan "Jalur B" (langsung Bank Sampah). Petugas hanya bisa update status sesuai dengan otoritas role-nya.
12. **Sistem poin DIHAPUS** — tidak ada reward/poin untuk konsumen maupun petugas. Scan petugas adalah bagian dari SOP kerja, bukan aktivitas sukarela berbasis insentif.
13. Alur nyata Indonesia: **Gerobak RT → TPS → Truk DLH → Bank Sampah/TPA** — setiap perpindahan adalah 1 scan point petugas.
14. **`biz_step: 'discarding'`** digunakan oleh KONSUMEN, sedangkan `biz_step: 'disposing'` digunakan oleh PETUGAS (untuk landfill akhir). Jangan sampai tertukar.
15. **Explicit profiles insert** — backend menggunakan `admin.createUser()` (bypass DB trigger) lalu `profiles.upsert()` secara eksplisit. **JANGAN** buat DB trigger `on_auth_user_created` — sudah dihapus karena menyebabkan error. **JANGAN** pernah INSERT langsung ke `auth.users` via raw SQL — Supabase GoTrue membutuhkan `instance_id` dan metadata internal yang hanya di-set benar oleh Admin API. Seeding user harus selalu via `admin.createUser()` (lihat `backend/fix_users.ts`).
16. **Enumerasi role** — gunakan enum/konstanta `['KONSUMEN','PETUGAS','BRAND']` di backend untuk validasi input.
17. **Server-side checks** — semua endpoint yang mengubah `product_instances.current_status` harus melakukan validasi role sebelum update (mis. hanya `PETUGAS` yang boleh menandai `RECYCLED`).
18. **Auth controller error handling** — semua controller methods HARUS di-wrap dalam `try/catch` dan return proper JSON error response. Jangan biarkan error propagate unhandled.
19. **QR Code generation** — menggunakan library `qrcode` (npm). Output berupa base64 data URL PNG. QR encode GS1 Digital Link URL (`https://sampahku.id/01/{GTIN}/21/{serial}` atau `/10/{batch}`).
20. **Product stats aggregation** — `GET /products` mengembalikan stats per-produk (total instances, recycled count, disposed count, in_progress count, in_market count) yang di-aggregate dari `product_instances.current_status`.
21. **Frontend modal pattern** — form pembuatan produk/instance menggunakan popup modal (overlay + animated card), bukan halaman terpisah. Modal di-close pada klik overlay atau tombol X.
22. **Supabase Auth Session Pollution**: Fungsi `signInWithPassword` dan `signUp` di backend **HARUS** menggunakan instansiasi client Ephemeral (sementara) dengan opsi `persistSession: false`. Hal ini krusial untuk mencegah tercemarnya singleton `supabase` (Service Role) oleh session JWT user biasa, yang menyebabkan RLS tiba-tiba aktif dan menggagalkan query backend lainnya (seperti error *RLS violation* saat BRAND membuat produk).
23. **Uploads Architecture**: Frontend **tidak boleh** berinteraksi langsung dengan Supabase Storage. File dikirim via `FormData` ke backend `/upload/evidence` menggunakan `multer` (memory storage), dan backend yang akan menggunakan Service Role untuk upload ke Supabase Storage, mengembalikan `evidence_url` ke frontend.
24. **Auth Middleware Fallback**: Jika query ke tabel `profiles` gagal, middleware otentikasi akan menggunakan data `user_metadata` dari token JWT sebagai cadangan (fallback), memastikan sistem RBAC (`req.profile.role`) tetap berfungsi bahkan jika ada *delay* sinkronisasi database.
25. **Frontend Supabase Decoupling**: Frontend tidak memuat SDK Supabase. Autentikasi OAuth (Google) dilakukan dengan cara frontend memanggil `GET /auth/google`, lalu backend me-return URL Supabase OAuth, frontend me-redirect pengguna ke URL tersebut, dan Supabase me-redirect kembali ke frontend dengan `#access_token=...` yang kemudian di-parsing secara lokal di frontend.
26. **Circular Wallet Flow**: Konsumen scan → `POST /instances/:id/scan` (biz_step `discarding`) → data tersimpan di `activities`. Dashboard konsumen membaca `GET /users/me/collections` yang melakukan join: `activities` (filter `biz_step='discarding'` & `actor_id=user`) → `product_instances` → `products`. Detail timeline dibaca via `GET /instances/:id/activities`.
27. **`/users/me/collections` Logic**: Harus support dual source:
   - Tier 1: join `activities` → `product_instances` → `products`
   - Tier 2: join `activities` (by `gtin`, `instance_id IS NULL`) → `products`
   Filter tetap `biz_step = 'discarding'` dan `actor_id = konsumen.id`, lalu merge + sort `timestamp DESC`.
28. **`/instances/:id/activities` Logic**: Return dua objek: `instance` (data product_instances + join products + join profiles brand) dan `activities` (semua rows activities untuk instance tersebut, join profiles actor, sorted ASC untuk tampil kronologis).
29. **Frontend Constants Pattern**: Saat membuat fitur baru yang menggunakan nilai role, SELALU import dari `constants/roles.ts`. Saat membutuhkan navigasi berdasarkan role, SELALU gunakan `getHomeRouteByRole()` dari `constants/routes.ts`. Jangan pernah hardcode string role atau path redirect di komponen.
30. **Auth Seeding**: **JANGAN** seed user via raw SQL `INSERT INTO auth.users` — ini menghasilkan record dengan `instance_id = NULL` yang tidak terlihat oleh GoTrue dan menyebabkan error `Database error checking email`. SELALU gunakan `supabase.auth.admin.createUser()` dari script TypeScript (lihat `backend/fix_users.ts`). Untuk cleanup data seeder, hapus dalam urutan FK yang benar: `point_history` → `user_collections` → `activities` → `product_instances` → `products` → `auth.identities` → `profiles` → `auth.users`.
31. **Product Instances Relation**: `product_instances` menggunakan `product_id` sebagai *foreign key* ke `products`. Karena frontend banyak membutuhkan nilai `gtin`, backend (services) HARUS selalu men-*join* tabel `products` dan memetakan `gtin` ke level root object.
32. **GTIN Prefix Enforcement**: Insert/update `products` untuk `source='BRAND_MANUAL'` wajib lolos trigger validasi prefix terhadap `brand_gtin_prefixes`.
33. **OFF Auto Product**: Produk hasil Open Food Facts wajib disimpan `source='OFF_AUTO'`, `brand_id=NULL`, dan timestamp sinkronisasi di `off_last_synced_at`.
34. **Identity Number First**: Endpoint create instance harus menerima `identity_number` numerik sebagai input utama; format `BATCH-`/`SERIAL-` dibentuk di database trigger.
35. **Tier-2 Stats Semantics**: Data `sku_aggregates.count` adalah scan events, bukan unique units; jangan dipakai menghitung recovery rate persentase.

---

*Dokumen ini dibuat pada 2026-04-29. Terakhir diperbarui: 2026-05-15 (Two-tier GTIN/OFF: tambah sku_aggregates, brand_gtin_prefixes, source metadata di products, normalisasi identity_number di product_instances, activities dual-tier identifier).* 
