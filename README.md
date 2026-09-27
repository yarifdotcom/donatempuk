# Donat Empuk — Kasir Donat Online

Website one page untuk jualan donat: kasir (POS) box isi 12 / 6 / 2, popup **Campur** atau **Atur Sendiri** dengan visual box donat isometrik yang terisi live, keranjang, checkout ke WhatsApp, halaman review pesanan publik, dan admin berpassword.

**Statis di GitHub Pages + database Firebase (Cloud Firestore).** Tidak perlu hosting/PHP.

Alamat: https://yarifdotcom.github.io/donatempuk/

## Isi folder

```
index.html              Halaman utama (kasir / POS)
order.html              Review pesanan publik (link yang dikirim ke WA)
admin.html              Admin: pesanan, ubah status, pengaturan harga & topping
firestore.rules         Aturan keamanan Firestore (admin = login email terdaftar)
assets/js/config.js     <- SEMUA PENGATURAN GLOBAL + konfigurasi Firebase
assets/js/firebase.js   Koneksi Firestore
assets/js/store.js      Pesanan, pengaturan, cadangan lokal, link review, pesan WA
assets/js/app.js        Logika kasir
assets/js/admin.js      Logika admin
assets/js/donut.js      Renderer vektor donat & box isometrik (SVG)
assets/img/             Aset vektor SVG
```

## Pengaturan global (`assets/js/config.js`)

| Variabel | Nilai | Fungsi |
|---|---|---|
| `STORE_NAME` | `Donat Empuk` | Nama brand |
| `SITE_URL` | `https://yarifdotcom.github.io/donatempuk/` | Root website untuk link review di WA |
| `WA_NUMBER` | `6285645719632` | Nomor WA tujuan checkout |
| `ORDER_PREFIX` | `DE` | Awalan nomor pesanan |
| `ADMIN_EMAILS` | `yarifdotcom@gmail.com`, `fatmaberliandina@gmail.com` | Email admin (login Firebase Authentication) |
| `ADMIN_PASSWORD` | `111` | Password cadangan, hanya saat Firebase mati (membuka data lokal) |
| `FIREBASE_CONFIG` | project `donatempuk` | Konfigurasi web app Firebase |
| `FIREBASE_SDK_VERSION` | `12.19.0` | Versi SDK dari gstatic |
| `FIREBASE_TIMEOUT_MS` | `8000` | Batas tunggu sebelum pakai cadangan |
| `ADMIN_LIST_LIMIT` | `200` | Jumlah pesanan yang dibaca admin (hemat kuota) |

## Setup Firebase (sekali saja)

1. Firebase Console → **Build → Firestore Database → Create database** (lokasi `asia-southeast2`, mode *production*).
2. **Build → Authentication → Get started → Email/Password → Enable**.
3. Tab **Users → Add user** untuk tiap admin: `yarifdotcom@gmail.com`, `fatmaberliandina@gmail.com` (password min. 6 karakter).
4. Firestore → tab **Rules** → tempel isi `firestore.rules` → **Publish**.
5. Buka `admin.html` → login email + password → tab **Pengaturan** → **Simpan ke Firebase**.

Koleksi dibuat otomatis, tidak perlu membuat tabel manual:

```
settings/store
  packages: { "12": {name, price, available}, "6": {...}, "2": {...} }
  toppings: { vanila: {name, available}, coklat, matcha, strowberi, redvelvet, oreo }
  updatedAt

orders/{DE260927-XXXX}
  id, createdAt, name, phone, address, note,
  items: [ {pkg:"12", mode:"campur"|"atur", qty, counts:{coklat:2,...}|null, seed} ],
  total, totalBox, totalPcs,
  status: baru | diproses | dikirim | selesai | batal,
  source: web | import, updatedAt
```

## Fallback & hemat kuota (paket gratis Spark)

- **Firebase gagal / kuota habis:** website tetap jalan dengan **harga default & semua topping tersedia**. Pesanan tetap terkirim ke WhatsApp (data lengkap ada di link review) dan disimpan di browser.
- **Impor link:** admin tempel link review dari WA → pesanan masuk (ke Firebase, atau lokal jika Firebase gagal).
- **Salin link:** tiap pesanan di admin punya tombol *Salin link* sebagai cadangan.
- **Sinkronkan:** pesanan/perubahan yang tertahan di lokal ditandai *Lokal*; klik **Sinkronkan ke Firebase** saat Firebase normal lagi.
- **Download backup (JSON) / Pulihkan / Export CSV** ada di menu *Impor & backup*.
- Admin hanya membaca 200 pesanan terbaru dan tanpa listener realtime, supaya pemakaian kuota baca kecil.

## Keamanan

- Pelanggan (tanpa login) hanya bisa **membuat** pesanan dengan format valid dan membuka review pesanan lewat link.
- Daftar pesanan, ubah status, hapus, dan pengaturan harga **hanya** untuk akun Firebase dengan email di daftar admin — dicek oleh server Firebase, bukan hanya oleh halaman web.
- Menambah/menghapus admin: tambah user di Authentication, lalu ubah daftar email di `assets/js/config.js` **dan** `firestore.rules` (harus sama), Publish rules, upload `config.js`.
- Mencabut akses cepat: Authentication → Users → hapus / disable user.
- `apiKey` Firebase dan daftar email admin memang terlihat publik; yang melindungi data adalah Rules + password akun masing-masing.
