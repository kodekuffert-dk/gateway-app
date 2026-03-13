function getAdminEmails() {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function isAdminUser(email) {
  const normalizedEmail = (email || '').trim().toLowerCase();
  return getAdminEmails().includes(normalizedEmail);
}

module.exports = {
  getAdminEmails,
  isAdminUser,
};
