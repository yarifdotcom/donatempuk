/* =========================================================
   Donat Empuk — Admin view (Firebase + cadangan lokal)
   Password: ADMIN_PASSWORD di assets/js/config.js
   ========================================================= */
(function () {
  'use strict';
  var DA = window.DonutArt, S = window.Store, CFG = window.APP_CONFIG;
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  var SESSION = 'donatempuk_admin';
  var orders = [], cloud = false;
  var STATUS = ['baru', 'diproses', 'dikirim', 'selesai', 'batal'];

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function toast(m) { var t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove('show'); }, 2600); }
  function ssGet() { try { return sessionStorage.getItem(SESSION) || ''; } catch (e) { return ''; } }
  function ssSet(v) { try { v ? sessionStorage.setItem(SESSION, v) : sessionStorage.removeItem(SESSION); } catch (e) { /* abaikan */ } }
  function copy(text) {
    return (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject())
      .catch(function () { var t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove(); });
  }
  function download(name, data, type) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([data], { type: type }));
    a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  function slug() { return String(CFG.STORE_NAME || 'donat').toLowerCase().replace(/\s+/g, '-'); }
  function stamp() { return new Date().toISOString().slice(0, 10); }

  // ---------- Login ----------
  function tryLogin(p) {
    if (FB.usesAuth()) {
      return S.ready().then(function () {
        if (FB.isOk()) return FB.signIn($('#em').value, p);
        // Firebase mati: buka data cadangan lokal dengan password cadangan
        if (p === String(CFG.ADMIN_PASSWORD)) return true;
        throw new Error('Firebase tidak bisa dihubungi');
      });
    }
    return p === String(CFG.ADMIN_PASSWORD) ? Promise.resolve(true) : Promise.reject(new Error('Password salah'));
  }
  function enter() {
    $('#login').hidden = true; $('#dash').hidden = false;
    S.ready().then(function () { load(); renderSettings(); });
  }
  $('#loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var p = $('#pw').value;
    tryLogin(p).then(function () { ssSet(FB.usesAuth() ? '1' : p); enter(); })
      .catch(function (err) {
        var m = err && err.message || '';
        $('#loginErr').textContent = FB.usesAuth()
          ? (/bukan admin/.test(m) ? 'Email ini tidak terdaftar sebagai admin.'
            : /tidak bisa dihubungi/.test(m) ? 'Firebase tidak bisa dihubungi. Masukkan password cadangan untuk membuka data lokal.'
            : 'Email atau password salah.')
          : 'Password salah.';
        $('#pw').select();
      });
  });
  $('#logout').addEventListener('click', function () { ssSet(''); FB.signOut().then(function () { location.reload(); }); });

  // ---------- Tabs ----------
  $$('[data-tabbtn]').forEach(function (b) {
    b.addEventListener('click', function () {
      var t = b.getAttribute('data-tabbtn');
      $$('[data-tabbtn]').forEach(function (x) { var on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-selected', String(on)); });
      $('#tab-orders').hidden = t !== 'orders'; $('#tab-settings').hidden = t !== 'settings';
    });
  });

  // ---------- Data pesanan ----------
  function info() {
    var mi = $('#modeInfo');
    if (cloud) {
      mi.className = 'mode-info ok';
      mi.innerHTML = 'Terhubung ke <b>Firebase</b> (' + esc(CFG.FIREBASE_CONFIG.projectId) + '). Menampilkan maks. ' + (CFG.ADMIN_LIST_LIMIT || 200) + ' pesanan terbaru.';
    } else {
      mi.className = 'mode-info bad';
      mi.innerHTML = '<b>Firebase tidak tersedia</b> (' + esc((FB.error() && FB.error().message) || 'koneksi/kuota') + '). Mode cadangan: data dari browser ini. Pesanan baru bisa diimpor lewat link WhatsApp.';
    }
    var pend = orders.filter(function (o) { return o.synced === false; }).length;
    $('#syncBar').hidden = !pend;
    $('#syncText').textContent = pend + ' pesanan/perubahan belum tersimpan di Firebase';
    $('#syncBtn').disabled = !cloud;
  }
  function load() {
    return S.listOrders().then(function (r) { orders = r.orders; cloud = r.cloud; render(); info(); });
  }
  function after(res, okMsg) {
    toast(res && res.cloud ? okMsg : okMsg + ' (tersimpan lokal, sinkronkan nanti)');
    return load();
  }
  function setStatus(id, st) { S.setStatus(id, st).then(function (r) { after(r, 'Status diperbarui'); }); }
  function del(id) {
    if (!confirm('Hapus pesanan #' + id + '?')) return;
    S.deleteOrder(id).then(function (r) { after(r, 'Pesanan dihapus'); });
  }
  $('#syncBtn').addEventListener('click', function () {
    var b = $('#syncBtn'); b.disabled = true; b.textContent = 'Menyinkronkan…';
    S.syncPending(orders).then(function (n) { toast(n + ' pesanan tersinkron'); })
      .catch(function (e) { toast('Sinkron berhenti (' + (e.done || 0) + ' berhasil): ' + e.message); })
      .then(function () { b.textContent = 'Sinkronkan ke Firebase'; load(); });
  });

  // ---------- Render pesanan ----------
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
    $('#stBoxes').textContent = all.reduce(function (s, o) { return s + S.totalBox(o.items); }, 0) + ' · ' + all.reduce(function (s, o) { return s + S.totalBottles(o.items); }, 0);
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
        return '<li><span class="mini">' + S.itemArt(it, { lid: false }) + '</span>' +
          '<div><b>' + it.qty + '× ' + esc(S.itemTitle(it)) + '</b> ' + S.itemChip(it) +
          '<small>' + esc(S.itemDetail(it)) + '</small></div></li>';
      }).join('');
      var waCust = 'https://wa.me/' + String(o.phone).replace(/\D/g, '').replace(/^0/, '62') + '?text=' + encodeURIComponent('Halo ' + o.name + ', pesanan ' + (CFG.STORE_NAME || 'Donat Empuk') + ' #' + o.id + ' sudah kami terima. Total ' + S.fmt(o.total) + ' + ongkir: ');
      return '<article class="ocard st-b-' + esc(st) + '">' +
        '<div class="o-head"><div><b class="oid">#' + esc(o.id) + (o.synced === false ? '<span class="badge-local">Lokal</span>' : '') + '</b><small>' + (isNaN(d) ? '' : d.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })) + '</small></div>' +
        '<label class="sel"><span class="sr">Status pesanan</span><select data-status="' + esc(o.id) + '">' +
        STATUS.map(function (s) { return '<option value="' + s + '"' + (s === st ? ' selected' : '') + '>' + s.charAt(0).toUpperCase() + s.slice(1) + '</option>'; }).join('') +
        '</select></label></div>' +
        '<div class="o-body"><dl class="o-cust"><div><dt>Nama</dt><dd>' + esc(o.name) + '</dd></div><div><dt>No. HP</dt><dd>' + esc(o.phone) + '</dd></div>' +
        '<div class="w"><dt>Alamat</dt><dd>' + esc(o.address) + '</dd></div>' + (o.note ? '<div class="w"><dt>Catatan</dt><dd>' + esc(o.note) + '</dd></div>' : '') + '</dl>' +
        '<ul class="o-items">' + items + '</ul></div>' +
        '<div class="o-foot"><div><small>' + esc(S.summary(o.items)) + ' · belum ongkir</small><b>' + S.fmt(o.total) + '</b></div>' +
        '<div class="o-act"><a class="btn btn-sm btn-ghost" target="_blank" rel="noopener" href="' + esc(S.reviewLink(o)) + '">Review</a>' +
        '<button class="btn btn-sm btn-ghost" data-copy="' + esc(o.id) + '">Salin link</button>' +
        '<a class="btn btn-sm btn-wa" target="_blank" rel="noopener" href="' + esc(waCust) + '">WA pelanggan</a>' +
        '<button class="btn btn-sm btn-ghost" data-del="' + esc(o.id) + '">Hapus</button></div></div>' +
        '</article>';
    }).join('');
  }
  $('#orders').addEventListener('change', function (e) { var s = e.target.closest('[data-status]'); if (s) setStatus(s.getAttribute('data-status'), s.value); });
  $('#orders').addEventListener('click', function (e) {
    var b = e.target.closest('[data-del]'); if (b) return del(b.getAttribute('data-del'));
    var c = e.target.closest('[data-copy]');
    if (c) {
      var o = orders.filter(function (x) { return x.id === c.getAttribute('data-copy'); })[0];
      if (o) copy(S.reviewLink(o)).then(function () { toast('Link review #' + o.id + ' disalin'); });
    }
  });
  $('#q').addEventListener('input', render);
  $('#fStatus').addEventListener('change', render);
  $('#refresh').addEventListener('click', function () { load().then(function () { toast('Data dimuat ulang'); }); });

  // ---------- Impor link & backup ----------
  $('#impBtn').addEventListener('click', function () {
    var v = $('#impLink').value.trim(), o;
    try {
      var d = new URL(v).searchParams.get('d');
      o = d && S.decode(d);
      if (!o || !o.id) throw new Error();
    } catch (e) { toast('Link tidak valid'); return; }
    if (orders.some(function (x) { return x.id === o.id; })) { toast('Pesanan #' + o.id + ' sudah ada'); return; }
    S.importOrder(o).then(function (r) { $('#impLink').value = ''; after(r, 'Pesanan #' + o.id + ' diimpor'); });
  });
  $('#backupJson').addEventListener('click', function () {
    var data = { app: CFG.STORE_NAME, exportedAt: new Date().toISOString(), orders: orders, settings: S.getSettings() };
    download('backup-' + slug() + '-' + stamp() + '.json', JSON.stringify(data, null, 2), 'application/json');
  });
  $('#restoreJson').addEventListener('change', function (e) {
    var f = e.target.files[0]; if (!f) return;
    f.text().then(function (t) {
      var j = JSON.parse(t), list = Array.isArray(j) ? j : j.orders;
      if (!Array.isArray(list)) throw new Error('format');
      var known = {}; orders.forEach(function (o) { known[o.id] = 1; });
      var fresh = list.filter(function (o) { return o && o.id && !known[o.id]; });
      S.restoreBackup(fresh);
      toast(fresh.length + ' pesanan dipulihkan ke lokal. Klik "Sinkronkan" untuk kirim ke Firebase.');
      return load();
    }).catch(function () { toast('File backup tidak valid'); });
    e.target.value = '';
  });
  $('#exportCsv').addEventListener('click', function () {
    var rows = [['ID', 'Tanggal', 'Nama', 'No HP', 'Alamat', 'Catatan', 'Detail', 'Total Box', 'Total Pcs', 'Botol Madu', 'Total Harga', 'Status']];
    filtered().forEach(function (o) {
      rows.push([o.id, o.createdAt, o.name, o.phone, o.address, o.note || '',
        o.items.map(function (it) { return it.qty + 'x ' + S.itemTitle(it) + (S.isHoney(it) ? '' : ' (' + S.itemShort(it) + ')'); }).join('; '),
        S.totalBox(o.items), S.totalPcs(o.items), S.totalBottles(o.items), o.total, o.status || 'baru']);
    });
    var csv = rows.map(function (r) { return r.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(','); }).join('\n');
    download('pesanan-' + slug() + '-' + stamp() + '.csv', '﻿' + csv, 'text/csv;charset=utf-8');
  });

  // ---------- Pengaturan harga & ketersediaan ----------
  function renderSettings(src) {
    var st = src || S.getSettings(), from = S.settingsSource();
    $('#setSrc').textContent = !S.cloudOn()
      ? 'Firebase tidak tersedia — website memakai harga default dan semua topping tersedia. Perubahan belum bisa disimpan.'
      : (from === 'firebase' ? 'Pengaturan dimuat dari Firebase.' : 'Belum ada pengaturan di Firebase — website memakai default. Klik "Simpan ke Firebase" untuk membuatnya.');
    $('#setSave').disabled = !S.cloudOn();
    $('#setPackages').innerHTML = Object.keys(st.packages).sort(function (a, b) { return b - a; }).map(function (k) {
      var p = st.packages[k], P = DA.PACKAGES[k];
      return '<div class="set-row" data-pkg="' + k + '">' +
        '<span class="sw">' + DA.box(k, DA.randomFills(k, 5), { lid: false }) + '</span>' +
        '<span class="nm">Box ' + esc(p.name) + '<small>' + P.rows + ' × ' + P.cols + ' · ' + (P.rows * P.cols) + ' pcs</small></span>' +
        '<label class="price-in"><span>Rp</span><input type="number" min="0" step="500" inputmode="numeric" data-price="' + k + '" value="' + p.price + '" aria-label="Harga box ' + esc(p.name) + '"></label>' +
        '<label class="switch"><input type="checkbox" data-pavail="' + k + '"' + (p.available ? ' checked' : '') + '><span class="tr"></span><span class="lb">' + (p.available ? 'Tersedia' : 'Tidak dijual') + '</span></label>' +
        '</div>';
    }).join('');
    $('#setToppings').innerHTML = DA.ORDER.map(function (k) {
      var t = st.toppings[k];
      return '<div class="set-row">' +
        '<span class="sw">' + DA.single(k, 3) + '</span>' +
        '<span class="nm">' + esc(t.name) + '</span>' +
        '<label class="switch"><input type="checkbox" data-tavail="' + k + '"' + (t.available ? ' checked' : '') + '><span class="tr"></span><span class="lb">' + (t.available ? 'Tersedia' : 'Habis') + '</span></label>' +
        '</div>';
    }).join('');
    renderHoneySettings(st);
  }
  function renderHoneySettings(st) {
    $('#setHoney').innerHTML = DA.HONEY_ORDER.map(function (k) {
      var h = st.honey[k];
      return '<div class="hset-row">' +
        '<span class="sw">' + DA.bottle(k, '500') + '</span>' +
        '<div class="hset-main">' +
          '<div class="hset-top"><span class="nm">Madu ' + esc(h.name) + '</span>' +
          '<label class="switch"><input type="checkbox" data-havail="' + k + '"' + (h.available ? ' checked' : '') + '><span class="tr"></span><span class="lb">' + (h.available ? 'Tersedia' : 'Habis') + '</span></label></div>' +
          '<div class="hset-sizes">' + Object.keys(h.sizes).sort(function (a, b) { return b - a; }).map(function (z) {
            var v = h.sizes[z];
            return '<div class="hset-size"><b>' + z + ' gr</b>' +
              '<label class="price-in"><span>Rp</span><input type="number" min="0" step="1000" inputmode="numeric" data-hprice="' + k + ':' + z + '" value="' + v.price + '" aria-label="Harga Madu ' + esc(h.name) + ' ' + z + ' gram"></label>' +
              '<label class="switch sm"><input type="checkbox" data-hsavail="' + k + ':' + z + '"' + (v.available ? ' checked' : '') + '><span class="tr"></span><span class="lb">' + (v.available ? 'Ada' : 'Habis') + '</span></label></div>';
          }).join('') + '</div>' +
        '</div></div>';
    }).join('');
  }
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t.matches('[data-pavail],[data-tavail]')) {
      t.parentNode.querySelector('.lb').textContent = t.checked ? 'Tersedia' : (t.hasAttribute('data-pavail') ? 'Tidak dijual' : 'Habis');
    }
    if (t.matches('[data-havail]')) t.parentNode.querySelector('.lb').textContent = t.checked ? 'Tersedia' : 'Habis';
    if (t.matches('[data-hsavail]')) t.parentNode.querySelector('.lb').textContent = t.checked ? 'Ada' : 'Habis';
  });
  function readForm() {
    var st = S.defaults();
    Object.keys(st.packages).forEach(function (k) {
      var v = parseInt($('[data-price="' + k + '"]').value, 10);
      st.packages[k].price = isNaN(v) || v < 0 ? st.packages[k].price : v;
      st.packages[k].available = $('[data-pavail="' + k + '"]').checked;
    });
    DA.ORDER.forEach(function (k) { st.toppings[k].available = $('[data-tavail="' + k + '"]').checked; });
    Object.keys(st.honey).forEach(function (k) {
      st.honey[k].available = $('[data-havail="' + k + '"]').checked;
      Object.keys(st.honey[k].sizes).forEach(function (z) {
        var v = parseInt($('[data-hprice="' + k + ':' + z + '"]').value, 10);
        if (!isNaN(v) && v >= 0) st.honey[k].sizes[z].price = v;
        st.honey[k].sizes[z].available = $('[data-hsavail="' + k + ':' + z + '"]').checked;
      });
    });
    return st;
  }
  $('#setSave').addEventListener('click', function () {
    var b = $('#setSave'); b.disabled = true; b.textContent = 'Menyimpan…';
    S.saveSettings(readForm()).then(function () { toast('Pengaturan tersimpan di Firebase'); renderSettings(); render(); })
      .catch(function (e) { toast('Gagal menyimpan: ' + e.message); })
      .then(function () { b.disabled = !S.cloudOn(); b.textContent = 'Simpan ke Firebase'; });
  });
  $('#setReset').addEventListener('click', function () { renderSettings(S.defaults()); toast('Form dikembalikan ke default. Klik Simpan untuk menerapkan.'); });

  // tampilkan kolom email jika mode aman aktif
  if (FB.usesAuth()) { $('#emailField').hidden = false; $('#em').required = true; }

  // auto login dalam sesi yang sama
  var saved = ssGet();
  if (saved) {
    if (FB.usesAuth()) S.ready().then(function () { return FB.currentAdmin(); }).then(function (em) { if (em) enter(); else ssSet(''); });
    else tryLogin(saved).then(enter).catch(function () { ssSet(''); });
  }
})();
