export const API = {
  listRules:  '/.netlify/functions/admin-list-allowed',
  upsertRule: '/.netlify/functions/admin-upsert-allowed',
  deleteRule: '/.netlify/functions/admin-delete-allowed',

  listUsers:  '/.netlify/functions/admin-list-users',
  upsertUser: '/.netlify/functions/admin-upsert-users',
  deleteUser: '/.netlify/functions/admin-delete-users',
};

export const ADMIN_DATABASES = ['db_old', 'db_new'];
export const ROLES = ['admin', 'user', 'beta'];
