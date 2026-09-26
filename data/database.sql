-- =========================================================
--  Donat Empuk — database SQLite
--  File ini dibaca LANGSUNG oleh website (sql.js di browser).
--  Tidak perlu hosting / PHP / MySQL.
--
--  Ubah harga / nama paket / nama topping di sini, commit,
--  dan website langsung memakai data baru.
--
--  Pesanan baru: admin klik "Download database.sql" di admin.html,
--  lalu ganti file ini dengan hasil download dan commit.
-- =========================================================
PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;

-- ---------- Paket box ----------
DROP TABLE IF EXISTS packages;
CREATE TABLE packages (
  id        TEXT    PRIMARY KEY,            -- '12', '6', '2'
  name      TEXT    NOT NULL,
  pcs       INTEGER NOT NULL,
  box_rows  INTEGER NOT NULL,
  box_cols  INTEGER NOT NULL,
  price     INTEGER NOT NULL                -- rupiah
);
INSERT INTO packages (id, name, pcs, box_rows, box_cols, price) VALUES ('12', 'Isi 12', 12, 3, 4, 34000);
INSERT INTO packages (id, name, pcs, box_rows, box_cols, price) VALUES ('6', 'Isi 6', 6, 2, 3, 17000);
INSERT INTO packages (id, name, pcs, box_rows, box_cols, price) VALUES ('2', 'Isi 2', 2, 1, 2, 9000);

-- ---------- Topping ----------
DROP TABLE IF EXISTS toppings;
CREATE TABLE toppings (
  id         TEXT    PRIMARY KEY,
  name       TEXT    NOT NULL,
  color_hex  TEXT    NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);
INSERT INTO toppings (id, name, color_hex, sort_order) VALUES ('vanila', 'Vanila', '#FFF0C7', 1);
INSERT INTO toppings (id, name, color_hex, sort_order) VALUES ('coklat', 'Coklat', '#5B2F1C', 2);
INSERT INTO toppings (id, name, color_hex, sort_order) VALUES ('matcha', 'Matcha', '#8DC255', 3);
INSERT INTO toppings (id, name, color_hex, sort_order) VALUES ('strowberi', 'Strowberi', '#FF7DB2', 4);
INSERT INTO toppings (id, name, color_hex, sort_order) VALUES ('redvelvet', 'Red Velvet', '#C8102E', 5);
INSERT INTO toppings (id, name, color_hex, sort_order) VALUES ('oreo', 'Oreo', '#2E2926', 6);

-- ---------- Pesanan ----------
DROP TABLE IF EXISTS orders;
CREATE TABLE orders (
  id          TEXT    PRIMARY KEY,          -- contoh: DE260927-AB12
  created_at  TEXT    NOT NULL,             -- ISO 8601
  name        TEXT    NOT NULL,
  phone       TEXT    NOT NULL,
  address     TEXT    NOT NULL,
  note        TEXT,
  total       INTEGER NOT NULL,             -- belum termasuk ongkir
  status      TEXT    NOT NULL DEFAULT 'baru'
              CHECK (status IN ('baru','diproses','dikirim','selesai','batal'))
);

-- ---------- Isi pesanan ----------
-- mode 'campur' => counts_json NULL
-- mode 'atur'   => counts_json contoh {"coklat":2,"matcha":4}
DROP TABLE IF EXISTS order_items;
CREATE TABLE order_items (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id    TEXT    NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  package_id  TEXT    NOT NULL REFERENCES packages(id),
  mode        TEXT    NOT NULL CHECK (mode IN ('campur','atur')),
  qty         INTEGER NOT NULL DEFAULT 1,
  counts_json TEXT,
  seed        INTEGER NOT NULL DEFAULT 1,   -- untuk menggambar ulang visual box campur
  subtotal    INTEGER NOT NULL
);
CREATE INDEX idx_orders_created ON orders(created_at);
CREATE INDEX idx_items_order ON order_items(order_id);

COMMIT;
PRAGMA foreign_keys = ON;
