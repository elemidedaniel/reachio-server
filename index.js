const express    = require('express');
const cors       = require('cors');
require('dotenv').config();
const { initSchedulers } = require('./services/scheduler');

const app  = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: (origin, callback) => {
    const allowed = [
      process.env.CLIENT_URL,
      process.env.CLIENT_URL?.replace(/\/$/, ''),
      'http://localhost:5173',
    ];
    if (!origin || allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json());

// Routes
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/profile',       require('./routes/profile'));
app.use('/api/settings',      require('./routes/settings'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/companies',     require('./routes/companies'));
app.use('/api/templates',     require('./routes/templates'));
app.use('/api/emails',        require('./routes/emails'));

app.get('/', (req, res) => {
  res.json({ message: 'Reachio server running' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  initSchedulers();
});