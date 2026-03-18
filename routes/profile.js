const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const auth = require('../middleware/auth');

// Get profile
router.get('/', auth, async (req, res) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*, works(*)')
    .eq('id', req.user.id)
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// Update profile
router.put('/', auth, async (req, res) => {
  const {
    full_name, role, bio, skills,
    portfolio_url, linkedin, github,
    twitter, custom_links, accent_color,
  } = req.body;

  const { data, error } = await supabase
    .from('profiles')
    .update({
      full_name, role, bio, skills,
      portfolio_url, linkedin, github,
      twitter, custom_links, accent_color,
      updated_at: new Date(),
    })
    .eq('id', req.user.id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// Add work
router.post('/works', auth, async (req, res) => {
  const { title, description, url } = req.body;

  if (!title) return res.status(400).json({ error: 'Title is required' });

  const { data, error } = await supabase
    .from('works')
    .insert({ user_id: req.user.id, title, description, url })
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});

// Update work
router.put('/works/:id', auth, async (req, res) => {
  const { title, description, url } = req.body;

  const { data, error } = await supabase
    .from('works')
    .update({ title, description, url })
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// Delete work
router.delete('/works/:id', auth, async (req, res) => {
  const { error } = await supabase
    .from('works')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.user.id);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: 'Work deleted' });
});

module.exports = router;