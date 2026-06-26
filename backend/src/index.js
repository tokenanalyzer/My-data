const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const socketIO = require('socket.io');
const http = require('http');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: { origin: '*' }
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Database Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/my-data')
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Error:', err));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/scraper', require('./routes/scraper'));
app.use('/api/data', require('./routes/data'));
app.use('/api/jobs', require('./routes/jobs'));
app.use('/api/health', require('./routes/health'));

// Health Check
app.get('/', (req, res) => {
  res.json({ 
    status: 'running',
    version: '1.0.0',
    message: 'My Data API - Ready to scrape!'
  });
});

// Socket.io Events
io.on('connection', (socket) => {
  console.log('✅ Client connected:', socket.id);
  
  socket.on('start_scrape', (data) => {
    console.log('🔄 Starting scrape:', data);
    io.emit('scrape_progress', { status: 'started', data });
  });
  
  socket.on('disconnect', () => {
    console.log('❌ Client disconnected:', socket.id);
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

module.exports = { app, io };