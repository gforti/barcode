const express = require('express');
require('dotenv').config();
const products = require('./routes/products');
const errorHandler = require('./middleware/errorHandler');

const app = express();
app.use(express.json());

app.use('/api/products', products);

app.get('/health', (req, res) => res.json({ ok: true }));

app.use(errorHandler);

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server listening on ${port}`));
