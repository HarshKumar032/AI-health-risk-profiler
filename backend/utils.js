function safeLower(s) {
  if (!s) return '';
  return String(s).toLowerCase().trim();
}

module.exports = { safeLower };
