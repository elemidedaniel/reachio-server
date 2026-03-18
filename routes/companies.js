const express  = require('express');
const router   = express.Router();
const supabase = require('../config/supabase');
const auth     = require('../middleware/auth');

// Get all companies
router.get('/', auth, async (req, res) => {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// Add company
router.post('/', auth, async (req, res) => {
  const { name, industry, website, employee_name, employee_email, employee_role, notes } = req.body;

  // Duplicate check
  const { data: existing } = await supabase
    .from('companies')
    .select('id')
    .eq('user_id', req.user.id)
    .eq('employee_email', employee_email)
    .single();

  if (existing) {
    return res.status(400).json({ error: 'A contact with this email already exists in your list' });
  }

  const { data, error } = await supabase
    .from('companies')
    .insert({ user_id: req.user.id, name, industry, website, employee_name, employee_email, employee_role, notes })
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});

// Update company
router.put('/:id', auth, async (req, res) => {
  const { name, industry, website, employee_name, employee_email, employee_role, notes, status } = req.body;

  const { data, error } = await supabase
    .from('companies')
    .update({ name, industry, website, employee_name, employee_email, employee_role, notes, status, updated_at: new Date() })
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// Toggle blacklist
router.patch('/:id/blacklist', auth, async (req, res) => {
  const { blacklisted } = req.body;

  const { data, error } = await supabase
    .from('companies')
    .update({ blacklisted, status: blacklisted ? 'Blacklisted' : 'Pending', updated_at: new Date() })
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// Delete company
router.delete('/:id', auth, async (req, res) => {
  const { error } = await supabase
    .from('companies')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.user.id);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: 'Company deleted' });
});

// Bulk import
router.post('/import', auth, async (req, res) => {
  const { companies } = req.body;
  if (!companies || companies.length === 0) {
    return res.status(400).json({ error: 'No companies provided' });
  }

  const results = { imported: 0, skipped: 0, errors: [] };

  for (const company of companies) {
    if (!company.name || !company.employee_name || !company.employee_email) {
      results.skipped++;
      continue;
    }

    // Duplicate check
    const { data: existing } = await supabase
      .from('companies')
      .select('id')
      .eq('user_id', req.user.id)
      .eq('employee_email', company.employee_email)
      .single();

    if (existing) { results.skipped++; continue; }

    const { error } = await supabase
      .from('companies')
      .insert({
        user_id:        req.user.id,
        name:           company.name,
        industry:       company.industry || '',
        website:        company.website || '',
        employee_name:  company.employee_name,
        employee_email: company.employee_email,
        employee_role:  company.employee_role || '',
        notes:          company.notes || '',
      });

    if (error) { results.errors.push(company.employee_email); }
    else { results.imported++; }
  }

  res.json(results);
});

module.exports = router;