/* =========================================================
   Donat Empuk — koneksi Firebase (Cloud Firestore)
   ---------------------------------------------------------
   Koleksi yang dipakai (dibuat otomatis, tidak perlu setup tabel):

   settings/store              -> 1 dokumen konfigurasi toko
     packages: { "12": {name, price, available}, "6": {...}, "2": {...} }
     toppings: { vanila: {name, available}, coklat: {...}, ... }
     updatedAt: timestamp

   orders/{orderId}            -> 1 dokumen per pesanan
     id, createdAt (ISO string), name, phone, address, note,
     items: [{pkg, mode, qty, counts|null, seed}],
     total, totalBox, totalPcs, status, source, updatedAt

   Jika Firebase gagal / kuota habis, semua fungsi menolak (reject)
   dan aplikasi memakai cadangan lokal (localStorage + link WA).
   ========================================================= */
(function () {
  'use strict';
  var CFG = window.APP_CONFIG || {};
  var V = CFG.FIREBASE_SDK_VERSION || '12.19.0';
  var BASE = 'https://www.gstatic.com/firebasejs/' + V + '/';
  var TIMEOUT = CFG.FIREBASE_TIMEOUT_MS || 8000;

  var EMAILS = (Array.isArray(CFG.ADMIN_EMAILS) ? CFG.ADMIN_EMAILS : [])
    .concat(CFG.ADMIN_EMAIL ? [CFG.ADMIN_EMAIL] : [])
    .map(function (e) { return String(e).trim().toLowerCase(); }).filter(Boolean);
  function isAdminEmail(e) { return !!e && EMAILS.indexOf(String(e).toLowerCase()) > -1; }

  var app = null, fs = null, F = null, AU = null, auth = null, ok = false, err = null, readyP = null;

  function timeout(p, ms, label) {
    return new Promise(function (res, rej) {
      var t = setTimeout(function () { rej(new Error((label || 'Firebase') + ' timeout')); }, ms || TIMEOUT);
      p.then(function (v) { clearTimeout(t); res(v); }, function (e) { clearTimeout(t); rej(e); });
    });
  }
  function need() { if (!ok) return Promise.reject(err || new Error('Firebase tidak aktif')); return null; }

  function ready() {
    if (readyP) return readyP;
    var c = CFG.FIREBASE_CONFIG;
    if (!c || !c.apiKey || !c.projectId) { err = new Error('FIREBASE_CONFIG kosong'); readyP = Promise.resolve(false); return readyP; }
    var mods = [import(BASE + 'firebase-app.js'), import(BASE + 'firebase-firestore.js')];
    // modul Auth hanya dimuat di halaman admin (halaman pelanggan tidak perlu login)
    var isAdminPage = document.body && document.body.classList.contains('page-admin');
    if (EMAILS.length && isAdminPage) mods.push(import(BASE + 'firebase-auth.js'));
    readyP = timeout(Promise.all(mods), TIMEOUT, 'Memuat SDK Firebase').then(function (m) {
      F = m[1]; AU = m[2] || null;
      app = m[0].initializeApp(c);
      fs = F.getFirestore(app);
      if (AU) auth = AU.getAuth(app);
      ok = true; return true;
    }).catch(function (e) { err = e; ok = false; console.warn('[Firebase] tidak aktif:', e.message); return false; });
    return readyP;
  }

  function clean(o) { return JSON.parse(JSON.stringify(o)); } // buang undefined

  function orderToDoc(o) {
    var S = window.Store;
    return clean({
      id: o.id, createdAt: o.createdAt, name: o.name, phone: o.phone, address: o.address, note: o.note || '',
      items: (o.items || []).map(function (it) {
        if (it.type === 'honey') return { type: 'honey', key: String(it.key), size: String(it.size), qty: Number(it.qty) || 1 };
        return { pkg: String(it.pkg), mode: it.mode, qty: Number(it.qty) || 1, counts: it.counts || null, seed: Number(it.seed) || 1 };
      }),
      totalBottles: S.totalBottles(o.items),
      total: Number(o.total) || 0, totalBox: S.totalBox(o.items), totalPcs: S.totalPcs(o.items),
      status: o.status || 'baru', source: o.source || 'web'
    });
  }
  function docToOrder(d) {
    var x = d.data ? d.data() : d;
    return { id: x.id || d.id, createdAt: x.createdAt, name: x.name, phone: x.phone, address: x.address, note: x.note || '',
      items: x.items || [], total: x.total, status: x.status || 'baru', synced: true };
  }

  window.FB = {
    ready: ready,
    isOk: function () { return ok; },
    error: function () { return err; },
    usesAuth: function () { return EMAILS.length > 0; },
    adminEmails: function () { return EMAILS.slice(); },

    // ---- Auth admin (opsional, jika ADMIN_EMAILS diisi) ----
    signIn: function (email, password) {
      if (!isAdminEmail(email)) return Promise.reject(new Error('Email bukan admin'));
      return need() || timeout(AU.signInWithEmailAndPassword(auth, String(email).trim(), password), TIMEOUT, 'Login');
    },
    // Email admin yang masih login di browser ini (sesi Firebase tersimpan), atau null
    currentAdmin: function () {
      if (!ok || !auth) return Promise.resolve(null);
      return timeout(auth.authStateReady(), TIMEOUT, 'Sesi').then(function () {
        var u = auth.currentUser; return u && isAdminEmail(u.email) ? u.email : null;
      }).catch(function () { return null; });
    },
    signOut: function () { return ok && auth ? AU.signOut(auth) : Promise.resolve(); },

    // ---- Settings ----
    getSettings: function () {
      return need() || timeout(F.getDoc(F.doc(fs, 'settings', 'store'))).then(function (s) { return s.exists() ? s.data() : null; });
    },
    saveSettings: function (st) {
      return need() || timeout(F.setDoc(F.doc(fs, 'settings', 'store'), Object.assign(clean(st), { updatedAt: F.serverTimestamp() })));
    },

    // ---- Orders ----
    createOrder: function (o) {
      var n = need(); if (n) return n;
      var d = orderToDoc(o); d.updatedAt = F.serverTimestamp();
      return timeout(F.setDoc(F.doc(fs, 'orders', o.id), d));
    },
    getOrder: function (id) {
      return need() || timeout(F.getDoc(F.doc(fs, 'orders', id))).then(function (s) { return s.exists() ? docToOrder(s) : null; });
    },
    listOrders: function (max) {
      var n = need(); if (n) return n;
      var q = F.query(F.collection(fs, 'orders'), F.orderBy('createdAt', 'desc'), F.limit(max || CFG.ADMIN_LIST_LIMIT || 200));
      return timeout(F.getDocs(q)).then(function (snap) { return snap.docs.map(docToOrder); });
    },
    setStatus: function (id, status) {
      return need() || timeout(F.updateDoc(F.doc(fs, 'orders', id), { status: status, updatedAt: F.serverTimestamp() }));
    },
    deleteOrder: function (id) {
      return need() || timeout(F.deleteDoc(F.doc(fs, 'orders', id)));
    }
  };
})();
