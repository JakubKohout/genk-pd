import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { LawsIndex } from './LawsIndex';

describe('LawsIndex', () => {
  it('renders an active link to /laws/lea', () => {
    render(
      <MemoryRouter>
        <LawsIndex />
      </MemoryRouter>,
    );
    const lea = screen.getByRole('link', { name: /law enforcement act/i });
    expect(lea).toHaveAttribute('href', '/laws/lea');
  });

  it('renders Penal Code and Firearm Act as disabled', () => {
    render(
      <MemoryRouter>
        <LawsIndex />
      </MemoryRouter>,
    );
    expect(screen.getByText(/penal code/i).closest('[aria-disabled="true"]')).toBeInTheDocument();
    expect(screen.getByText(/firearm act/i).closest('[aria-disabled="true"]')).toBeInTheDocument();
  });
});
