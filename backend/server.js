const express = require('express');
const cors = require('cors');
const app = express();

// Middleware
app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());

// Test route - මෙම route එක අනිවාර්යයි
app.get('/api/test', (req, res) => {
  console.log('✅ API Test route hit!');
  res.json({
    message: 'Backend server working!',
    status: 'success',
    time: new Date().toISOString()
  });
});

// Server start
const PORT = 5000;
app.listen(PORT, () => {
  console.log('✅ Server running on port 5000');
  console.log('✅ Test URL: http://localhost:5000/api/test');
});