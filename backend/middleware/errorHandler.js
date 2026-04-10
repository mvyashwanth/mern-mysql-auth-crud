// middleware/errorHandler.js
const errorHandler = (err, req, res, next) => {
  console.error('❌ Error:', err.message);

  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(400).json({ success: false, message: 'Email already registered' });
  }
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Token expired' });
  }

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
};

module.exports = errorHandler;
