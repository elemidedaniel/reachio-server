const express    = require('express');
const cors       = require('cors');
require('dotenv').config();
const { initSchedulers } = require('./services/scheduler');

const app  = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: process.env.CLIENT_URL }));
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