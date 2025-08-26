const Joi = require('joi');
const model = require('../models/productModel');

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
    const skip = parseInt(req.query.skip) || 0;
    const take = Math.min(parseInt(req.query.take) || 50, 200);
    const items = await model.getAllProducts({ skip, take });
    res.json(items);
  } catch (err) { next(err); }
}

async function get(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    const item = await model.getProductById(id);
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json(item);
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const payload = await createSchema.validateAsync(req.body);
    const created = await model.createProduct(payload);
    res.status(201).json(created);
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    const payload = await createSchema.validateAsync(req.body);
    const updated = await model.updateProduct(id, payload);
    if (!updated) return res.status(404).json({ message: 'Not found' });
    res.json(updated);
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    await model.deleteProduct(id);
    res.status(204).end();
  } catch (err) { next(err); }
}

async function adjust(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    const payload = await adjustSchema.validateAsync(req.body);
    await model.adjustInventory(id, payload.type, payload.qty, payload.note);
    res.status(200).json({ message: 'Inventory adjusted' });
  } catch (err) { next(err); }
}

module.exports = { list, get, create, update, remove, adjust };
