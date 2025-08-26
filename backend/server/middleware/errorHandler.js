function errorHandler(err, req, res, next) {
  console.error(err);
  if (err && err.isJoi) return res.status(400).json({ message: err.message });
  res.status(500).json({ message: 'Internal Server Error' });
}
module.exports = errorHandler;
