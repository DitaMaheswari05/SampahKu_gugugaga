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
- **Data terverifikasi**: Integritas data dijamin via blockchain (Hyperledger Fabric, hash-only approach)
- **Standar global**: Menggunakan GS1 Digital Link (GTIN), EPCIS 2.0, dan JSON-LD
- **Insentif berbasis data**: Petugas mendapat reward (poin) untuk setiap pemindaian/update status

---

## 2. Aktor & Role Pengguna

| Role | Nilai di DB | Deskripsi | Aksi Utama |
|---|---|---|---|
| **KONSUMEN** | `KONSUMEN` | Pengguna akhir yang membuang sampah | Scan QR produk, lihat riwayat & kontribusi, kumpulkan poin |
| **PETUGAS** | `PETUGAS` | Pengelola sampah di lapangan (TPS, bank sampah, recycler) | Scan QR sampah, update status pemrosesan, terima reward poin |
| **BRAND** | `BRAND` | Produsen/perusahaan pemilik produk | Daftarkan produk (GTIN), pantau daur ulang produk mereka, lihat data kepatuhan |

> **Penting**: `profiles.id` adalah UUID yang sama dengan `auth.users.id` dari Supabase Auth. Tabel `profiles` adalah ekstensi dari tabel auth bawaan Supabase.

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
| Blockchain | Hyperledger Fabric (hash dicatat di `activities.blockchain_hash` — integrasi eksternal) |

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
              ├──► products (brand_id FK → profiles.id) [role: BRAND]
              │         │
              │         └──► product_instances (product_id FK → products.id)
              │                     │
              │                     ├──► activities (instance_id FK)
              │                     │         │
              │                     │         └──► point_history (activity_id FK)
              │                     │
              │                     └──► user_collections (instance_id FK)
              │
              ├──► activities (actor_id FK → profiles.id) [role: PETUGAS/KONSUMEN]
              ├──► point_history (user_id FK → profiles.id)
              └──► user_collections (user_id FK → profiles.id)
```

### Tabel Detail

#### `profiles`
Ekstensi dari `auth.users`. Dibuat saat user register; backend sekarang melakukan insert/`upsert` eksplisit.
```sql
id           uuid PK → auth.users.id
email        text UNIQUE NOT NULL
name         text NOT NULL
role         text CHECK (role IN ('KONSUMEN', 'PETUGAS', 'BRAND'))
points       integer DEFAULT 0    -- total poin akumulasi
gtin_prefix  varchar(10)          -- (Hanya untuk BRAND) Prefix GS1 perusahaan
created_at   timestamptz
```

#### `products`
Katalog produk yang didaftarkan oleh BRAND.
```sql
id               uuid PK      -- ID produk internal
gtin             varchar UNIQUE -- Global Trade Item Number (gtin_prefix + sku)
sku              varchar      -- Stock Keeping Unit (diinput oleh brand)
brand_id         uuid FK → profiles.id
product_name     text NOT NULL
material_passport jsonb NOT NULL  -- JSON-LD: komposisi material, recycling info, DPP data
category         text             -- kategori produk (plastik, kertas, dll)
weight_grams     integer          -- berat produk dalam gram
created_at       timestamptz
```

**Contoh `material_passport` (JSON-LD / DPP compatible)**:
```json
{
  "@context": "https://schema.org/",
  "@type": "Product",
  "material": [
    { "name": "PET Plastic", "percentage": 80, "recyclable": true },
    { "name": "Label Paper", "percentage": 20, "recyclable": false }
  ],
  "recyclingInstructions": "Cuci bersih, lepas label, buang ke bank sampah plastik",
  "carbonFootprint": "0.5 kg CO2e"
}
```

#### `product_instances`
Representasi fisik dari sebuah produk (satu unit atau satu batch).
```sql
id                  uuid PK
product_id          uuid FK → products.id
identification_type text CHECK IN ('BATCH', 'UNIQUE')
  -- BATCH: satu QR untuk satu batch produksi (banyak unit)
  -- UNIQUE: satu QR per unit fisik
