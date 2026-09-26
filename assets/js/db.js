/* =========================================================
   Donat Empuk — Database SQLite di browser (sql.js)
   ---------------------------------------------------------
   - Database dibaca langsung dari file di repo (CFG.DB_FILE):
       data/database.sql     -> teks SQL, dijalankan saat halaman dibuka
       data/database.sqlite  -> file SQLite biner
   - Tidak perlu hosting / PHP / MySQL: jalan 100% di GitHub Pages.
   - GitHub Pages hanya bisa DIBACA, tidak bisa ditulis. Pesanan baru
     disimpan di browser (localStorage) lalu digabung dengan isi file.
     Admin bisa "Download database.sql" lalu commit ke repo agar
     pesanan & status tersimpan permanen dan terlihat dari perangkat lain.
   ========================================================= */
(function () {
  'use strict';
  var CFG = window.APP_CONFIG || {};
  var LS_CHANGES = 'donatempuk_db_changes_v1';   // { orders: {id: order|null} }
  var SQLJS_VERSION = CFG.SQLJS_VERSION || '1.10.3';
  var CDNS = [
    'https://cdnjs.cloudflare.com/ajax/libs/sql.js/' + SQLJS_VERSION + '/',
    'https://cdn.jsdelivr.net/npm/sql.js@' + SQLJS_VERSION + '/dist/'
  ];

  var db = null, ok = false, error = null, readyP = null;
  var TABLE_ORDER = ['packages', 'toppings', 'orders', 'order_items'];

  // ---------- util ----------
  function lsGet(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* abaikan */ } }
  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = src; s.async = true;
      s.onload = res; s.onerror = function () { rej(new Error('gagal memuat ' + src)); };
      document.head.appendChild(s);
    });
  }
  function loadLib(i) {
    i = i || 0;
    if (typeof window.initSqlJs === 'function' && i === 0) return window.initSqlJs({ locateFile: function (f) { return CDNS[0] + f; } });
    if (i >= CDNS.length) return Promise.reject(new Error('sql.js tidak bisa dimuat'));
    return loadScript(CDNS[i] + 'sql-wasm.js')
      .then(function () { return window.initSqlJs({ locateFile: function (f) { return CDNS[i] + f; } }); })
      .catch(function () { return loadLib(i + 1); });
  }

  // SELECT -> array of objects
  function all(sql, params) {
    var r = db.exec(sql, params || []);
    if (!r.length) return [];
    var cols = r[0].columns;
    return r[0].values.map(function (row) { var o = {}; cols.forEach(function (c, i) { o[c] = row[i]; }); return o; });
  }
  function run(sql, params) { db.run(sql, params || []); }

  // ---------- baca file database dari repo ----------
  function fileUrl() {
    var f = CFG.DB_FILE || 'data/database.sql';
    return f + (f.indexOf('?') > -1 ? '&' : '?') + 'v=' + Date.now(); // hindari cache lama
  }
  function openFromFile(SQL) {
    var f = (CFG.DB_FILE || 'data/database.sql').toLowerCase();
    var isBinary = /\.(sqlite3?|db)$/.test(f);
    return fetch(fileUrl(), { cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error('File database tidak ditemukan: ' + CFG.DB_FILE);
      return isBinary ? r.arrayBuffer() : r.text();
    }).then(function (data) {
      if (isBinary) return new SQL.Database(new Uint8Array(data));
      var d = new SQL.Database(); d.exec(data); return d;
    });
  }

  // ---------- simpan / baca order ----------
  function insertOrder(o) {
    run('DELETE FROM order_items WHERE order_id = ?', [o.id]);
    run('INSERT OR REPLACE INTO orders (id, created_at, name, phone, address, note, total, status) VALUES (?,?,?,?,?,?,?,?)',
      [o.id, o.createdAt, o.name, o.phone, o.address, o.note || null, Number(o.total) || 0, o.status || 'baru']);
    (o.items || []).forEach(function (it) {
      var price = (window.DonutArt.PACKAGES[it.pkg] || {}).price || 0;
      run('INSERT INTO order_items (order_id, package_id, mode, qty, counts_json, seed, subtotal) VALUES (?,?,?,?,?,?,?)',
        [o.id, String(it.pkg), it.mode, it.qty, it.counts ? JSON.stringify(compact(it.counts)) : null, it.seed || 1, price * it.qty]);
    });
  }
  function compact(c) { var o = {}; Object.keys(c).forEach(function (k) { if (c[k] > 0) o[k] = c[k]; }); return o; }
  function hydrate(rows) {
    if (!rows.length) return [];
    var ids = rows.map(function (r) { return r.id; });
    var items = all('SELECT * FROM order_items WHERE order_id IN (' + ids.map(function () { return '?'; }).join(',') + ') ORDER BY id', ids);
    var by = {};
    items.forEach(function (r) {
      (by[r.order_id] = by[r.order_id] || []).push({
        pkg: String(r.package_id), mode: r.mode, qty: r.qty,
        counts: r.counts_json ? JSON.parse(r.counts_json) : null, seed: r.seed || 1
      });
    });
    return rows.map(function (r) {
      return { id: r.id, createdAt: r.created_at, name: r.name, phone: r.phone, address: r.address,
        note: r.note || '', total: r.total, status: r.status || 'baru', items: by[r.id] || [] };
    });
  }

  function changes() { return lsGet(LS_CHANGES, { orders: {} }); }
  function remember(id, order) { var c = changes(); c.orders[id] = order; lsSet(LS_CHANGES, c); }
  function applyChanges() {
    var c = changes();
    Object.keys(c.orders).forEach(function (id) {
      var o = c.orders[id];
      if (o) insertOrder(o); else run('DELETE FROM orders WHERE id = ?', [id]);
    });
  }

  // katalog (harga & nama) dari tabel -> DonutArt
  function syncCatalog() {
    var DA = window.DonutArt;
    all('SELECT id, name, box_rows, box_cols, price FROM packages').forEach(function (p) {
      if (DA.PACKAGES[p.id]) { DA.PACKAGES[p.id].price = p.price; DA.PACKAGES[p.id].name = p.name; }
    });
    all('SELECT id, name FROM toppings').forEach(function (t) { if (DA.TOPPINGS[t.id]) DA.TOPPINGS[t.id].name = t.name; });
  }

  // ---------- export ----------
  function sqlVal(v) {
    if (v === null || v === undefined) return 'NULL';
    if (typeof v === 'number') return String(v);
    return "'" + String(v).replace(/'/g, "''") + "'";
  }
  function dumpSql() {
    var out = [];
    out.push('-- =========================================================');
    out.push('--  ' + (CFG.STORE_NAME || 'Donat Empuk') + ' — database SQLite');
    out.push('--  Diexport dari halaman admin: ' + new Date().toISOString());
    out.push('--  Simpan sebagai data/database.sql di repo GitHub lalu commit.');
    out.push('-- =========================================================');
    out.push('PRAGMA foreign_keys = OFF;');
    out.push('BEGIN TRANSACTION;');
    TABLE_ORDER.forEach(function (t) {
      var def = all("SELECT sql FROM sqlite_master WHERE type='table' AND name = ?", [t])[0];
      if (!def) return;
      out.push('');
      out.push('DROP TABLE IF EXISTS ' + t + ';');
      out.push(def.sql + ';');
      var r = db.exec('SELECT * FROM ' + t);
      if (r.length) {
        var cols = r[0].columns;
        r[0].values.forEach(function (row) {
          out.push('INSERT INTO ' + t + ' (' + cols.join(', ') + ') VALUES (' + row.map(sqlVal).join(', ') + ');');
        });
      }
    });
    all("SELECT sql FROM sqlite_master WHERE type='index' AND sql IS NOT NULL").forEach(function (ix) { out.push(ix.sql + ';'); });
    out.push('COMMIT;');
    out.push('PRAGMA foreign_keys = ON;');
    return out.join('\n') + '\n';
  }
  function download(name, data, type) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([data], { type: type }));
    a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  // ---------- API publik ----------
  window.DB = {
    ready: function () {
      if (readyP) return readyP;
      readyP = loadLib().then(function (SQL) { return openFromFile(SQL); })
        .then(function (d) {
          db = d; run('PRAGMA foreign_keys = ON');
          syncCatalog(); applyChanges(); ok = true; return true;
        })
        .catch(function (e) { error = e; ok = false; console.warn('[DB] mode cadangan localStorage:', e.message); return false; });
      return readyP;
    },
    isOk: function () { return ok; },
    error: function () { return error; },
    list: function () { return hydrate(all('SELECT * FROM orders ORDER BY created_at DESC')); },
    get: function (id) { return hydrate(all('SELECT * FROM orders WHERE id = ?', [id]))[0] || null; },
    save: function (o) { insertOrder(o); remember(o.id, this.get(o.id)); },
    setStatus: function (id, st) { run('UPDATE orders SET status = ? WHERE id = ?', [st, id]); remember(id, this.get(id)); },
    remove: function (id) { run('DELETE FROM order_items WHERE order_id = ?', [id]); run('DELETE FROM orders WHERE id = ?', [id]); remember(id, null); },
    pendingCount: function () { return Object.keys(changes().orders).length; },
    clearLocalChanges: function () { lsSet(LS_CHANGES, { orders: {} }); },
    query: all,
    exportSql: function () { download('database.sql', dumpSql(), 'application/sql;charset=utf-8'); },
    exportSqlite: function () { download('database.sqlite', db.export(), 'application/vnd.sqlite3'); },
    dumpSql: dumpSql
  };
})();
