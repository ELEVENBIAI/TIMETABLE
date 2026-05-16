// English resources (default + fallback, ADR-16)
// Mini-Map bis i18next-Backend live ist (ELE-194).
// Key-Konvention: <namespace>.<key>

const resources: Record<string, string> = {
  // errors
  'errors.unauthorized': 'Unauthorized',
  'errors.invalidToken': 'Token invalid or expired',
  'errors.accountLocked': 'Account temporarily locked. Please try again later.',
  'errors.validation': 'Invalid input',
  'errors.notFound': 'Not found',
  'errors.internal': 'Internal server error',
  'errors.serviceUnavailable': 'Service unavailable',

  // auth
  'auth.loginFailed': 'Email or password incorrect',
  'auth.loginSuccess': 'Login successful',
};

export default resources;
