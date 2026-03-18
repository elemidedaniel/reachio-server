const { extractFirstName } = require('../utils/nameExtractor');

/**
 * Replaces all variables in a template string with real values
 * Empty/missing variables are cleanly removed
 */
const resolveTemplate = (text, { company, profile, works = [] }) => {
  if (!text) return '';

  const firstWork = works[0] || {};

  const vars = {
    '{{company_name}}':        company?.name || '',
    '{{employee_name}}':       extractFirstName(company?.employee_name) || '',
    '{{employee_role}}':       company?.employee_role || '',
    '{{your_name}}':           profile?.full_name || '',
    '{{your_role}}':           profile?.role || '',
    '{{your_skills}}':         (profile?.skills || []).join(', ') || '',
    '{{your_bio}}':            profile?.bio || '',
    '{{portfolio}}':           profile?.portfolio_url || '',
    '{{linkedin}}':            profile?.linkedin || '',
    '{{github}}':              profile?.github || '',
    '{{twitter}}':             profile?.twitter || '',
    '{{project_title}}':       firstWork.title || '',
    '{{project_description}}': firstWork.description || '',
    '{{project_url}}':         firstWork.url || '',
    '{{value_proposition}}':   '',
  };

  let result = text;

  // Replace all variables
  Object.entries(vars).forEach(([key, value]) => {
    result = result.replaceAll(key, value);
  });

  // Clean up lines that are now empty due to missing variables
  result = result
    .split('\n')
    .map(line => line.trim())
    .filter((line, i, arr) => {
      // Remove empty lines that follow another empty line
      if (line === '' && arr[i - 1] === '') return false;
      return true;
    })
    .join('\n')
    .trim();

  return result;
};

/**
 * Pick the best template for a company
 * Priority: industry-matched template → first available template
 * Never picks the same template twice for the same company
 */
const pickTemplate = (templates, company, usedTemplateIds = []) => {
  const available = templates.filter(t =>
    !t.is_followup && !usedTemplateIds.includes(t.id)
  );

  if (available.length === 0) return null;

  // Try industry match first
  if (company.industry) {
    const industryMatch = available.find(t =>
      t.industry && t.industry.toLowerCase() === company.industry.toLowerCase()
    );
    if (industryMatch) return industryMatch;
  }

  // Fall back to templates with no industry set
  const generic = available.find(t => !t.industry);
  if (generic) return generic;

  // Fall back to any available
  return available[0];
};

module.exports = { resolveTemplate, pickTemplate };