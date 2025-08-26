const { sql, poolPromise } = require('../db');

async function createUser({ email, passwordHash, displayName }) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('email', sql.NVarChar(255), email)
    .input('password_hash', sql.NVarChar(255), passwordHash)
    .input('display_name', sql.NVarChar(200), displayName)
    .query(`INSERT INTO Users (email,password_hash,display_name)
            OUTPUT INSERTED.id, INSERTED.email, INSERTED.display_name
            VALUES (@email,@password_hash,@display_name);`);
  return result.recordset[0];
}

async function getUserByEmail(email) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('email', sql.NVarChar(255), email)
    .query('SELECT * FROM Users WHERE email = @email;');
  return result.recordset[0];
}

async function getUserById(id) {
  const pool = await poolPromise;
  const result = await pool.request()
    .input('id', sql.Int, id)
    .query('SELECT id, email, display_name, role, created_at FROM Users WHERE id = @id;');
  return result.recordset[0];
}

module.exports = { createUser, getUserByEmail, getUserById };
