const express = require('express');
const cors = require('cors');
const path = require('path');

// Import route modules
const d2lRoutes = require('./routes/d2lRoutes');
const quizRoutes = require('./routes/quizRoutes');
const makeupRoutes = require('./routes/makeupRoutes');
const serverRoutes = require('./routes/serverRoutes');
const calendarRoutes = require('./routes/calendarRoutes');

const app = express();
const PORT = process.env.PORT || process.env.BACKEND_PORT || 3005;

// ✅ Enable CORS and JSON parsing
// Allow all localhost origins (any port) for development
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    
    // Allow any localhost or 127.0.0.1 on any port
    if (origin.match(/^http:\/\/localhost(:\d+)?$/) || 
        origin.match(/^http:\/\/127\.0\.0\.1(:\d+)?$/) ||
        origin.match(/^http:\/\/192\.168\.\d+\.\d+(:\d+)?$/)) {
      return callback(null, true);
    }
    
    callback(null, true); // Allow all origins in development
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
};

// Handle CORS preflight requests explicitly
app.options('*', cors(corsOptions));
app.use(cors(corsOptions));
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'D2L Backend API is running',
    info: 'This is the backend API server. Access the frontend at http://localhost:3000',
    endpoints: {
      health: '/api/health',
      d2l: '/api/d2l/*',
      quiz: '/api/quiz/*',
      makeup: '/api/makeup/*',
      calendar: '/api/calendar/*'
    }
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'D2L Backend API is running' });
});

// Mount route modules
app.use('/api/d2l', d2lRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/makeup', makeupRoutes);
app.use('/api/server', serverRoutes);
app.use('/api/calendar', calendarRoutes);

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ 
    success: false, 
    error: 'Internal server error' 
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`D2L Backend API running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`🌐 Server accessible on all interfaces`);
});
