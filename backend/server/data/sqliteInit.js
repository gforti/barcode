const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

const schemaPath = path.join(__dirname, '../..', 'db-sql', 'sqlite_schema.sql');

async function initSqliteIfNeeded() {
  const dbFile = process.env.SQLITE_FILE || path.join(__dirname, '../../dev.sqlite');
  const dir = path.dirname(dbFile);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const db = await open({ filename: dbFile, driver: sqlite3.Database });
  const schema = fs.readFileSync(schemaPath, 'utf8');
  await db.exec(schema);
  await db.close();
  console.log('SQLite DB initialized at', dbFile);
}

module.exports = { initSqliteIfNeeded };
