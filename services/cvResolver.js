/**
 * CV priority:
 * 1. Template custom CV
 * 2. Profile CV
 * 3. null (no attachment)
 */
const resolveCV = (template, profile) => {
  if (template?.custom_cv_url) return template.custom_cv_url;
  if (profile?.cv_url)         return profile.cv_url;
  return null;
};

module.exports = { resolveCV };