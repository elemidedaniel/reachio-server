const express      = require('express');
const router       = express.Router();
const supabase     = require('../config/supabase');
const auth         = require('../middleware/auth');
const { runBatch } = require('../services/mailer');

// Get email logs
router.get('/logs', auth, async (req, res) => {
  const { data, error } = await supabase
    .from('email_logs')
    .select('*, companies(name, employee_email)')
    .eq('user_id', req.user.id)
    .order('sent_at', { ascending: false });

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// Manual trigger
router.post('/send-now', auth, async (req, res) => {
  res.json({ message: 'Batch started' });
  // Run async so response returns immediately
  runBatch(req.user.id).catch(console.error);
});

module.exports = router;