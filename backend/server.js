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
const PORT = process.env.PORT || process.env.BACKEND_PORT || 5000;

// ✅ Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Routes
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
