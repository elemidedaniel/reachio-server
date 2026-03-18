const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// Sign up
router.post('/signup', async (req, res) => {
  const { email, password, full_name, role } = req.body;

  if (!email || !password || !full_name || !role) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) return res.status(400).json({ error: error.message });

  // Update profile with name and role
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ full_name, role })
    .eq('id', data.user.id);

  if (profileError) return res.status(400).json({ error: profileError.message });

  res.status(201).json({ message: 'Account created successfully' });
});

module.exports = router;