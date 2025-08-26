const { sql, poolPromise } = require('../db');

async function getAllProducts({ skip = 0, take = 50 } = {}) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('skip', sql.Int, skip)
    .input('take', sql.Int, take)
    .query('SELECT * FROM Products ORDER BY id OFFSET @skip ROWS FETCH NEXT @take ROWS ONLY;');
  return result.recordset;
}

async function getProductById(id) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('id', sql.Int, id)
    .query('SELECT * FROM Products WHERE id = @id;');
  return result.recordset[0];
}

async function createProduct({ sku, name, description, price, quantity }) {
  const pool = await poolPromise;
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
  const pool = await poolPromise;
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
  const pool = await poolPromise;
  await pool.request().input('id', sql.Int, id).query('DELETE FROM Products WHERE id = @id;');
  return;
}

async function adjustInventory(productId, type, qty, note) {
  if (!['in','out'].includes(type)) throw new Error('Invalid type');
  const pool = await poolPromise;
  const transaction = new sql.Transaction(pool);
  try {
    await transaction.begin();
    const tr = transaction.request();

    // insert transaction
    await tr.input('productId', sql.Int, productId)
      .input('type', sql.NVarChar(10), type)
      .input('qty', sql.Int, qty)
      .input('note', sql.NVarChar(500), note)
      .query(`INSERT INTO InventoryTransactions (product_id,type,qty,note) VALUES (@productId,@type,@qty,@note);`);

    // update product quantity
    const delta = type === 'in' ? qty : -qty;
    await tr.input('delta', sql.Int, delta).input('productId', sql.Int, productId)
      .query(`UPDATE Products SET quantity = quantity + @delta, updated_at = SYSUTCDATETIME() WHERE id = @productId;`);

    await transaction.commit();
    return true;
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
