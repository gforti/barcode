const { sql, getPool } = require('../db/mssql');

function buildFilterWhere(filters, inputs) {
  const where = [];
  if (filters.search) {
    where.push('(name LIKE @search OR sku LIKE @search)');
    inputs.search = `%${filters.search}%`;
  }
  if (filters.minQty != null) {
    where.push('quantity >= @minQty');
    inputs.minQty = filters.minQty;
  }
  if (filters.maxQty != null) {
    where.push('quantity <= @maxQty');
    inputs.maxQty = filters.maxQty;
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
  const pool = await getPool();
  const inputs = {};
  const where = buildFilterWhere(filters, inputs);
  const order = applyOrder(sort);

  // build count query
  let countSql = `SELECT COUNT(*) AS total FROM Products ${where};`;
  const countReq = pool.request();
  for (const k of Object.keys(inputs)) countReq.input(k, inputs[k]);
  const countRes = await countReq.query(countSql);
  const total = countRes.recordset[0].total;

  // build select query with pagination
  const selectSql = `
    SELECT *
    FROM Products
    ${where}
    ORDER BY ${order}
    OFFSET @skip ROWS FETCH NEXT @take ROWS ONLY;`;
  const req = pool.request();
  for (const k of Object.keys(inputs)) req.input(k, inputs[k]);
  req.input('skip', sql.Int, skip);
  req.input('take', sql.Int, take);
  const res = await req.query(selectSql);
  return { items: res.recordset, total };
}

async function getProductById(id) {
  const pool = await getPool();
  const result = await pool.request().input('id', sql.Int, id).query('SELECT * FROM Products WHERE id = @id;');
  return result.recordset[0];
}

async function createProduct({ sku, name, description, price, quantity }) {
  const pool = await getPool();
  const result = await pool.request()
    .input('sku', sql.NVarChar(64), sku)
    .input('name', sql.NVarChar(200), name)
    .input('description', sql.NVarChar(sql.MAX), description)
    .input('price', sql.Decimal(10,2), price)
    .input('quantity', sql.Int, quantity)
    .query(`INSERT INTO Products (sku,name,description,price,quantity)
            OUTPUT INSERTED.*
            VALUES (@sku,@name,@description,@price,@quantity);`);
  return result.recordset[0];
}

async function updateProduct(id, { sku, name, description, price, quantity }) {
  const pool = await getPool();
  const result = await pool.request()
    .input('id', sql.Int, id)
    .input('sku', sql.NVarChar(64), sku)
    .input('name', sql.NVarChar(200), name)
    .input('description', sql.NVarChar(sql.MAX), description)
    .input('price', sql.Decimal(10,2), price)
    .input('quantity', sql.Int, quantity)
    .query(`UPDATE Products
            SET sku = @sku, name = @name, description = @description, price = @price, quantity = @quantity, updated_at = SYSUTCDATETIME()
            OUTPUT INSERTED.*
            WHERE id = @id;`);
  return result.recordset[0];
}

async function deleteProduct(id) {
  const pool = await getPool();
  await pool.request().input('id', sql.Int, id).query('DELETE FROM Products WHERE id = @id;');
}

async function adjustInventory(productId, type, qty, note) {
  if (!['in','out'].includes(type)) throw new Error('Invalid type');
  const pool = await getPool();
  const transaction = new sql.Transaction(await getPool());
  try {
    await transaction.begin();
    const tr = transaction.request();
    await tr.input('productId', sql.Int, productId)
      .input('type', sql.NVarChar(10), type)
      .input('qty', sql.Int, qty)
      .input('note', sql.NVarChar(500), note)
      .query(`INSERT INTO InventoryTransactions (product_id,type,qty,note) VALUES (@productId,@type,@qty,@note);`);
    const delta = type === 'in' ? qty : -qty;
    await tr.input('delta', sql.Int, delta).input('productId', sql.Int, productId)
      .query(`UPDATE Products SET quantity = quantity + @delta, updated_at = SYSUTCDATETIME() WHERE id = @productId;`);
    await transaction.commit();
  } catch (err) {
    await transaction.rollback();
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
