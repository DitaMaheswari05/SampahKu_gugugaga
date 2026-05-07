# Penjelasan Struktur Project

Project ini merupakan aplikasi fullstack yang terdiri dari:

* **Frontend** menggunakan React + TypeScript
* **Backend** menggunakan Node.js + Express + TypeScript
* **Database** menggunakan Supabase
* **Deployment frontend dan backend** menggunakan Vercel

Struktur project dipisahkan menjadi dua bagian utama:

* `frontend/`
* `backend/`

---

# Tech Stack

Project ini menggunakan beberapa teknologi utama, yaitu:

## Database

* **Supabase**

Supabase digunakan sebagai database untuk menyimpan dan mengelola data aplikasi.

## Frontend

* **React**
* **TypeScript**

Frontend digunakan untuk membangun tampilan aplikasi, mengatur routing halaman, mengelola state, dan melakukan komunikasi dengan backend API.

## Backend

* **Node.js**
* **Express.js**
* **TypeScript**

Backend digunakan untuk menangani request dari frontend, membuat REST API, menjalankan business logic, melakukan autentikasi, validasi data, serta menghubungkan aplikasi dengan database.

## Deployment

* **Vercel**

Frontend dan backend dideploy menggunakan Vercel.

---

# Library

Library tambahan yang digunakan pada project ini:

## QR Scanner

* **html5-qrcode**

Library `html5-qrcode` digunakan untuk membaca QR Code melalui kamera perangkat. Fitur ini digunakan pada bagian aplikasi yang membutuhkan proses scan QR Code.

---

# Backend (`backend/src`)

Folder ini berisi seluruh logic server-side seperti API, business logic, middleware, dan konfigurasi server.

## Struktur Folder

### `controllers/`

Berisi fungsi handler untuk setiap endpoint API.

* Bertugas menerima request (`req`) dan mengembalikan response (`res`)
* Tidak mengandung logic kompleks
* Hanya mengatur alur request dan response

Contoh:

* `user.controller.ts`
* `auth.controller.ts`

---

### `routes/`

Berisi definisi endpoint API.

* Menghubungkan URL dengan controller
* Menggunakan Express Router

Contoh:

```ts
router.get('/users', getUsers)
```

---

### `services/`

Berisi business logic utama.

* Tempat proses data
* Tempat komunikasi dengan database atau API lain
* Dipanggil oleh controller

Contoh:

* validasi data
* query database
* perhitungan logic tertentu

---

### `middlewares/`

Berisi middleware Express.

* Digunakan sebelum request masuk ke controller
* Contoh penggunaan:

  * authentication
  * logging
  * error handling

---

### `app.ts`

* Inisialisasi Express app
* Setup middleware global seperti cors, json, dan middleware lainnya
* Registrasi semua routes

---

### `server.ts`

* Entry point backend
* Menjalankan server pada port tertentu

---

# Frontend (`frontend/src`)

Folder ini berisi seluruh logic client-side seperti UI, state, API call, dan routing halaman.

## Struktur Folder

### `components/`

Berisi komponen UI reusable.

* Digunakan berulang di berbagai halaman
* Contoh:

  * Button
  * Navbar
  * Card

---

### `pages/`

Berisi halaman utama aplikasi.

* Setiap file merepresentasikan satu halaman
* Biasanya digunakan pada routing aplikasi

Contoh:

* `Home.tsx`
* `Login.tsx`

---

### `hooks/`

Berisi custom React hooks.

* Digunakan untuk reusable logic
* Contoh:

  * `useFetch`
  * `useAuth`

---

### `services/`

Berisi fungsi untuk komunikasi ke backend API.

* Menggunakan axios / fetch
* Semua API call dipusatkan di sini

Contoh:

```ts
api.get('/users')
```

---

### `styles/`

Berisi file styling.

* Menggunakan CSS biasa / CSS Modules
* Digunakan untuk mengatur tampilan aplikasi

---

### `utils/`

Berisi helper function.