batch_number        text   -- diisi jika BATCH
serial_number       text   -- diisi jika UNIQUE
current_status      text DEFAULT 'IN_MARKET'
last_updated        timestamptz
```

**Status lifecycle `current_status`** — dirancang mengikuti rantai pengelolaan sampah nyata di Indonesia:

```
IN_MARKET
    │  (Konsumen scan & buang)
    ▼
DISCARDED          ← Konsumen scan produk, konfirmasi dibuang
    │
    ├──► [Jalur A: Via Gerobak & TPS]
    │       │
    │       ├──► PICKED_UP   (Petugas gerobak ambil dari rumah)
    │       │       │
    │       ├──► AT_TPS      (Sampah tiba di TPS)
    │       │       │
    │       ├──► SORTED      (Petugas TPS sortir sampah)
    │       │       │
    │       ├──► IN_TRANSIT  (Dimuat ke truk pengangkut)
    │       │       │
    │       └──► AT_FACILITY (Tiba di Bank Sampah / Pengepul / TPA)
    │               │
    │               ├──► RECYCLED
    │               └──► DISPOSED
    │
    └──► [Jalur B: Konsumen Langsung ke Bank Sampah]
            │
            ├──► AT_FACILITY (Bank sampah langsung terima dari konsumen)
            │       │
            └──► RECYCLED
```

| Status | Aktor Scan | Lokasi Scan | Deskripsi |
|---|---|---|---|
| `IN_MARKET` | — | — | Produk beredar di pasaran, belum dibuang |
| `DISCARDED` | KONSUMEN | Rumah / tempat pembuangan | Konsumen scan & konfirmasi produk dibuang |
| `PICKED_UP` | PETUGAS | Gerobak / titik kumpul RT | Petugas gerobak/RT mengambil sampah |
| `AT_TPS` | PETUGAS | TPS (Tempat Penampungan Sementara) | Sampah tiba di TPS |
| `SORTED` | PETUGAS | TPS / Bank Sampah | Sampah sudah disortir berdasarkan jenis |
| `IN_TRANSIT` | PETUGAS | Truk DLH / kendaraan pengangkut | Sampah dimuat & dikirim ke fasilitas akhir |
| `AT_FACILITY` | PETUGAS | Bank Sampah / Pengepul / TPA | Sampah diterima di fasilitas pengolahan akhir |
| `RECYCLED` | PETUGAS | Fasilitas daur ulang | Proses daur ulang selesai |
| `DISPOSED` | PETUGAS | TPA | Sampah masuk landfill (tidak dapat didaur ulang) |

> **Catatan desain**: Sistem **tidak boleh memaksa alur linear yang kaku**. `current_status` hanya menyimpan status terakhir. Backend harus memvalidasi transisi state yang diizinkan (misal: dari `DISCARDED` boleh ke `PICKED_UP` atau langsung `AT_FACILITY`). Di Supabase, akan ada `CHECK` constraint untuk membatasi nilai yang valid.

#### `activities`
Inti sistem: setiap event dalam perjalanan sampah. Mengikuti standar **EPCIS 2.0**.
```sql
id              uuid PK
instance_id     uuid FK → product_instances.id
actor_id        uuid FK → profiles.id  -- siapa yang melakukan aksi ini
event_type      text DEFAULT 'ObjectEvent'  -- EPCIS event type
biz_step        text   -- EPCIS bizStep (lihat nilai di bawah)
location_name   text   -- nama lokasi human-readable
facility_type   text CHECK (facility_type IN ('RUMAH', 'TPS', 'BANK_SAMPAH', 'PENGEPUL', 'TPA', 'RECYCLER'))
coordinates     jsonb  -- { "lat": -6.200, "lng": 106.816 }
epcis_body      jsonb  -- full EPCIS 2.0 event payload (standar lengkap)
  -- Catatan: Untuk biz_step 'inspecting' (SORTED), simpan jenis material (plastik, kertas, dll) ke dalam epcis_body atau sebagai JSON key terpisah
