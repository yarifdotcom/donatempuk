# Donat Empuk — Kasir Donat Online

Website one page untuk jualan donat: kasir (POS) box isi 12 / 6 / 2, popup **Campur** atau **Atur Sendiri** dengan visual box donat isometrik yang terisi live, keranjang, checkout ke WhatsApp, halaman review pesanan publik, dan admin berpassword.

**100% statis — jalan di GitHub Pages tanpa hosting.** Database memakai **SQLite langsung di browser** (sql.js) yang dibaca dari file `data/database.sql`.

Alamat: https://yarifdotcom.github.io/donatempuk/

## Isi folder

```
index.html            Halaman utama (kasir / POS)
order.html            Review pesanan publik (link yang dikirim ke WA)
admin.html            Admin view
data/database.sql     DATABASE SQLite (teks SQL) — dibaca langsung oleh website
data/database.sqlite  Versi biner dari database yang sama (opsional)
assets/js/config.js   <- SEMUA PENGATURAN GLOBAL
assets/js/db.js       Mesin SQLite di browser (sql.js dari CDN)
assets/js/donut.js    Renderer vektor donat & box isometrik (SVG)
assets/js/store.js    Format pesanan, link review, pesan WA
assets/js/app.js      Logika kasir
assets/js/admin.js    Logika admin
assets/img/           Aset vektor SVG
```

## Pengaturan global (`assets/js/config.js`)

| Variabel | Nilai | Fungsi |
|---|---|---|
| `STORE_NAME` | `Donat Empuk` | Nama brand di semua halaman, box, pesan WA |
| `SITE_URL` | `https://yarifdotcom.github.io/donatempuk/` | Root website untuk link review di WA |
| `WA_NUMBER` | `6285645719632` | Nomor WA tujuan checkout |
| `ORDER_PREFIX` | `DE` | Awalan nomor pesanan |
| `ADMIN_PASSWORD` | `111` | Password admin.html |
| `DB_FILE` | `data/database.sql` | File database (`.sql` atau `.sqlite`) |
| `SQLJS_VERSION` | `1.10.3` | Versi sql.js dari CDN |

## Pasang di GitHub Pages

1. Buat repo **`donatempuk`** di akun `yarifdotcom`.
2. Upload semua isi folder ini ke root repo.
3. **Settings → Pages** → Source: branch `main`, folder `/ (root)` → Save.
4. Buka https://yarifdotcom.github.io/donatempuk/

## Cara kerja database

- Saat halaman dibuka, browser mengunduh `data/database.sql` lalu menjalankannya di SQLite (sql.js).
- **Harga, nama paket, dan nama topping diambil dari database.** Ubah `price` di tabel `packages`, commit, dan harga di website langsung berubah.
- GitHub Pages **hanya bisa dibaca**, tidak bisa ditulis dari browser. Jadi:
  1. Pelanggan checkout → detail pesanan terkirim ke WA toko beserta link review.
  2. Admin buka `admin.html` → **Impor pesanan dari link review WhatsApp** (tempel link dari WA) → pesanan masuk ke database di browser admin. Ubah status sesuai progres.
  3. Klik **Download database.sql**, ganti file `data/database.sql` di repo dengan hasil download, lalu commit (bisa lewat tombol *Upload files* di GitHub).
  4. Setelah commit, semua perangkat admin melihat data yang sama, dan **pelanggan bisa melihat status terbaru** di halaman review pesanannya.
  5. Klik **Sudah commit, muat ulang dari file** untuk membersihkan perubahan lokal.
- Mau pakai file biner? Klik **Download .sqlite**, simpan sebagai `data/database.sqlite`, dan ubah `DB_FILE` di config.
- Jika CDN sql.js tidak bisa dimuat (offline), website tetap jalan dan pesanan disimpan sementara di localStorage.

> Catatan keamanan: di GitHub Pages semua file publik. Password admin dan `database.sql` (berisi nama, no. HP, alamat pelanggan) bisa dibaca siapa pun yang tahu alamatnya. Jika data pelanggan perlu dirahasiakan, jangan commit data pesanan ke repo publik — simpan hasil download database di komputer admin saja.
