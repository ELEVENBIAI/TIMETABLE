import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { FormError } from '@/components/FormError';
import { ApiRequestError } from '@/types/api';
import { initI18n } from '@/lib/i18n';

beforeAll(async () => {
  await initI18n('en');
});

describe('Button', () => {
  it('rendert label + handle click', () => {
    let clicked = false;
    render(<Button onClick={() => (clicked = true)}>Click me</Button>);
    fireEvent.click(screen.getByRole('button', { name: /click me/i }));
    expect(clicked).toBe(true);
  });

  it('disabled bei loading', () => {
    render(<Button loading>Wait</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('forwarded type=submit', () => {
    render(<Button type="submit">Send</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
  });
});

describe('Input', () => {
  it('rendert label + verknüpft mit aria-describedby bei error', () => {
    render(<Input label="Email" error="Required" />);
    const input = screen.getByLabelText(/email/i);
    const errorId = input.getAttribute('aria-describedby');
    expect(errorId).toBeTruthy();
    expect(screen.getByText('Required')).toBeInTheDocument();
  });

  it('zeigt hint wenn kein error', () => {
    render(<Input label="Email" hint="We never share" />);
    expect(screen.getByText(/we never share/i)).toBeInTheDocument();
  });

  it('rightSlot wird gerendert', () => {
    render(<Input label="Password" rightSlot={<span data-testid="eye">👁</span>} />);
    expect(screen.getByTestId('eye')).toBeInTheDocument();
  });
});

describe('FormError', () => {
  it('rendert nichts bei null/undefined', () => {
    const { container } = render(<FormError error={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('zeigt String-Errors direkt', () => {
    render(<FormError error="Bang" />);
    expect(screen.getByText(/bang/i)).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('löst ApiRequestError.messageKey auf', () => {
    const err = new ApiRequestError(404, 'NOT_FOUND', 'errors.notFound', 'Backend message');
    render(<FormError error={err} />);
    expect(screen.getByText(/not found/i)).toBeInTheDocument();
  });
});
