import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EnumerationInput } from './EnumerationInput';
import type { LawEnumeration } from '../data/types';

const ALIAS: LawEnumeration = {
  id: 'e', theme: 'paragrafy', prompt: 'p', kind: 'enumeration', matcher: 'alias',
  expected: [{ key: 'a', label: 'Maják', aliases: [] }],
};
const ORDER: LawEnumeration = {
  id: 'o', theme: 'hodnosti', prompt: 'p', kind: 'enumeration', matcher: 'alias', ordered: true,
  expected: [{ key: 'Captain', label: 'Captain' }, { key: 'Cadet', label: 'Cadet' }],
};

describe('EnumerationInput', () => {
  it('alias: adding all expected then submit is perfect', () => {
    const onSubmit = vi.fn();
    render(<EnumerationInput question={ALIAS} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByTestId('law-enum-input'), { target: { value: 'Maják' } });
    fireEvent.click(screen.getByTestId('law-enum-add'));
    fireEvent.click(screen.getByTestId('law-enum-submit'));
    expect(onSubmit).toHaveBeenCalledWith({ perfect: true });
  });
  it('alias: a wrong entry yields not perfect', () => {
    const onSubmit = vi.fn();
    render(<EnumerationInput question={ALIAS} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByTestId('law-enum-input'), { target: { value: 'nesmysl' } });
    fireEvent.click(screen.getByTestId('law-enum-add'));
    fireEvent.click(screen.getByTestId('law-enum-submit'));
    expect(onSubmit).toHaveBeenCalledWith({ perfect: false });
  });
  it('ordered: committing items in correct order then submit is perfect', () => {
    const onSubmit = vi.fn();
    render(<EnumerationInput question={ORDER} onSubmit={onSubmit} />);
    const input = screen.getByTestId('law-enum-input');
    for (const v of ['Captain', 'Cadet']) {
      fireEvent.change(input, { target: { value: v } });
      fireEvent.click(screen.getByTestId('law-enum-add'));
    }
    // behem answering jsou chipy neutralni
    expect(screen.getAllByTestId('chip-pending')).toHaveLength(2);
    expect(screen.queryByTestId('chip-correct')).toBeNull();
    fireEvent.click(screen.getByTestId('law-enum-submit'));
    expect(onSubmit).toHaveBeenCalledWith({ perfect: true });
    expect(screen.getAllByTestId('chip-correct')).toHaveLength(2);
  });

  it('ordered: wrong order is not perfect and reveals expected labels', () => {
    const onSubmit = vi.fn();
    render(<EnumerationInput question={ORDER} onSubmit={onSubmit} />);
    const input = screen.getByTestId('law-enum-input');
    for (const v of ['Cadet', 'Captain']) {
      fireEvent.change(input, { target: { value: v } });
      fireEvent.click(screen.getByTestId('law-enum-add'));
    }
    fireEvent.click(screen.getByTestId('law-enum-submit'));
    expect(onSubmit).toHaveBeenCalledWith({ perfect: false });
    expect(screen.getAllByTestId('chip-wrong')).toHaveLength(2);
  });

  it('ordered: missing tail positions are revealed as missed', () => {
    const onSubmit = vi.fn();
    render(<EnumerationInput question={ORDER} onSubmit={onSubmit} />);
    const input = screen.getByTestId('law-enum-input');
    fireEvent.change(input, { target: { value: 'Captain' } });
    fireEvent.click(screen.getByTestId('law-enum-add'));
    fireEvent.click(screen.getByTestId('law-enum-submit'));
    expect(onSubmit).toHaveBeenCalledWith({ perfect: false });
    expect(screen.getByTestId('chip-missed')).toHaveTextContent('Cadet');
  });
  it('alias: Enter commits a directly matching value in one press (no suggestion fill)', () => {
    const onSubmit = vi.fn();
    render(<EnumerationInput question={ALIAS} onSubmit={onSubmit} />);
    const input = screen.getByTestId('law-enum-input');
    fireEvent.change(input, { target: { value: 'Maják' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    // hodnota se commitla jako chip, input je prázdný
    expect(screen.getByTestId('chip-correct')).toBeInTheDocument();
    expect((input as HTMLInputElement).value).toBe('');
  });

  it('shows paragraph-format hint for paragraph matcher questions', () => {
    const PARA: LawEnumeration = {
      id: 'pq', theme: 'paragrafy', prompt: 'p',
      kind: 'enumeration', matcher: 'paragraph',
      expected: [{ key: '33', label: '§33' }],
    };
    render(<EnumerationInput question={PARA} onSubmit={vi.fn()} />);
    expect(screen.getByTestId('law-enum-hint').textContent).toContain('§25b');
  });

  it('shows order hint for ordered questions', () => {
    render(<EnumerationInput question={ORDER} onSubmit={vi.fn()} />);
    expect(screen.getByTestId('law-enum-hint').textContent).toContain('pořadí');
  });
});

describe('EnumerationInput — feedback paragraph matcheru', () => {
  const PARA: LawEnumeration = {
    id: 'pq', theme: 'scenky', prompt: 'p',
    kind: 'enumeration', matcher: 'paragraph',
    expected: [{ key: '8c', label: '§8 c', subId: 'c' }],
  };

  const commit = (value: string) => {
    fireEvent.change(screen.getByTestId('law-enum-input'), { target: { value } });
    fireEvent.click(screen.getByTestId('law-enum-add'));
  };

  it('valid but inapplicable paragraph shows its title and "nevztahuje se"', () => {
    render(<EnumerationInput question={PARA} onSubmit={vi.fn()} />);
    commit('26a');
    const chip = screen.getByTestId('chip-wrong');
    expect(chip.textContent).toContain('§26 a — Loupež');
    expect(chip.textContent).toContain('nevztahuje se');
    expect(chip.textContent).not.toContain('žádná shoda');
  });

  it('parseable but non-existent paragraph shows "neexistující paragraf"', () => {
    render(<EnumerationInput question={PARA} onSubmit={vi.fn()} />);
    commit('99');
    expect(screen.getByTestId('chip-wrong').textContent).toContain('neexistující paragraf');
  });

  it('unparseable input keeps "žádná shoda"', () => {
    render(<EnumerationInput question={PARA} onSubmit={vi.fn()} />);
    commit('blabla');
    expect(screen.getByTestId('chip-wrong').textContent).toContain('žádná shoda');
  });
});
