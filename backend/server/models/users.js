const USE_SQLITE = process.env.USE_SQLITE === 'true';
if (USE_SQLITE) {
  const db = require('../data/sqliteAdapter'); // reuse simple user queries inside adapter? we'll implement minimal here
  // sqlite-specific queries via sqlite db helper
  const sqlite3 = require('sqlite3');
  const { open } = require('sqlite');
  const path = require('path');

  async function getDb() {
    return open({
      filename: process.env.SQLITE_FILE || path.join(__dirname, '../../dev.sqlite'),
      driver: sqlite3.Database
    });
  }

  async function createUser({ email, passwordHash, displayName }) {
    const dbConn = await getDb();
    const res = await dbConn.run(
      `INSERT INTO Users (email,password_hash,display_name,created_at) VALUES (?,?,?,datetime('now'))`,
      [email, passwordHash, displayName]
    );
    const user = await dbConn.get('SELECT id, email, display_name, role, created_at FROM Users WHERE id = ?', [res.lastID]);
    await dbConn.close();
    return user;
  }

  async function getUserByEmail(email) {
    const dbConn = await getDb();
    const row = await dbConn.get('SELECT * FROM Users WHERE email = ?', [email]);
    await dbConn.close();
    return row;
  }

  async function getUserById(id) {
    const dbConn = await getDb();
    const row = await dbConn.get('SELECT id, email, display_name, role, created_at FROM Users WHERE id = ?', [id]);
    await dbConn.close();
    return row;
  }

  module.exports = { createUser, getUserByEmail, getUserById };
} else {
  // mssql implementation
  const { sql, getPool } = require('../db/mssql');

  async function createUser({ email, passwordHash, displayName }) {
    const pool = await getPool();
    const result = await pool.request()
      .input('email', sql.NVarChar(255), email)
      .input('password_hash', sql.NVarChar(255), passwordHash)
      .input('display_name', sql.NVarChar(200), displayName)
      .query(`INSERT INTO Users (email,password_hash,display_name)
              OUTPUT INSERTED.id, INSERTED.email, INSERTED.display_name
              VALUES (@email,@password_hash,@display_name);`);
    return { id: result.recordset[0].id, email: result.recordset[0].email, display_name: result.recordset[0].display_name };
  }

  async function getUserByEmail(email) {
    const pool = await getPool();
    const result = await pool.request().input('email', sql.NVarChar(255), email).query('SELECT * FROM Users WHERE email = @email;');
    return result.recordset[0];
  }

  async function getUserById(id) {
    const pool = await getPool();
    const result = await pool.request().input('id', sql.Int, id).query('SELECT id, email, display_name, role, created_at FROM Users WHERE id = @id;');
    return result.recordset[0];
  }

  module.exports = { createUser, getUserByEmail, getUserById };
}
