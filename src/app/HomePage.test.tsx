import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { HomePage } from './HomePage';

function renderHomePage() {
  return render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  );
}

describe('HomePage', () => {
  it('renders a "Teorie" tile linking to /law', () => {
    renderHomePage();
    const link = screen.getByRole('link', { name: /Teorie/i });
    expect(link).toBeDefined();
    expect(link.getAttribute('href')).toBe('/law');
  });

  it('renders the home-penal-recall-link pointing to /penal/recall', () => {
    renderHomePage();
    const link = screen.getByTestId('home-penal-recall-link');
    expect(link).toBeDefined();
    expect(link.getAttribute('href')).toBe('/penal/recall');
  });

  it('does NOT render a tile titled "SASP příručka"', () => {
    renderHomePage();
    expect(screen.queryByText('SASP příručka')).toBeNull();
  });

  it('does NOT render a tile titled "Zákony"', () => {
    renderHomePage();
    expect(screen.queryByText('Zákony')).toBeNull();
  });
});
