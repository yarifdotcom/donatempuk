/* =========================================================
   Store — format pesanan, link review, penyimpanan pesanan
   ========================================================= */
(function () {
  'use strict';
  var CFG = window.APP_CONFIG || {};
  var DA = window.DonutArt;
  var LS_ORDERS = 'donatempuk_orders_v1';
  var LS_CART = 'donatempuk_cart_v1';

  function fmt(n) { return (CFG.CURRENCY || 'Rp') + ' ' + Number(n || 0).toLocaleString('id-ID'); }
  function fmtK(n) { return Math.round(n / 1000) + 'K'; }

  function itemLabel(it) {
    var p = DA.PACKAGES[it.pkg];
    return 'Box ' + p.name + ' (' + (it.mode === 'campur' ? 'Campur' : 'Atur sendiri') + ')';
  }
  function itemDetail(it) {
    if (it.mode === 'campur' || !it.counts) return 'Topping campur aneka rasa';
    return DA.ORDER.filter(function (k) { return it.counts[k] > 0; })
      .map(function (k) { return DA.TOPPINGS[k].name + ' ' + it.counts[k]; }).join(', ');
  }
  function itemPrice(it) { return DA.PACKAGES[it.pkg].price * it.qty; }
  function total(items) { return items.reduce(function (s, it) { return s + itemPrice(it); }, 0); }
  function totalPcs(items) { return items.reduce(function (s, it) { return s + Number(it.pkg) * it.qty; }, 0); }
  function totalBox(items) { return items.reduce(function (s, it) { return s + it.qty; }, 0); }

  // ---------- encode / decode untuk link review ----------
  function b64e(str) {
    var b = btoa(unescape(encodeURIComponent(str)));
    return b.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function b64d(s) {
    s = s.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    return decodeURIComponent(escape(atob(s)));
  }
  function encode(o) {
    var c = {
      i: o.id, t: o.createdAt, n: o.name, p: o.phone, a: o.address, o: o.note || '',
      x: o.items.map(function (it) {
        return [it.pkg, it.mode === 'campur' ? 'c' : 'a', it.qty,
          it.counts ? DA.ORDER.map(function (k) { return it.counts[k] || 0; }) : 0, it.seed || 1];
      })
    };
    return b64e(JSON.stringify(c));
  }
  function decode(s) {
    var c = JSON.parse(b64d(s));
    var items = (c.x || []).map(function (a) {
      var counts = null;
      if (Array.isArray(a[3])) { counts = {}; DA.ORDER.forEach(function (k, i) { counts[k] = a[3][i] || 0; }); }
      return { pkg: String(a[0]), mode: a[1] === 'c' ? 'campur' : 'atur', qty: a[2], counts: counts, seed: a[4] || 1 };
    });
    return { id: c.i, createdAt: c.t, name: c.n, phone: c.p, address: c.a, note: c.o, items: items, total: total(items), status: 'baru' };
  }

  function baseUrl() {
    var s = (CFG.SITE_URL || '').trim();
    if (s) return s.charAt(s.length - 1) === '/' ? s : s + '/';
    var u = location.href.split('#')[0].split('?')[0];
    return u.substring(0, u.lastIndexOf('/') + 1);
  }
  function reviewLink(o) { return baseUrl() + 'order.html?id=' + encodeURIComponent(o.id) + '&d=' + encode(o); }

  function waText(o, link) {
    var L = [];
    L.push('Halo ' + (CFG.STORE_NAME || 'Donat Empuk') + ', saya mau pesan donat.');
    L.push('');
    L.push('*PESANAN #' + o.id + '*');
    L.push('Nama   : ' + o.name);
    L.push('No. HP : ' + o.phone);
    L.push('Alamat : ' + o.address);
    if (o.note) L.push('Catatan: ' + o.note);
    L.push('');
    L.push('*Detail:*');
    o.items.forEach(function (it) {
      L.push('- ' + it.qty + 'x Box ' + DA.PACKAGES[it.pkg].name + ' (' + (it.mode === 'campur' ? 'Campur' : itemDetail(it)) + ')');
    });
    L.push('');
    L.push('Total: ' + totalBox(o.items) + ' box / ' + totalPcs(o.items) + ' pcs');
    L.push('*Total harga: ' + fmt(o.total) + '*');
    L.push('_(belum termasuk ongkir)_');
    L.push('');
    L.push('Review pesanan: ' + link);
    return L.join('\n');
  }
  function waLink(o, link) {
    return 'https://wa.me/' + String(CFG.WA_NUMBER || '').replace(/\D/g, '') + '?text=' + encodeURIComponent(waText(o, link));
  }

  function newId() {
    var d = new Date();
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return (CFG.ORDER_PREFIX || 'DE') + String(d.getFullYear()).slice(2) + p(d.getMonth() + 1) + p(d.getDate()) + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
  }

  // ---------- localStorage (aman) ----------
  function lsGet(k, def) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch (e) { return def; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }

  // =========================================================
  //  PENGATURAN TOKO (harga & ketersediaan) — Firebase + default
  // =========================================================
  var DEFAULTS = (function () {
    var d = { packages: {}, toppings: {} };
    Object.keys(DA.PACKAGES).forEach(function (k) { d.packages[k] = { name: DA.PACKAGES[k].name, price: DA.PACKAGES[k].price, available: true }; });
    DA.ORDER.forEach(function (k) { d.toppings[k] = { name: DA.TOPPINGS[k].name, available: true }; });
    return d;
  })();
  var settings = JSON.parse(JSON.stringify(DEFAULTS)), settingsSource = 'default';

  function mergeSettings(s) {
    var out = JSON.parse(JSON.stringify(DEFAULTS));
    if (s && s.packages) Object.keys(out.packages).forEach(function (k) {
      var p = s.packages[k]; if (!p) return;
      if (typeof p.price === 'number' && p.price >= 0) out.packages[k].price = Math.round(p.price);
      if (typeof p.name === 'string' && p.name) out.packages[k].name = p.name;
      if (typeof p.available === 'boolean') out.packages[k].available = p.available;
    });
    if (s && s.toppings) Object.keys(out.toppings).forEach(function (k) {
      var t = s.toppings[k]; if (!t) return;
      if (typeof t.name === 'string' && t.name) out.toppings[k].name = t.name;
      if (typeof t.available === 'boolean') out.toppings[k].available = t.available;
    });
    return out;
  }
  function applySettings(s) {
    settings = s;
    Object.keys(s.packages).forEach(function (k) {
      var P = DA.PACKAGES[k]; P.price = s.packages[k].price; P.name = s.packages[k].name; P.available = s.packages[k].available;
    });
    DA.ORDER.forEach(function (k) { DA.TOPPINGS[k].name = s.toppings[k].name; DA.TOPPINGS[k].available = s.toppings[k].available; });
  }
  function loadSettings() {
    if (!window.FB) return Promise.resolve(false);
    return FB.ready().then(function (on) {
      if (!on) throw FB.error();
      return FB.getSettings();
    }).then(function (s) {
      applySettings(mergeSettings(s)); settingsSource = s ? 'firebase' : 'default-empty'; return true;
    }).catch(function (e) {
      console.warn('[Settings] pakai default:', e && e.message);
      applySettings(JSON.parse(JSON.stringify(DEFAULTS))); settingsSource = 'default'; return false;
    });
  }
  function saveSettings(s) {
    var m = mergeSettings(s);
    return FB.saveSettings(m).then(function () { applySettings(m); settingsSource = 'firebase'; });
  }
  var readyP = null;
  function ready() { return readyP || (readyP = loadSettings()); }

  // =========================================================
  //  PESANAN — Firebase utama, localStorage sebagai cadangan
  // =========================================================
  function cloudOn() { return !!(window.FB && FB.isOk()); }
  function localAll() { return lsGet(LS_ORDERS, []); }
  function localPut(o) {
    var all = localAll().filter(function (x) { return x.id !== o.id; });
    all.unshift(o); all.sort(function (a, b) { return String(b.createdAt).localeCompare(String(a.createdAt)); });
    lsSet(LS_ORDERS, all.slice(0, 500));
  }
  function localPatch(id, patch) { lsSet(LS_ORDERS, localAll().map(function (x) { return x.id === id ? Object.assign({}, x, patch) : x; })); }
  function localDel(id) { lsSet(LS_ORDERS, localAll().filter(function (x) { return x.id !== id; })); }

  // Simpan pesanan: selalu backup lokal, lalu kirim ke Firebase
  function saveOrder(o) {
    var rec = Object.assign({}, o, { synced: false });
    localPut(rec);
    return ready().then(function () { return FB.createOrder(rec); })
      .then(function () { localPatch(o.id, { synced: true }); return { cloud: true }; })
      .catch(function (e) { console.warn('[Order] tersimpan lokal saja:', e && e.message); return { cloud: false, error: e }; });
  }
  // Daftar pesanan (admin): Firebase + pesanan lokal yang belum tersinkron
  function listOrders() {
    return ready().then(function () { return FB.listOrders(); }).then(function (cloud) {
      var ids = {}; cloud.forEach(function (o) { ids[o.id] = 1; });
      var pending = localAll().filter(function (o) { return !ids[o.id] || o.synced === false; });
      pending.forEach(function (o) { if (ids[o.id]) cloud = cloud.filter(function (c) { return c.id !== o.id; }); });
      return { orders: pending.concat(cloud).sort(function (a, b) { return String(b.createdAt).localeCompare(String(a.createdAt)); }), cloud: true };
    }).catch(function (e) {
      return { orders: localAll(), cloud: false, error: e };
    });
  }
  function getOrder(id) {
    var local = localAll().filter(function (x) { return x.id === id; })[0] || null;
    return ready().then(function () { return FB.getOrder(id); })
      .then(function (o) { return o || local; })
      .catch(function () { return local; });
  }
  function setStatus(id, st) {
    localPatch(id, { status: st });
    return ready().then(function () { return FB.setStatus(id, st); }).then(function () { return { cloud: true }; })
      .catch(function (e) { localPatch(id, { synced: false }); return { cloud: false, error: e }; });
  }
  function deleteOrder(id) {
    localDel(id);
    return ready().then(function () { return FB.deleteOrder(id); }).then(function () { return { cloud: true }; }).catch(function (e) { return { cloud: false, error: e }; });
  }
  // Kirim semua pesanan lokal yang belum tersinkron ke Firebase
  function syncPending(orders) {
    var list = (orders || localAll()).filter(function (o) { return o.synced === false; });
    var done = 0;
    return list.reduce(function (p, o) {
      return p.then(function () {
        return FB.createOrder(o).then(function () { localPatch(o.id, { synced: true }); done++; });
      });
    }, Promise.resolve()).then(function () { return done; }, function (e) { e.done = done; throw e; });
  }
  function importOrder(o) {
    o.synced = false; o.source = 'import';
    if (!localAll().some(function (x) { return x.id === o.id; })) localPut(o);
    return ready().then(function () { return FB.createOrder(o); }).then(function () { localPatch(o.id, { synced: true }); return { cloud: true }; })
      .catch(function (e) { return { cloud: false, error: e }; });
  }
  function localBackup() { return localAll(); }
  function restoreBackup(list) { list.forEach(function (o) { if (o && o.id && Array.isArray(o.items)) localPut(Object.assign({ synced: false }, o)); }); }

  // Terapkan nama brand dari config ke elemen bertanda data-brand
  function applyBrand() {
    var name = CFG.STORE_NAME || 'Donat Empuk';
    var parts = name.split(' '), last = parts.length > 1 ? parts.pop() : '';
    Array.prototype.forEach.call(document.querySelectorAll('[data-brand]'), function (el) {
      if (el.getAttribute('data-brand') === 'split' && last) {
        el.textContent = parts.join(' ') + ' ';
        var b = document.createElement('b'); b.textContent = last; el.appendChild(b);
      } else el.textContent = name;
    });
    document.title = document.title.replace(/Donat Empuk/g, name);
  }
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', applyBrand); else applyBrand();
  }

  window.Store = {
    fmt: fmt, fmtK: fmtK, itemLabel: itemLabel, itemDetail: itemDetail, itemPrice: itemPrice,
    total: total, totalPcs: totalPcs, totalBox: totalBox,
    encode: encode, decode: decode, reviewLink: reviewLink, waText: waText, waLink: waLink, newId: newId,
    lsGet: lsGet, lsSet: lsSet, LS_CART: LS_CART,
    ready: ready, cloudOn: cloudOn,
    getSettings: function () { return settings; }, settingsSource: function () { return settingsSource; },
    defaults: function () { return JSON.parse(JSON.stringify(DEFAULTS)); }, saveSettings: saveSettings,
    listOrders: listOrders, getOrder: getOrder, saveOrder: saveOrder, setStatus: setStatus, deleteOrder: deleteOrder,
    syncPending: syncPending, importOrder: importOrder, localBackup: localBackup, restoreBackup: restoreBackup
  };
})();
