/**
 * Check if a user has access to a specific navigation item
 * @param {Object} user - User object containing role information
 * @param {string} item - Navigation item to check
 * @returns {boolean} Whether the user has access to the item
 */
function hasAccess(user, item) {
  if (!user || !user.role) return false;

  const rolePermissions = {
    'department_admin': [
      'dashboard',
      'services',
      'issues',
      'reports',
      'settings',
      'support',
      'sign-out'
    ],
    'service_owner': [
      'dashboard',
      'services',
      'issues',
      'reports',
      'support',
      'sign-out'
    ],
    'content_designer': [
      'dashboard',
      'services',
      'issues',
      'support',
      'sign-out'
    ],
    'developer': [
      'dashboard',
      'services',
      'issues',
      'support',
      'sign-out'
    ]
  };

  return rolePermissions[user.role]?.includes(item) || false;
}

/**
 * Get navigation items for a user
 * @param {Object} user - User object containing role information
 * @returns {Array} Array of navigation items the user has access to
 */
function getNavigationItems(user) {
  if (!user || !user.role) return [];

  const allItems = [
    { id: 'dashboard', label: 'Dashboard', path: '/dashboard' },
    { id: 'services', label: 'Services', path: '/services' },
    { id: 'issues', label: 'Issues', path: '/issues' },
    { id: 'reports', label: 'Reports', path: '/reports' },
    { id: 'settings', label: 'Settings', path: '/settings' },
    { id: 'support', label: 'Support requests', path: '/admin/support' },
    { id: 'sign-out', label: 'Sign out', path: '/auth/sign-out' }
  ];

  return allItems.filter(item => hasAccess(user, item.id));
}

module.exports = {
  hasAccess,
  getNavigationItems
}; 