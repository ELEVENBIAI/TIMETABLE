import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Automatisches Cleanup nach jedem Test — verhindert DOM-Leaks zwischen Tests
afterEach(() => {
  cleanup();
});