timestamp       timestamptz DEFAULT now()
blockchain_hash text   -- hash transaksi SHA-256 dari payload (simulasi Hyperledger Fabric)
evidence_url    text   -- URL foto bukti (di-upload via backend ke Supabase Storage)
```

**Nilai `biz_step` (EPCIS 2.0 Business Step)** — dipetakan ke status lifecycle:
| biz_step | Status Baru | Aktor | Deskripsi |
|---|---|---|---|
| `commissioning` | `IN_MARKET` | BRAND | Produk resmi didaftarkan & masuk pasar |
| `discarding` | `DISCARDED` | KONSUMEN | Konsumen scan & konfirmasi buang produk (Custom EPCIS untuk pisah dari disposing landfill) |
| `collecting` | `PICKED_UP` | PETUGAS | Petugas gerobak/RT mengambil dari titik kumpul |
| `receiving` (TPS) | `AT_TPS` | PETUGAS | Sampah diterima di TPS |
| `inspecting` | `SORTED` | PETUGAS | Sortir & pemilahan jenis sampah di TPS |
| `shipping` | `IN_TRANSIT` | PETUGAS | Dimuat ke truk, dikirim ke fasilitas akhir |
| `receiving` (facility) | `AT_FACILITY` | PETUGAS | Diterima di bank sampah / pengepul / TPA |
| `recycling` | `RECYCLED` | PETUGAS | Proses daur ulang selesai |
| `disposing` | `DISPOSED` | PETUGAS | Sampah masuk landfill di TPA |

> **Catatan**: `biz_step` `receiving` dibedakan oleh konteks (lokasi TPS vs fasilitas akhir) yang tersimpan di `location_name` dan `coordinates`.

**Contoh `epcis_body` (EPCIS 2.0 JSON-LD)**:
```json
{
  "@context": ["https://ref.gs1.org/standards/epcis/2.0.0/epcis-context.jsonld"],
  "type": "EPCISDocument",
  "schemaVersion": "2.0",
  "creationDate": "2026-04-29T10:00:00Z",
  "epcisBody": {
    "eventList": [{
      "type": "ObjectEvent",
      "eventTime": "2026-04-29T10:00:00Z",
      "eventTimeZoneOffset": "+07:00",
      "epcList": ["urn:epc:id:sgtin:0614141.107346.2019"],
      "action": "OBSERVE",
      "bizStep": "urn:epcglobal:cbv:bizstep:pos",
      "readPoint": { "id": "urn:epc:id:sgln:0614141.07346.1234" }
    }]
  }
}
```

#### `point_history`
Riwayat perolehan poin per aktivitas. Mendukung leaderboard & audit.
```sql
id            uuid PK
user_id       uuid FK → profiles.id
points_earned integer  -- jumlah poin yang diperoleh dari 1 aktivitas
activity_id   uuid FK → activities.id  -- aktivitas yang memicu poin
description   text     -- keterangan human-readable
created_at    timestamptz
```

**Aturan Poin**:

Skema poin belum final. Prinsip yang harus diikuti saat implementasi:
- Makin jauh perjalanan sampah (mendekati `RECYCLED`), makin besar poin petugas
- Konsumen mendapat poin lebih kecil dari petugas (karena usaha lebih kecil)
- `RECYCLED` harus memberikan poin lebih besar dari `DISPOSED` (insentif daur ulang)
- Implementasi nilai poin sesuai dengan yang digunakan dalam `backend/src/constants.ts`:

Struktur poin per biz_step:
| Aksi | Aktor | Poin |
|---|---|---|
| Scan produk (`DISCARDED`) | KONSUMEN | 1 |
| Pickup gerobak (`PICKED_UP`) | PETUGAS | 2 |
| Terima di TPS (`AT_TPS`) | PETUGAS | 3 |
| Sortir sampah (`SORTED`) | PETUGAS | 4 |
| Muat ke truk (`IN_TRANSIT`) | PETUGAS | 2 |
| Terima di fasilitas (`AT_FACILITY`) | PETUGAS | 5 |
| Konfirmasi daur ulang (`RECYCLED`) | PETUGAS | 10 (tertinggi) |
| Konfirmasi landfill (`DISPOSED`) | PETUGAS | 1 (lebih kecil dari RECYCLED) |

#### `user_collections`
Rekap produk yang pernah dikumpulkan/scan oleh konsumen. **Tabel ini bersifat convenience (bisa berupa View)**.
```sql
id           uuid PK
user_id      uuid FK → profiles.id
instance_id  uuid FK → product_instances.id
collected_at timestamptz
```
> **Catatan**: Data ini sebenarnya redundan dengan `activities` (di mana `biz_step = 'discarding'`). Backend tidak boleh mengizinkan insert independen ke tabel ini; record di sini **harus selalu** dibuat secara atomik bersamaan dengan insert di tabel `activities`, atau idealnya diubah menjadi Database View.

#### `hackathon_test`
Tabel sementara untuk testing koneksi Supabase. **Tidak digunakan untuk fitur produksi**.
```sql
id         integer PK autoincrement
nama       text
created_at timestamptz
```
#### Trigger (DIHAPUS)
```
-- ⚠️ TRIGGER `on_auth_user_created` SUDAH DIHAPUS dari database.
-- Trigger ini sebelumnya menyebabkan error "Database error saving new user" karena
-- schema mismatch antara trigger INSERT dan kolom aktual tabel profiles.
--
-- Backend sekarang menangani pembuatan profil secara eksplisit:
--   1. auth.service.ts → admin.createUser() + profiles.upsert()
--   2. auth.middleware.ts → fallback: jika profile missing, auto-create dari user_metadata
--
-- JANGAN buat ulang trigger ini.
```

---

## 6. Alur Utama Sistem

### Alur A: Konsumen Scan & Buang Sampah
```
1. Konsumen buka app → Scan QR code pada kemasan produk
2. App decode QR → ekstrak GTIN + serial/batch number (GS1 Digital Link)
3. Backend GET /resolve?gtin=...&serial=... → cari product_instance
4. App tampilkan info produk: nama, brand, material_passport, cara daur ulang
5. Konsumen tap "Buang Sampah" → konfirmasi
6. Backend atomik buat:
   a. INSERT activities { biz_step: 'discarding', actor_id: konsumen, instance_id }
   b. INSERT user_collections { user_id: konsumen, instance_id } (atau abaikan jika pakai View)
   c. UPDATE product_instances SET current_status='DISCARDED'
   d. INSERT point_history { user_id: konsumen, points_earned: TBD }
   e. UPDATE profiles SET points = points + TBD WHERE id = konsumen
