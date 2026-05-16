// Deutsche Resources (erste aktive Übersetzung, ADR-16)
// Mini-Map bis i18next-Backend live ist (ELE-194).
// Key-Konvention: <namespace>.<key>

const resources: Record<string, string> = {
  // errors
  'errors.unauthorized': 'Nicht autorisiert',
  'errors.invalidToken': 'Token ungültig oder abgelaufen',
  'errors.accountLocked': 'Konto vorübergehend gesperrt. Bitte später erneut versuchen.',
  'errors.validation': 'Ungültige Eingabe',
  'errors.notFound': 'Nicht gefunden',
  'errors.internal': 'Interner Serverfehler',
  'errors.serviceUnavailable': 'Service nicht verfügbar',

  // auth
  'auth.loginFailed': 'Email oder Passwort falsch',
  'auth.loginSuccess': 'Login erfolgreich',
};

export default resources;
