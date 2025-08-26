const Joi = require('joi');
const products = require('../models/products');

const createSchema = Joi.object({
  sku: Joi.string().max(64).allow(null,''),
  name: Joi.string().max(200).required(),
  description: Joi.string().allow(null,''),
  price: Joi.number().precision(2).min(0).required(),
  quantity: Joi.number().integer().min(0).required()
});

const adjustSchema = Joi.object({
  type: Joi.string().valid('in','out').required(),
  qty: Joi.number().integer().min(1).required(),
  note: Joi.string().max(500).allow(null,'')
});

async function list(req, res, next) {
  try {
    const skip = Math.max(0, parseInt(req.query.skip) || 0);
    const take = Math.min(100, parseInt(req.query.take) || 25);
    const filters = {
      search: req.query.search || null,
      minQty: req.query.minQty != null ? parseInt(req.query.minQty) : null,
      maxQty: req.query.maxQty != null ? parseInt(req.query.maxQty) : null
    };
    const sort = req.query.sort || 'id_asc';
    const { items, total } = await products.list({ skip, take, filters, sort });
    res.json({ items, total, skip, take });
  } catch (err) { next(err); }
}

async function get(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    const item = await products.getById(id);
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json(item);
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const payload = await createSchema.validateAsync(req.body);
    const created = await products.create(payload);
    res.status(201).json(created);
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    const payload = await createSchema.validateAsync(req.body);
    const updated = await products.update(id, payload);
    if (!updated) return res.status(404).json({ message: 'Not found' });
    res.json(updated);
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    await products.remove(id);
    res.status(204).end();
  } catch (err) { next(err); }
}

async function adjust(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    const payload = await adjustSchema.validateAsync(req.body);
    await products.adjustInventory(id, payload.type, payload.qty, payload.note);
    res.status(200).json({ message: 'Inventory adjusted' });
  } catch (err) { next(err); }
}

module.exports = { list, get, create, update, remove, adjust };
