const useSqlite = process.env.USE_SQLITE === 'true';
const adapter = useSqlite ? require('./sqliteAdapter') : require('./mssqlAdapter');
module.exports = adapter;
