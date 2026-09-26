/* =========================================================
   KONFIGURASI — ubah sesuai toko kamu
   ========================================================= */
window.APP_CONFIG = {
  // Nama brand — dipakai di semua halaman, box, pesan WA, dll.
  STORE_NAME: 'Donat Empuk',

  // Alamat root website (akhiri dengan "/"). Dipakai untuk link review pesanan
  // yang dikirim ke WhatsApp. Kosongkan '' agar otomatis mengikuti alamat saat ini.
  SITE_URL: 'https://yarifdotcom.github.io/donatempuk/',

  // Awalan nomor pesanan, contoh: DE260927-AB12
  ORDER_PREFIX: 'DE',

  // Nomor WhatsApp toko, format internasional TANPA "+" dan TANPA "0" di depan
  // contoh: 6281234567890
  WA_NUMBER: '6285645719632',

  // Password halaman admin (admin.html)
  ADMIN_PASSWORD: '111',

  // File database SQLite yang dibaca langsung dari repo (tanpa hosting):
  //   'data/database.sql'    -> teks SQL (mudah diedit & dilihat di GitHub)
  //   'data/database.sqlite' -> file SQLite biner
  DB_FILE: 'data/database.sql',

  // Versi library sql.js (SQLite di browser) dari CDN
  SQLJS_VERSION: '1.10.3',

  // Mata uang
  CURRENCY: 'Rp'
};
