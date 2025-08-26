const Joi = require('joi');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  display_name: Joi.string().max(200).allow(null,'')
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

function signToken(user) {
  const payload = { sub: user.id, email: user.email, role: user.role || 'user' };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '1d' });
}

async function register(req, res, next) {
  try {
    const payload = await registerSchema.validateAsync(req.body);
    const existing = await userModel.getUserByEmail(payload.email);
    if (existing) return res.status(409).json({ message: 'Email already registered' });
    const hash = await bcrypt.hash(payload.password, 10);
    const created = await userModel.createUser({ email: payload.email, passwordHash: hash, displayName: payload.display_name });
    const user = await userModel.getUserById(created.id);
    const token = signToken(user);
    res.status(201).json({ token, user });
  } catch (err) { next(err); }
}

async function login(req, res, next) {
  try {
    const payload = await loginSchema.validateAsync(req.body);
    const user = await userModel.getUserByEmail(payload.email);
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    const ok = await bcrypt.compare(payload.password, user.password_hash);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
    const safeUser = { id: user.id, email: user.email, display_name: user.display_name, role: user.role };
    const token = signToken(safeUser);
    res.json({ token, user: safeUser });
  } catch (err) { next(err); }
}

module.exports = { register, login };
