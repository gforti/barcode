const data = require('../data');

async function list({ skip, take, filters, sort }) {
  return data.getAllProducts({ skip, take, filters, sort });
}

async function getById(id) {
  return data.getProductById(id);
}

async function create(payload) {
  return data.createProduct(payload);
}

async function update(id, payload) {
  return data.updateProduct(id, payload);
}

async function remove(id) {
  return data.deleteProduct(id);
}

async function adjustInventory(id, type, qty, note) {
  return data.adjustInventory(id, type, qty, note);
}

module.exports = { list, getById, create, update, remove, adjustInventory };
