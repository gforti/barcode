const express = require('express');
require('dotenv').config();
const env = require('./config/env');
const errorHandler = require('./middleware/errorHandler');
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const { initSqliteIfNeeded } = require('./data/sqliteInit');

const app = express();
app.use(express.json());

if (process.env.USE_SQLITE === 'true') {
  initSqliteIfNeeded().catch(err => {
    console.error('Failed to init sqlite:', err);
    process.exit(1);
  });
}

app.use('/api/auth', authRoutes);

// product routes protect: you can change to allow public GETs if desired
const { authenticate } = require('./middleware/authMiddleware');
app.use('/api/products', authenticate, productRoutes);

app.get('/health', (req, res) => res.json({ ok: true }));

app.use(errorHandler);

const port = env.PORT || 3000;
app.listen(port, () => console.log(`Server listening on ${port}`));
