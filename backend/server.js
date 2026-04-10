// IMPORTANT: dotenv must be loaded FIRST before anything else
require('dotenv').config();

const express = require('express');
const cors = require('cors');

// Load DB after dotenv
const db = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const itemRoutes = require('./routes/itemRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Middleware
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/items', itemRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Server is running', timestamp: new Date() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// Error handler (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🔑 JWT_SECRET loaded: ${process.env.JWT_SECRET ? 'YES ✅' : 'NO ❌ - check your .env file'}`);
  console.log(`🗄️  DB_NAME: ${process.env.DB_NAME}`);
});
