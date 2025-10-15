const express = require('express');
const cors = require('cors');
const path = require('path');

// Import route modules
const d2lRoutes = require('./routes/d2lRoutes');
const quizRoutes = require('./routes/quizRoutes');
const makeupRoutes = require('./routes/makeupRoutes');
const fileExtractorRoutes = require('./routes/fileExtractorRoutes');

const app = express();
const PORT = process.env.PORT || process.env.BACKEND_PORT || 5000;

// Middleware
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
app.use('/api/file-extractor', fileExtractorRoutes);

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ 
    success: false, 
    error: 'Internal server error' 
  });
});

// Start server
app.listen(PORT, 'localhost', () => {
  console.log(`D2L Backend API running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔒 Server bound to localhost only - not accessible from network`);
});