7. App tampilkan konfirmasi + poin diperoleh + timeline produk
```

### Alur B: Petugas Pickup (Gerobak → TPS)
```
[Titik scan 1: PICKED_UP — Petugas gerobak/RT]
1. Petugas buka app → Scan QR sampah di titik kumpul
2. App tampilkan info instance + status saat ini (DISCARDED)
3. Petugas konfirmasi pickup → otomatis set biz_step: 'collecting'
4. Backend:
   a. INSERT activities { biz_step: 'collecting', actor_id: petugas, coordinates }
   b. UPDATE product_instances SET current_status='PICKED_UP'
   c. INSERT point_history + UPDATE profiles.points petugas

[Titik scan 2: AT_TPS — Petugas TPS]
5. Di TPS, petugas TPS scan QR yang sama
6. Backend: INSERT activities { biz_step: 'receiving', location_name: 'TPS Kelurahan X' }
   UPDATE current_status → 'AT_TPS'

[Titik scan 3: SORTED — Petugas TPS setelah sortir]
7. Setelah disortir: Petugas scan lagi, pilih jenis hasil sortir
8. Backend: INSERT activities { biz_step: 'inspecting' }
   UPDATE current_status → 'SORTED'
```

### Alur C: Petugas Transport & Fasilitas Akhir
```
[Titik scan 4: IN_TRANSIT — Petugas DLH/transport]
1. Petugas truk scan QR saat muat sampah
2. Backend: INSERT activities { biz_step: 'shipping' }
   UPDATE current_status → 'IN_TRANSIT'

