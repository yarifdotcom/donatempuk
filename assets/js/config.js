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

  // Password CADANGAN — hanya dipakai saat Firebase tidak bisa dihubungi,
  // untuk membuka data cadangan yang tersimpan di browser admin itu sendiri.
  ADMIN_PASSWORD: '111',

  // ---------- Firebase (Cloud Firestore) ----------
  // Konfigurasi web app dari Firebase Console > Project settings > Your apps
  FIREBASE_CONFIG: {
    apiKey: 'AIzaSyAsjCJYDRFqqtAtOYSk75wiFArfa8H8Rcg',
    authDomain: 'donatempuk.firebaseapp.com',
    projectId: 'donatempuk',
    storageBucket: 'donatempuk.firebasestorage.app',
    messagingSenderId: '627440146896',
    appId: '1:627440146896:web:160698103c5e0d48d901d5'
  },
  FIREBASE_SDK_VERSION: '12.19.0',

  // Batas waktu menunggu Firebase (ms). Lewat dari ini -> pakai cadangan lokal/default.
  FIREBASE_TIMEOUT_MS: 8000,

  // Jumlah pesanan terbaru yang dimuat di admin (hemat kuota baca Firestore gratis)
  ADMIN_LIST_LIMIT: 200,

  // Daftar email admin (akun di Firebase Authentication > Email/Password).
  // Login admin = email + password akun Firebase masing-masing.
  // WAJIB sama dengan daftar email di file firestore.rules.
  ADMIN_EMAILS: [
    'yarifdotcom@gmail.com',
    'fatmaberliandina@gmail.com'
  ],

  // Mata uang
  CURRENCY: 'Rp'
};
