# Penjelasan Struktur Project

Project ini merupakan aplikasi fullstack yang terdiri dari:

* **Frontend** menggunakan React + TypeScript
* **Backend** menggunakan Node.js + Express + TypeScript

Struktur project dipisahkan menjadi dua bagian utama:

* `frontend/`
* `backend/`

---

# Backend (`backend/src`)

Folder ini berisi seluruh logic server-side (API, business logic, middleware, dll).

## Struktur Folder

### `controllers/`

Berisi fungsi handler untuk setiap endpoint API.

* Bertugas menerima request (`req`) dan mengembalikan response (`res`)
* Tidak mengandung logic kompleks (hanya mengatur alur)

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
* Tempat komunikasi dengan database / API lain
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
* Setup middleware global (cors, json, dll)
* Registrasi semua routes

---

### `server.ts`

* Entry point backend
* Menjalankan server pada port tertentu

---

# Frontend (`frontend/src`)

Folder ini berisi seluruh logic client-side (UI, state, API call, dll).

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

* Setiap file merepresentasikan 1 halaman
* Biasanya digunakan di routing

Contoh:

* Home.tsx
* Login.tsx

---

### `hooks/`

Berisi custom React hooks.

* Digunakan untuk reusable logic
* Contoh:

  * useFetch
  * useAuth

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
* Untuk mengatur tampilan aplikasi

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
* Tempat setup routing / layout utama

---

### `index.tsx`

* Entry point React
* Render App ke DOM

---

### `index.css`

* Global styling aplikasi

---

# Cara Menjalankan Program

## Backend

```bash
cd backend
npm install
npm run dev
```

## Frontend

```bash
cd frontend
npm install
npm start
```

---

# Catatan

* Backend berjalan di: `http://localhost:5000`
* Frontend berjalan di: `http://localhost:3000`
* Link deploy: `https://sampahku-one.vercel.app/`
---