[Titik scan 5: AT_FACILITY — Petugas bank sampah/pengepul/TPA]
3. Petugas fasilitas scan QR saat terima
4. Backend: INSERT activities { biz_step: 'receiving', location_name: 'Bank Sampah X' }
   UPDATE current_status → 'AT_FACILITY'

[Titik scan 6 (final): RECYCLED atau DISPOSED]
5. Petugas scan QR, pilih hasil akhir:
   - Berhasil daur ulang → biz_step: 'recycling' → current_status: 'RECYCLED'
   - Tidak bisa daur ulang → biz_step: 'disposing' → current_status: 'DISPOSED'
6. Backend catat + beri poin tertinggi (TBD) jika RECYCLED
7. [Opsional] Kirim hash ke Hyperledger Fabric → simpan di activities.blockchain_hash
```

### Alur D: Brand Daftarkan Produk
```
1. Brand login → Web dashboard brand
2. Isi form: product_name, GTIN, category, weight_grams, material_passport (JSON-LD)
3. Backend INSERT ke products table
4. Brand generate product_instances:
   - Pilih BATCH atau UNIQUE
   - Input batch_number/serial_number
   - Backend generate QR code → GS1 Digital Link URL
5. Brand download QR code → cetak di kemasan produk
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
| POST | `/auth/register` | Register user baru (via `admin.createUser`) | Public | ✅ |
| POST | `/auth/login` | Login & dapat JWT | Public | ✅ |
| GET | `/auth/me` | Get profil user terautentikasi | All | ✅ |
| GET | `/auth/google` | Generate URL Supabase OAuth untuk Google Login (Implicit flow) | Public | ✅ |

### Products ✅ IMPLEMENTED
| Method | Endpoint | Deskripsi | Role | Status |
|---|---|---|---|---|
| GET | `/products` | List produk milik brand + aggregated stats | BRAND | ✅ |
| GET | `/products/:gtin` | Detail produk + semua instances + stats | BRAND | ✅ |
| POST | `/products` | Daftarkan produk baru | BRAND | ✅ |
| POST | `/products/:gtin/instances` | Buat instance + generate QR GS1 Digital Link | BRAND | ✅ |
| GET | `/products/instances/:instanceId/qr` | Generate QR code untuk instance existing | BRAND | ✅ |

> **Catatan routing**: `/products/instances/*` route HARUS didefinisikan sebelum `/products/:gtin` di Express agar `"instances"` tidak di-match sebagai parameter `:gtin`.

### Instances & Tracking
| Method | Endpoint | Deskripsi | Role | Status |
|---|---|---|---|---|
| GET | `/instances/:id` | Detail instance + history | All | ⬜ Planned |
| GET | `/instances/:id/activities` | Timeline perjalanan instance (join activities + profiles) | All | ✅ |
| POST | `/instances/:id/scan` | Scan & catat aktivitas baru | KONSUMEN / PETUGAS | ✅ |

### Uploads
| Method | Endpoint | Deskripsi | Role | Status |
|---|---|---|---|---|
| POST | `/upload/evidence` | Upload foto bukti pekerjaan (multipart/form-data) | PETUGAS / KONSUMEN | ✅ |

### User / Circular Wallet
| Method | Endpoint | Deskripsi | Role | Status |
|---|---|---|---|---|
| GET | `/users/me/collections` | Daftar sampah yang pernah di-discard konsumen (join activities + instances + products) | KONSUMEN | ✅ |
| GET | `/users/me/points` | Total poin + riwayat | KONSUMEN / PETUGAS | ⬜ Planned |
| GET | `/dashboard/stats` | Statistik agregat (publik) | Public | ⬜ Planned |

### QR Resolver
| Method | Endpoint | Deskripsi | Role | Status |
|---|---|---|---|---|
| GET | `/products/resolve` | Resolve GS1 Digital Link → instance data | Public | ✅ |

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
5. **Dashboard Konsumen** — Poin, jumlah sampah dikumpulkan, history
6. **Leaderboard** — Ranking user berdasarkan poin

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
| **Hyperledger Fabric** | Blockchain permissioned untuk catat hash integritas data |

---

## 12. Hal Penting untuk AI

