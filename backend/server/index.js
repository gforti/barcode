const express = require('express');
require('dotenv').config();
const products = require('./routes/products');
const authRoutes = require('./routes/auth');
const errorHandler = require('./middleware/errorHandler');
const { authenticate } = require('./middleware/authMiddleware');

const app = express();
app.use(express.json());

app.use('/api/auth', authRoutes);

// protect product routes
app.use('/api/products', authenticate, products);

app.get('/health', (req, res) => res.json({ ok: true }));

app.use(errorHandler);

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server listening on ${port}`));