* Fungsi kecil yang sering digunakan ulang
* Contoh:

  * format tanggal
  * helper string

---

### `App.tsx`

* Root component aplikasi React
* Tempat setup routing dan layout utama

---

### `index.tsx`

* Entry point React
* Render App ke DOM

---

### `index.css`

* Global styling aplikasi

---

# Cara Install Library

Sebelum menjalankan program, pastikan perangkat sudah menginstall:

* **Node.js**
* **npm**

Node.js dan npm dibutuhkan untuk menginstall dependency frontend dan backend.

Untuk mengecek apakah Node.js dan npm sudah terinstall, jalankan perintah berikut:

```bash
node -v
npm -v
```

Jika versi Node.js dan npm muncul, berarti keduanya sudah terinstall.

---

## Install Library Backend

Masuk ke folder backend terlebih dahulu:

```bash
cd backend
```

Lalu install semua library atau dependency backend:

```bash
npm install
```

Perintah `npm install` akan membaca file `package.json` pada folder backend, lalu menginstall semua library yang dibutuhkan oleh backend.

Contoh library backend yang digunakan:

* `express`
* `typescript`
* library lain yang terdaftar pada `backend/package.json`

Setelah proses selesai, folder `node_modules/` akan otomatis dibuat di dalam folder `backend`.

---

## Install Library Frontend

Masuk ke folder frontend:

```bash
cd frontend
```

Lalu install semua library atau dependency frontend:

```bash
npm install
```

Perintah `npm install` akan membaca file `package.json` pada folder frontend, lalu menginstall semua library yang dibutuhkan oleh frontend.

Contoh library frontend yang digunakan:

* `react`
* `typescript`
* `html5-qrcode`
* library lain yang terdaftar pada `frontend/package.json`

Setelah proses selesai, folder `node_modules/` akan otomatis dibuat di dalam folder `frontend`.

---

## Install Library QR Scanner

Project ini menggunakan library `html5-qrcode` untuk fitur scan QR Code.

Jika library belum terinstall di frontend, jalankan perintah berikut di dalam folder `frontend`:

```bash
cd frontend
npm install html5-qrcode
```

Library ini digunakan agar aplikasi dapat mengakses kamera perangkat dan membaca QR Code.

---

## Catatan Instalasi Library

* Jalankan `npm install` secara terpisah di folder `backend` dan `frontend`.
* Jangan menghapus file `package.json` dan `package-lock.json`.
* Folder `node_modules/` tidak perlu diupload ke GitHub karena bisa dibuat kembali dengan menjalankan `npm install`.
* Jika dependency error, hapus folder `node_modules/` dan file `package-lock.json`, lalu jalankan kembali:

```bash
npm install
```

---

# Cara Menjalankan Program

Project dijalankan secara terpisah antara backend dan frontend.

## Menjalankan Backend

Masuk ke folder backend:

```bash
cd backend
```

Install dependency backend jika belum:

```bash
npm install
```

Jalankan backend:

```bash
npm run dev
```

Backend akan berjalan pada:

```bash
http://localhost:5000
```

---

## Menjalankan Frontend

Buka terminal baru, lalu masuk ke folder frontend:

```bash
cd frontend
```

Install dependency frontend jika belum:

```bash
npm install
```

Jalankan frontend:

```bash
npm start
```

Frontend akan berjalan pada:

```bash
http://localhost:3000
```

---

# Deployment

Project sudah dideploy menggunakan Vercel.

Link deploy:

```bash
https://sampahku-one.vercel.app/
```

---

# Catatan

* Backend berjalan di: `http://localhost:5000`
* Frontend berjalan di: `http://localhost:3000`
* Link deploy: `https://sampahku-one.vercel.app/`
* Autentikasi Google digunakan khusus untuk konsumen.
* Fitur login menggunakan Google hanya tersedia untuk Android.
* Pastikan backend dan frontend berjalan bersamaan agar aplikasi dapat digunakan secara lokal.
