const express  = require('express');
const router   = express.Router();
const supabase = require('../config/supabase');
const auth     = require('../middleware/auth');

// Get all templates
router.get('/', auth, async (req, res) => {
  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// Create template
router.post('/', auth, async (req, res) => {
  const { name, subject, body, industry, is_followup, custom_cv_url } = req.body;

  if (!name || !subject || !body) {
    return res.status(400).json({ error: 'Name, subject and body are required' });
  }

  // Max 3 main templates + 1 followup
  const { data: existing } = await supabase
    .from('templates')
    .select('id')
    .eq('user_id', req.user.id)
    .eq('is_followup', is_followup || false);

  if (!is_followup && existing.length >= 3) {
    return res.status(400).json({ error: 'Maximum 3 email templates allowed' });
  }
  if (is_followup && existing.length >= 1) {
    return res.status(400).json({ error: 'Only 1 follow-up template allowed' });
  }

  const { data, error } = await supabase
    .from('templates')
    .insert({ user_id: req.user.id, name, subject, body, industry, is_followup: is_followup || false, custom_cv_url })
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});

// Update template
router.put('/:id', auth, async (req, res) => {
  const { name, subject, body, industry, custom_cv_url } = req.body;

  const { data, error } = await supabase
    .from('templates')
    .update({ name, subject, body, industry, custom_cv_url, updated_at: new Date() })
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// Delete template
router.delete('/:id', auth, async (req, res) => {
  const { error } = await supabase
    .from('templates')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.user.id);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: 'Template deleted' });
});

module.exports = router;