1. **Jangan pernah** gunakan Supabase Anon Key di backend — selalu Service Role Key.
2. **Selalu** ikuti konvensi folder: controllers tipis, logic di services.
3. **Status lifecycle** `current_status` harus selalu diupdate di `product_instances` setiap ada aktivitas baru.
4. **Poin** harus dicatat di dua tempat: `point_history` (per transaksi) dan `profiles.points` (total akumulasi). Implementasi backend harus berusaha melakukan update secara atomik (gunakan DB function/transaction jika memungkinkan).
5. **`epcis_body`** adalah JSONB — simpan full EPCIS 2.0 event payload, bukan ringkasan.
6. **QR code** mewakili `product_instances`, bukan `products`. Satu GTIN bisa punya banyak instances.
7. **`blockchain_hash`** di `activities` diisi otomatis oleh backend dengan *hash* SHA-256 (`crypto`) dari *payload* aktivitas sebagai simulasi integrasi Hyperledger Fabric untuk keperluan hackathon.
8. **`evidence_url`** adalah URL file di Supabase Storage — di-*upload* langsung dari frontend ke bucket `evidences`.
9. Frontend menggunakan **React 19** dan **TypeScript 4.9** — perhatikan compatibility.
10. Backend menggunakan **Express 5** — syntax beberapa hal berbeda dari Express 4 (misal: async error handling otomatis, tidak perlu `next(err)` manual di async routes). **Perhatikan**: `req.params` di Express 5 bertipe `string | string[]`, perlu cast ke `string` saat pass ke function.
11. **Lifecycle** tidak harus linear — sistem harus memfasilitasi "Jalur A" (via TPS) dan "Jalur B" (langsung Bank Sampah). Petugas hanya bisa update status sesuai dengan otoritas role-nya.
12. **Sistem poin TBD** — jangan hardcode angka poin di kode sebelum tim menentukannya. Gunakan konstanta/config yang mudah diubah. Backend menyediakan `POINTS` config sebagai placeholder.
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
27. **`/users/me/collections` Logic**: Query join `activities` → `product_instances` → `products`. Filter `biz_step = 'discarding'` dan `actor_id = konsumen.id`. Hasilnya di-flatten ke struktur flat untuk kemudahan konsumsi frontend. Sorted by `timestamp DESC`.
28. **`/instances/:id/activities` Logic**: Return dua objek: `instance` (data product_instances + join products + join profiles brand) dan `activities` (semua rows activities untuk instance tersebut, join profiles actor, sorted ASC untuk tampil kronologis).
29. **Frontend Constants Pattern**: Saat membuat fitur baru yang menggunakan nilai role, SELALU import dari `constants/roles.ts`. Saat membutuhkan navigasi berdasarkan role, SELALU gunakan `getHomeRouteByRole()` dari `constants/routes.ts`. Jangan pernah hardcode string role atau path redirect di komponen.
30. **Auth Seeding**: **JANGAN** seed user via raw SQL `INSERT INTO auth.users` — ini menghasilkan record dengan `instance_id = NULL` yang tidak terlihat oleh GoTrue dan menyebabkan error `Database error checking email`. SELALU gunakan `supabase.auth.admin.createUser()` dari script TypeScript (lihat `backend/fix_users.ts`). Untuk cleanup data seeder, hapus dalam urutan FK yang benar: `point_history` → `user_collections` → `activities` → `product_instances` → `products` → `auth.identities` → `profiles` → `auth.users`.
31. **Product Instances Relation**: `product_instances` menggunakan `product_id` sebagai *foreign key* ke `products`. Karena frontend banyak membutuhkan nilai `gtin`, backend (services) HARUS selalu men-*join* tabel `products` (contoh: `.select('*, products!inner(gtin)')`) dan memetakan nilai `gtin` tersebut kembali ke level *root* object (misal: `gtin: row.products.gtin`) sebelum dikirim ke frontend.

---

*Dokumen ini dibuat pada 2026-04-29. Terakhir diperbarui: 2026-05-05 (Refactor product_instances FK dari gtin ke product_id + Fix auth seeding via Admin API + Fix konsumen.service.ts gtin queries).*
