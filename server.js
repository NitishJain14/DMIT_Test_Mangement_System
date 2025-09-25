const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const path = require('path');
require('dotenv').config();
const db = require('./config/db'); // your current db.js


// Routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const clientRoutes = require('./routes/clientRoutes');
const remarkRoutes = require('./routes/remarkRoutes');

// App Init
const app = express();

// Trust proxy (if using reverse proxy like Nginx)
app.set('trust proxy', 1);

// Security headers
app.use(helmet());

// CORS (adjust origin as needed)
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'https://dmit-test-management-system.netlify.app/', // Explicit origin
  methods: ['GET', 'POST', 'PUT', 'DELETE, PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true // ✅ Allow credentials (cookies, auth headers)
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Body parser and compression
app.use(express.json({ limit: '10mb' }));
app.use(compression());
express.urlencoded()

// Serve uploaded images statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/remarks', remarkRoutes); // 👈 added here

app.get('/', (req, res) => {
  db.ping(err => {
    if (err) {
      console.error('❌ Database connection failed:', err.message);
      return res.status(500).json({
        status: 'error',
        message: 'Database connection failed',
        error: err.message
      });
    }

    res.json({
      status: 'success',
      message: 'Database connected successfully ✅'
    });
  });
});

// 404 Not Found handler
app.use((req, res, next) => {
  res.status(404).json({ message: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unexpected error:', err);
  res.status(500).json({ message: 'Something went wrong', error: err.message });
});

// Start Server
const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
