const express    = require('express');
const router     = express.Router();
const supabase   = require('../config/supabase');
const auth       = require('../middleware/auth');
const { startUserScheduler, stopUserScheduler } = require('../services/scheduler');

// Get settings
router.get('/', auth, async (req, res) => {
  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .eq('user_id', req.user.id)
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// Update settings
router.put('/', auth, async (req, res) => {
  const {
    daily_limit, send_time, interval_minutes,
    followup_days, scheduler_active, preview_required,
    notify_on_send, notify_on_reply, notify_on_exhausted,
    daily_summary_email,
  } = req.body;

  const { data, error } = await supabase
    .from('settings')
    .update({
      daily_limit, send_time, interval_minutes,
      followup_days, scheduler_active, preview_required,
      notify_on_send, notify_on_reply, notify_on_exhausted,
      daily_summary_email, updated_at: new Date(),
    })
    .eq('user_id', req.user.id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });

  // Start or stop scheduler based on toggle
  if (scheduler_active) {
    startUserScheduler(req.user.id, send_time);
  } else {
    stopUserScheduler(req.user.id);
  }

  res.json(data);
});

module.exports = router;