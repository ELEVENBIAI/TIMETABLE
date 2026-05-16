import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

function HelloWorld({ name }: { name: string }) {
  return <h1>Hallo, {name}!</h1>;
}

describe('Frontend Smoke-Test', () => {
  it('rendert eine React-Komponente', () => {
    render(<HelloWorld name="Timetable" />);
    expect(screen.getByText('Hallo, Timetable!')).toBeInTheDocument();
  });

  it('@testing-library/jest-dom-Matcher funktionieren', () => {
    render(<HelloWorld name="Test" />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toBeVisible();
    expect(heading).toHaveTextContent('Hallo, Test!');
  });

  it('Vitest Globals funktionieren', () => {
    expect(2 + 2).toBe(4);
  });
});
