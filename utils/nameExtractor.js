// Extracts first name from full name
// "John Smith" → "John"
// "john" → "John"
const extractFirstName = (fullName) => {
  if (!fullName) return '';
  return fullName.trim().split(' ')[0];
};

module.exports = { extractFirstName };