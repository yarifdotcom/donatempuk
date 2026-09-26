/* =========================================================
   Donat Empuk — Admin view
   Password diatur di assets/js/config.js (ADMIN_PASSWORD)
   ========================================================= */
(function () {
  'use strict';
  var DA = window.DonutArt, S = window.Store, CFG = window.APP_CONFIG;
  var $ = function (s) { return document.querySelector(s); };
  var SESSION = 'donatempuk_admin';
  var orders = [], pw = '';
  var STATUS = ['baru', 'diproses', 'dikirim', 'selesai', 'batal'];

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function toast(m) { var t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove('show'); }, 2200); }
  function ssGet() { try { return sessionStorage.getItem(SESSION) || ''; } catch (e) { return ''; } }
  function ssSet(v) { try { v ? sessionStorage.setItem(SESSION, v) : sessionStorage.removeItem(SESSION); } catch (e) { /* abaikan */ } }

  // ---------- Login ----------
  function tryLogin(p) {
    return p === String(CFG.ADMIN_PASSWORD) ? Promise.resolve(true) : Promise.reject(new Error('Password salah'));
  }
  function enter() {
    $('#login').hidden = true; $('#dash').hidden = false;
    $('#modeInfo').textContent = 'Memuat database…';
    S.ready().then(function () { load(); });
  }
  $('#loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var p = $('#pw').value;
    tryLogin(p).then(function () { pw = p; ssSet(p); enter(); })
      .catch(function () { $('#loginErr').textContent = 'Password salah.'; $('#pw').select(); });
  });
  $('#logout').addEventListener('click', function () { ssSet(''); location.reload(); });

  // ---------- Data ----------
  function dbInfo() {
    var f = esc(CFG.DB_FILE || 'data/database.sql');
    if (!S.useDb()) {
      $('#modeInfo').innerHTML = '<b>Database SQLite gagal dimuat</b> (' + esc((window.DB && DB.error() && DB.error().message) || 'tanpa koneksi') + '). Sementara memakai penyimpanan browser.';
      $('#dbTools').hidden = true; return;
    }
    var n = DB.pendingCount();
    $('#dbTools').hidden = false;
    $('#modeInfo').innerHTML = 'Database <b>SQLite</b> dimuat dari <code>' + f + '</code>. ' +
      (n ? '<b class="warn">' + n + ' perubahan</b> baru tersimpan di browser ini — klik <b>Download database.sql</b> lalu commit ke repo agar permanen.'
         : 'Semua data sudah sama dengan file di repo.');
    $('#clearLocal').hidden = !n;
  }
  function load() { orders = S.listOrders(); render(); dbInfo(); }
  function setStatus(id, st) { S.setStatus(id, st); toast('Status diperbarui'); load(); }
  function del(id) {
    if (!confirm('Hapus pesanan #' + id + '?')) return;
    S.deleteOrder(id); toast('Pesanan dihapus'); load();
  }
  $('#dlSql').addEventListener('click', function () { DB.exportSql(); toast('database.sql diunduh'); });
  $('#dlSqlite').addEventListener('click', function () { DB.exportSqlite(); toast('database.sqlite diunduh'); });
  $('#clearLocal').addEventListener('click', function () {
    if (!confirm('Sudah commit database.sql terbaru ke repo? Perubahan lokal di browser ini akan dibuang lalu halaman dimuat ulang dari file.')) return;
    DB.clearLocalChanges(); location.reload();
  });

  // ---------- Render ----------
  function filtered() {
    var q = $('#q').value.trim().toLowerCase(), st = $('#fStatus').value;
    return orders.filter(function (o) {
      if (st && (o.status || 'baru') !== st) return false;
      if (!q) return true;
      return [o.id, o.name, o.phone, o.address].join(' ').toLowerCase().indexOf(q) > -1;
    });
  }
  function render() {
    var all = orders.filter(function (o) { return o.status !== 'batal'; });
    $('#stOrders').textContent = orders.length;
    $('#stBoxes').textContent = all.reduce(function (s, o) { return s + S.totalBox(o.items); }, 0);
    $('#stPcs').textContent = all.reduce(function (s, o) { return s + S.totalPcs(o.items); }, 0);
    $('#stRev').textContent = S.fmt(all.reduce(function (s, o) { return s + Number(o.total || 0); }, 0));

    var list = filtered();
    if (!list.length) {
      $('#orders').innerHTML = '<div class="empty-state"><img src="assets/img/box-empty.svg" alt="" width="200"><h2>Belum ada pesanan</h2><p class="muted">Pesanan yang masuk akan tampil di sini.</p></div>';
      return;
    }
    $('#orders').innerHTML = list.map(function (o) {
      var d = new Date(o.createdAt), st = o.status || 'baru';
      var items = o.items.map(function (it) {
        return '<li><span class="mini">' + DA.box(it.pkg, it.mode === 'campur' ? DA.randomFills(it.pkg, it.seed) : DA.fillsFromCounts(it.pkg, it.counts), { lid: false, seed: it.seed }) + '</span>' +
          '<div><b>' + it.qty + '× Box ' + DA.PACKAGES[it.pkg].name + '</b> <span class="chip ' + (it.mode === 'campur' ? 'chip-mix' : 'chip-set') + '">' + (it.mode === 'campur' ? 'Campur' : 'Atur') + '</span>' +
          '<small>' + esc(S.itemDetail(it)) + '</small></div><span class="ip">' + S.fmt(S.itemPrice(it)) + '</span></li>';
      }).join('');
      var link = S.reviewLink(o);
      var waCust = 'https://wa.me/' + String(o.phone).replace(/\D/g, '').replace(/^0/, '62') + '?text=' + encodeURIComponent('Halo ' + o.name + ', pesanan ' + (CFG.STORE_NAME || 'Donat Empuk') + ' #' + o.id + ' sudah kami terima. Total ' + S.fmt(o.total) + ' + ongkir: ');
      return '<article class="ocard st-b-' + esc(st) + '">' +
        '<div class="o-head"><div><b class="oid">#' + esc(o.id) + '</b><small>' + (isNaN(d) ? '' : d.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })) + '</small></div>' +
        '<label class="sel"><span class="sr">Status pesanan</span><select data-status="' + esc(o.id) + '">' +
        STATUS.map(function (s) { return '<option value="' + s + '"' + (s === st ? ' selected' : '') + '>' + s.charAt(0).toUpperCase() + s.slice(1) + '</option>'; }).join('') +
        '</select></label></div>' +
        '<div class="o-body"><dl class="o-cust"><div><dt>Nama</dt><dd>' + esc(o.name) + '</dd></div><div><dt>No. HP</dt><dd>' + esc(o.phone) + '</dd></div>' +
        '<div class="w"><dt>Alamat</dt><dd>' + esc(o.address) + '</dd></div>' + (o.note ? '<div class="w"><dt>Catatan</dt><dd>' + esc(o.note) + '</dd></div>' : '') + '</dl>' +
        '<ul class="o-items">' + items + '</ul></div>' +
        '<div class="o-foot"><div><small>' + S.totalBox(o.items) + ' box · ' + S.totalPcs(o.items) + ' pcs · belum ongkir</small><b>' + S.fmt(o.total) + '</b></div>' +
        '<div class="o-act"><a class="btn btn-sm btn-ghost" target="_blank" rel="noopener" href="' + esc(link) + '">Review</a>' +
        '<a class="btn btn-sm btn-wa" target="_blank" rel="noopener" href="' + esc(waCust) + '">WA pelanggan</a>' +
        '<button class="btn btn-sm btn-ghost" data-del="' + esc(o.id) + '">Hapus</button></div></div>' +
        '</article>';
    }).join('');
  }
  $('#orders').addEventListener('change', function (e) { var s = e.target.closest('[data-status]'); if (s) setStatus(s.getAttribute('data-status'), s.value); });
  $('#orders').addEventListener('click', function (e) { var b = e.target.closest('[data-del]'); if (b) del(b.getAttribute('data-del')); });
  $('#q').addEventListener('input', render);
  $('#fStatus').addEventListener('change', render);
  $('#refresh').addEventListener('click', function () { load(); toast('Data dimuat ulang'); });

  // ---------- Impor dari link ----------
  $('#impBtn').addEventListener('click', function () {
    var v = $('#impLink').value.trim();
    try {
      var u = new URL(v); var d = u.searchParams.get('d');
      if (!d) throw new Error();
      var o = S.decode(d);
      if (!o.id) throw new Error();
      if (S.getOrder(o.id)) { toast('Pesanan #' + o.id + ' sudah ada'); return; }
      S.saveOrder(o); $('#impLink').value = ''; toast('Pesanan #' + o.id + ' diimpor'); load();
    } catch (e) { toast('Link tidak valid'); }
  });

  // ---------- Export CSV ----------
  $('#exportCsv').addEventListener('click', function () {
    var rows = [['ID', 'Tanggal', 'Nama', 'No HP', 'Alamat', 'Catatan', 'Detail', 'Total Box', 'Total Pcs', 'Total Harga', 'Status']];
    filtered().forEach(function (o) {
      rows.push([o.id, o.createdAt, o.name, o.phone, o.address, o.note || '',
        o.items.map(function (it) { return it.qty + 'x Box ' + DA.PACKAGES[it.pkg].name + ' (' + (it.mode === 'campur' ? 'Campur' : S.itemDetail(it)) + ')'; }).join('; '),
        S.totalBox(o.items), S.totalPcs(o.items), o.total, o.status || 'baru']);
    });
    var csv = rows.map(function (r) { return r.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(','); }).join('\n');
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    a.download = 'pesanan-' + String(CFG.STORE_NAME || 'donat').toLowerCase().replace(/\s+/g, '-') + '.csv'; a.click();
  });

  // auto login dalam sesi yang sama
  var saved = ssGet();
  if (saved) tryLogin(saved).then(function () { pw = saved; enter(); }).catch(function () { ssSet(''); });
})();
