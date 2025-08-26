const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

let dbPromise;
async function getDb() {
  if (!dbPromise) {
    dbPromise = open({
      filename: process.env.SQLITE_FILE || path.join(__dirname, '../../dev.sqlite'),
      driver: sqlite3.Database
    }).then(async db => {
      await db.run('PRAGMA foreign_keys = ON;');
      return db;
    });
  }
  return dbPromise;
}

function buildFilterWhereSql(filters, params) {
  const where = [];
  if (filters.search) {
    where.push('(name LIKE ? OR sku LIKE ?)');
    params.push(`%${filters.search}%`, `%${filters.search}%`);
  }
  if (filters.minQty != null) {
    where.push('quantity >= ?');
    params.push(filters.minQty);
  }
  if (filters.maxQty != null) {
    where.push('quantity <= ?');
    params.push(filters.maxQty);
  }
  return where.length ? 'WHERE ' + where.join(' AND ') : '';
}

function applyOrder(sort) {
  const map = {
    id_asc: 'id ASC',
    id_desc: 'id DESC',
    name_asc: 'name ASC',
    name_desc: 'name DESC',
    price_asc: 'price ASC',
    price_desc: 'price DESC',
    qty_asc: 'quantity ASC',
    qty_desc: 'quantity DESC'
  };
  return map[sort] || map['id_asc'];
}

async function getAllProducts({ skip = 0, take = 25, filters = {}, sort = 'id_asc' } = {}) {
  const db = await getDb();
  const params = [];
  const where = buildFilterWhereSql(filters, params);
  const order = applyOrder(sort);
  const totalRow = await db.get(`SELECT COUNT(*) as total FROM Products ${where}`, params);
  const total = totalRow.total || 0;
  const items = await db.all(
    `SELECT * FROM Products ${where} ORDER BY ${order} LIMIT ? OFFSET ?`,
    ...params, take, skip
  );
  return { items, total };
}

async function getProductById(id) {
  const db = await getDb();
  return db.get('SELECT * FROM Products WHERE id = ?', [id]);
}

async function createProduct({ sku, name, description, price, quantity }) {
  const db = await getDb();
  const res = await db.run(
    `INSERT INTO Products (sku,name,description,price,quantity,created_at,updated_at)
     VALUES (?,?,?,?,?,datetime('now'),datetime('now'))`,
    [sku, name, description, price, quantity]
  );
  return getProductById(res.lastID);
}

async function updateProduct(id, { sku, name, description, price, quantity }) {
  const db = await getDb();
  await db.run(
    `UPDATE Products SET sku=?, name=?, description=?, price=?, quantity=?, updated_at=datetime('now') WHERE id=?`,
    [sku, name, description, price, quantity, id]
  );
  return getProductById(id);
}

async function deleteProduct(id) {
  const db = await getDb();
  await db.run('DELETE FROM Products WHERE id = ?', [id]);
}

async function adjustInventory(productId, type, qty, note) {
  if (!['in','out'].includes(type)) throw new Error('Invalid type');
  const db = await getDb();
  try {
    await db.exec('BEGIN TRANSACTION;');
    await db.run(
      `INSERT INTO InventoryTransactions (product_id,type,qty,note,created_at) VALUES (?,?,?,?,datetime('now'))`,
      [productId, type, qty, note]
    );
    const delta = type === 'in' ? qty : -qty;
    await db.run('UPDATE Products SET quantity = quantity + ?, updated_at = datetime(\'now\') WHERE id = ?', [delta, productId]);
    await db.exec('COMMIT;');
  } catch (err) {
    await db.exec('ROLLBACK;');
    throw err;
  }
}

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  adjustInventory
};
